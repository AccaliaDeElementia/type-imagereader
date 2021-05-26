'use sanity'

import persistance from './persistance'
import fsWalker from './fswalker'
import wordsToNumbers from 'words-to-numbers'
import posix from 'path'
import { Knex } from 'knex'

import debug from 'debug'
const logPrefix = 'type-imagereader:syncfolders'

const padLength = 20
const toSortKey = (name: string) => `${wordsToNumbers(name.toLowerCase())}`
  .replace(/(\d+)/g, num => `${'0'.repeat(padLength)}${num}`.slice(-padLength))

const chunk = <T>(arr: T[], size = 200): T[][] => {
  const res = []
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size))
  }
  return res
}

interface DirEntryItem {
  path: string,
  isFile: boolean
}

const findItems = async (knex: Knex) => {
  const logger = debug(`${logPrefix}:findItems`)
  await knex('syncitems').del()
  await knex('syncitems').insert({
    folder: null,
    path: '/',
    isFile: false,
    sortKey: ''
  })
  let dirs = 0
  let files = 0
  let counter = 0
  await fsWalker('/data', async (items: DirEntryItem[], pending: Number) => {
    const chunks = chunk(items)
    for (const chunk of chunks) {
      await knex('syncitems').insert(chunk.map(item => {
        if (item.isFile) {
          files++
        } else {
          dirs++
        }
        let folder = posix.dirname(item.path)
        if (folder.length > 1) {
          folder += posix.sep
        }
        return {
          folder: folder,
          path: item.path + (!item.isFile ? posix.sep : ''),
          isFile: item.isFile,
          sortKey: toSortKey(posix.basename(item.path))
        }
      }))
    }
    if (counter === 0) {
      logger(`Found ${dirs} dirs (${pending} pending) and ${files} files`)
    }
    counter = (counter + 1) % 100
  })
  logger(`Found all ${dirs} dirs and ${files} files`)
}

const syncPictures = async (knex:Knex) => {
  const logger = debug(`${logPrefix}:syncFolders`)
  const insertedpics:any = await knex.from(knex.raw('?? (??, ??, ??)', ['pictures', 'folder', 'path', 'sortKey']))
    .insert(function (this: Knex) {
      this.select(['syncitems.folder', 'syncitems.path', 'syncitems.sortKey']).from('syncitems')
        .leftJoin('pictures', 'pictures.path', 'syncitems.path')
        .andWhere({
          'syncitems.isFile': true,
          'pictures.path': null
        })
    })
  logger(`Added ${insertedpics[0] || insertedpics.rowCount} new pictures`)
  const deletedpics = await knex('pictures')
    .whereNotExists(function (this: Knex.QueryBuilder) {
      this.select('*')
        .from('syncitems')
        .whereRaw('syncitems.path = pictures.path')
    })
    .delete()
  logger(`Removed ${deletedpics} missing pictures`)
  const removedBookmarks = await knex('bookmarks')
    .whereNotExists(function (this: Knex.QueryBuilder) {
      this.select('*')
        .from('pictures')
        .whereRaw('pictures.path = bookmarks.path')
    })
    .delete()
  logger(`Removed ${removedBookmarks} missing bookmarks`)
}

const syncFolders = async (knex:Knex) => {
  const logger = debug(`${logPrefix}:syncFolders`)
  const folders: any = await knex.from(knex.raw('?? (??, ??, ??)', ['folders', 'folder', 'path', 'sortKey']))
    .insert(function (this: Knex) {
      this.select(['syncitems.folder', 'syncitems.path', 'syncitems.sortKey']).from('syncitems')
        .leftJoin('folders', 'folders.path', 'syncitems.path')
        .andWhere({
          'syncitems.isFile': false,
          'folders.path': null
        })
    })
  logger(`Added ${folders[0] || folders.rowCount} new folders`)
  const deletedfolders = await knex('folders')
    .whereNotExists(function (this: Knex.QueryBuilder) {
      this.select('*')
        .from('syncitems')
        .whereRaw('syncitems.path = folders.path')
    })
    .delete()
  logger(`Removed ${deletedfolders} missing folders`)
  const removedCoverImages = await knex('folders')
    .update({ current: '' })
    .whereNotExists(function (this: Knex.QueryBuilder) {
      this.select('*')
        .from('pictures')
        .whereRaw('pictures.path = folders.current')
    })
    .whereRaw('folders.current <> \'\'')
  logger(`Removed ${removedCoverImages} missing cover images`)
}

interface Folder {
  path: string|null,
  totalCount: number,
  seenCount: number
}

const updateSeenPictures = async (knex: Knex) => {
  const logger = debug(`${logPrefix}:updateSeen`)
  logger('Updating Seen Counts')
  const folderInfos = await knex('pictures')
    .select('folder')
    .count('* as totalCount')
    .sum({ totalSeen: knex.raw('CASE WHEN seen THEN 1 ELSE 0 END') })
    .groupBy('folder')
  logger(`Found ${folderInfos.length} Folders to Update`)
  const folders: { [name: string]: Folder } = {}
  const doFolder = (path: string, info: { [k: string]: string | number; } & { totalSeen?: any; }) => {
    if (path === '/') {
      return
    }
    const folder = folders[path] || {
      path: path,
      totalCount: 0,
      seenCount: 0
    }
    folder.totalCount += +info.totalCount || 0
    folder.seenCount += +info.totalSeen || 0
    folders[path] = folder
  }
  for (const info of folderInfos) {
    const parts = `${info.folder}`.split('/')
    while (parts.length) {
      parts.pop()
      doFolder(`${parts.join('/')}/`, info)
    }
  }
  const resultFolders = Object.values(folders)
  logger(`Calculated ${resultFolders.length} Folders Seen Counts`)
  for (const aChunk of chunk(Object.values(folders))) {
    await knex('folders')
      .insert(aChunk)
      .onConflict('path')
      .merge()
  }
  logger(`Updated ${resultFolders.length} Folders Seen Counts`)
}

const synchronize = async () => {
  const logger = debug(logPrefix)
  logger('Folder Synchronization Begins')
  const knex = await persistance.initialize()
  try {
    await findItems(knex)
    await syncPictures(knex)
    await syncFolders(knex)
    await updateSeenPictures(knex)
  } catch (e) {
    logger('Folder Synchronization Failed')
    logger(e, e.stack)
  }
  // await knex.destroy()
  logger('Folder Synchronization Complete')
}
export default synchronize
