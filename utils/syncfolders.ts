'use sanity'

import persistance from './persistance'
import _fsWalker from './fswalker'
import wordsToNumbers from 'words-to-numbers'
import posix from 'path'
import { Knex } from 'knex'

import _debug, { Debugger } from 'debug'

interface DirEntryItem {
  path: string,
  isFile: boolean
}

interface SyncItem {
  folder: string,
  path: string,
  isFile: boolean,
  sortKey: string
}
interface SyncItemChunks {
  files: number,
  dirs: number,
  chunks: SyncItem[][]
}

interface FolderInfo {
  path: string,
  totalCount: number,
  seenCount: number
}

export class Imports {
  public static logPrefix = 'type-imagereader:syncfolders'
  public static debug = _debug
  public static fsWalker = _fsWalker
}

export class Functions {
  public static padLength = 20
  public static ToSortKey (key: string): string {
    const zeroes = '0'.repeat(Functions.padLength)
    return `${wordsToNumbers(key.toLowerCase())}`
      .replace(/(\d+)/g, num => num.length >= Functions.padLength ? num : `${zeroes}${num}`.slice(-Functions.padLength))
  }

  public static Chunk<T> (arr: T[], size = 200): T[][] {
    const res = []
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size))
    }
    return res
  }

  public static ChunkSyncItemsForInsert (items: DirEntryItem[]): SyncItemChunks {
    let files = 0
    let dirs = 0
    const chunks = Functions.Chunk(items.map(item => {
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
        folder,
        path: item.path + (!item.isFile ? posix.sep : ''),
        isFile: item.isFile,
        sortKey: Functions.ToSortKey(posix.basename(item.path))
      }
    }))
    return {
      files,
      dirs,
      chunks
    }
  }

  public static async FindSyncItems (knex:Knex): Promise<number> {
    const logger = Imports.debug(`${Imports.logPrefix}:findItems`)
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
    await Imports.fsWalker('/data', async (items: DirEntryItem[], pending: Number) => {
      const { files: chunkFiles, dirs: chunkDirs, chunks } = Functions.ChunkSyncItemsForInsert(items)
      files += chunkFiles
      dirs += chunkDirs
      for (const chunk of chunks) {
        await knex('syncitems').insert(chunk)
      }
      if (counter === 0) {
        logger(`Found ${dirs} dirs (${pending} pending) and ${files} files`)
      }
      counter = (counter + 1) % 100
    })
    logger(`Found all ${dirs} dirs and ${files} files`)
    return files
  }

  public static async SyncNewPictures (logger: Debugger, knex:Knex): Promise<void> {
    const insertedpics: any = await knex.from(knex.raw('?? (??, ??, ??)', ['pictures', 'folder', 'path', 'sortKey']))
      .insert(function (this: Knex) {
        this.select(['syncitems.folder', 'syncitems.path', 'syncitems.sortKey']).from('syncitems')
          .leftJoin('pictures', 'pictures.path', 'syncitems.path')
          .andWhere({
            'syncitems.isFile': true,
            'pictures.path': null
          })
      })
    logger(`Added ${insertedpics[0] || insertedpics.rowCount} new pictures`)
  }

  public static async SyncRemovedPictures (logger: Debugger, knex:Knex): Promise<void> {
    const deletedpics = await knex('pictures')
      .whereNotExists(function () {
        this.select('*')
          .from('syncitems')
          .whereRaw('syncitems.path = pictures.path')
      })
      .delete()
    logger(`Removed ${deletedpics} missing pictures`)
  }

  public static async SyncRemovedBookmarks (logger: Debugger, knex: Knex): Promise<void> {
    const removedBookmarks = await knex('bookmarks')
      .whereNotExists(function (this: Knex.QueryBuilder) {
        this.select('*')
          .from('pictures')
          .whereRaw('pictures.path = bookmarks.path')
      })
      .delete()
    logger(`Removed ${removedBookmarks} missing bookmarks`)
  }

  public static async SyncAllPictures (knex:Knex): Promise<void> {
    const logger = Imports.debug(`${Imports.logPrefix}:syncPictures`)
    await Functions.SyncNewPictures(logger, knex)
    await Functions.SyncRemovedPictures(logger, knex)
    await Functions.SyncRemovedBookmarks(logger, knex)
  }

  public static async SyncNewFolders (logger: Debugger, knex: Knex): Promise<void> {
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
  }

  public static async SyncRemovedFolders (logger: Debugger, knex: Knex): Promise<void> {
    const deletedfolders = await knex('folders')
      .whereNotExists(function (this: Knex.QueryBuilder) {
        this.select('*')
          .from('syncitems')
          .whereRaw('syncitems.path = folders.path')
      })
      .delete()
    logger(`Removed ${deletedfolders} missing folders`)
  }

  public static async SyncMissingCoverImages (logger: Debugger, knex: Knex): Promise<void> {
    const removedCoverImages = await knex('folders')
      .whereNotExists(function (this: Knex.QueryBuilder) {
        this.select('*')
          .from('pictures')
          .whereRaw('pictures.path = folders.current')
      })
      .whereRaw('folders.current <> \'\'')
      .update({ current: '' })
    logger(`Removed ${removedCoverImages} missing cover images`)
  }

  public static async SyncAllFolders (knex: Knex): Promise<void> {
    const logger = Imports.debug(`${Imports.logPrefix}:syncFolders`)
    await Functions.SyncNewFolders(logger, knex)
    await Functions.SyncRemovedFolders(logger, knex)
    await Functions.SyncMissingCoverImages(logger, knex)
  }

  public static async GetAllFolderInfos (knex: Knex): Promise<{ [name: string]: FolderInfo }> {
    const rawFolders = await knex('folders').select('path')
    const folders: { [name: string]: FolderInfo } = {}
    for (const folder of rawFolders) {
      folders[folder.path] = {
        path: folder.path,
        totalCount: 0,
        seenCount: 0
      }
    }
    return folders
  }

  public static async GetFolderInfosWithPictures (knex: Knex): Promise<FolderInfo[]> {
    const folderInfos: FolderInfo[] = await knex('pictures')
      .select('folder as path')
      .count('* as totalCount')
      .sum({ seenCount: knex.raw('CASE WHEN seen THEN 1 ELSE 0 END') })
      .groupBy('folder')
    return folderInfos
  }

  public static CalculateFolderInfos (allFolders: {[key:string]: FolderInfo}, folders: FolderInfo[]): FolderInfo[] {
    for (const folder of folders) {
      const parts = folder.path.split('/')
      while (parts.length > 1) { // don't loop all the way to zero to avoid double counting the root
        parts.pop()
        const parentPath = parts.join('/') + '/'
        let parent = allFolders[parentPath]
        if (!parent) {
          parent = {
            path: parentPath,
            totalCount: 0,
            seenCount: 0
          }
          allFolders[parentPath] = parent
        }
        parent.totalCount += +folder.totalCount
        parent.seenCount += +folder.seenCount
      }
    }
    return Object.values(allFolders)
  }

  public static async UpdateFolderPictureCounts (knex: Knex): Promise<void> {
    const logger = Imports.debug(`${Imports.logPrefix}:updateSeen`)
    logger('Updating Seen Counts')
    const folderInfos = await Functions.GetFolderInfosWithPictures(knex)
    logger(`Found ${folderInfos.length} Folders to Update`)
    const allFolders = await Functions.GetAllFolderInfos(knex)
    logger(`Found ${Object.keys(allFolders).length} Folders in the DB`)
    const resultFolders = Functions.CalculateFolderInfos(allFolders, folderInfos)
    logger(`Calculated ${resultFolders.length} Folders Seen Counts`)
    for (const aChunk of Functions.Chunk(resultFolders)) {
      await knex('folders')
        .insert(aChunk)
        .onConflict('path')
        .merge()
    }
    logger(`Updated ${resultFolders.length} Folders Seen Counts`)
  }

  public static async PruneEmptyFolders (knex: Knex): Promise<void> {
    const logger = Imports.debug(`${Imports.logPrefix}:pruneEmpty`)
    const deletedfolders = await knex('folders')
      .where('totalCount', '=', 0)
      .delete()
    logger(`Removed ${deletedfolders} empty folders`)
  }
}

const synchronize = async () => {
  const logger = Imports.debug(Imports.logPrefix)
  logger('Folder Synchronization Begins')
  const knex = await persistance.initialize()
  try {
    const foundPics = await Functions.FindSyncItems(knex)
    if (foundPics < 1) {
      throw new Error('Found Zero images, refusing to process empty base folder')
    }
    await Functions.SyncAllPictures(knex)
    await Functions.SyncAllFolders(knex)
    await Functions.UpdateFolderPictureCounts(knex)
    await Functions.PruneEmptyFolders(knex)
  } catch (e) {
    logger('Folder Synchronization Failed', e)
  }
  logger('Folder Synchronization Complete')
}
export default synchronize
