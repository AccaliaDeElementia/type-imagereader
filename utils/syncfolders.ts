'use sanity'

import persistance from './persistance'
import _fsWalker from './fswalker'
import wordsToNumbers from 'words-to-numbers'
import posix from 'node:path'
import { createHash } from 'node:crypto'
import type { Knex } from 'knex'

import _debug from 'debug'
import type { Debugger } from 'debug'

const ZERO = 0
const ONE = 1
const NUMBER_PAD_LENGTH = 20
const DEFAULT_CHUNK_SIZE = 1000
const LOGGING_INTERVAL = 100

interface DirEntryItem {
  path: string
  isFile: boolean
}

interface SyncItem {
  folder: string
  path: string
  isFile: boolean
  sortKey: string
}
interface SyncItemChunks {
  files: number
  dirs: number
  chunks: SyncItem[][]
}

export interface FolderInfo {
  path: string
  totalCount: number
  seenCount: number
}

interface RowCountResult {
  rowCount: number
}

export function isRowCountResult(obj: unknown): obj is RowCountResult {
  if (obj === null || typeof obj !== 'object') return false
  return 'rowCount' in obj && typeof obj.rowCount === 'number'
}

export const Imports = {
  logPrefix: 'type-imagereader:syncfolders',
  debug: _debug,
  fsWalker: _fsWalker,
}

export const Functions = {
  padLength: NUMBER_PAD_LENGTH,
  ToSortKey: (key: string): string => {
    const zeroes = '0'.repeat(Functions.padLength)
    return `${wordsToNumbers(key.toLowerCase())}`.replace(/\d+/g, (num) =>
      num.length >= Functions.padLength ? num : `${zeroes}${num}`.slice(-Functions.padLength),
    )
  },
  Chunk: <T>(arr: T[], size = DEFAULT_CHUNK_SIZE): T[][] => {
    const res = []
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size))
    }
    return res
  },
  ExecChunksSynchronously: async <T>(chunks: T[][], execFn: (chunk: T[]) => Promise<void>) => {
    for (const chunk of chunks) {
      //eslint-disable-next-line no-await-in-loop -- Deliberately doing this synchronously
      await execFn(chunk)
    }
  },
  ChunkSyncItemsForInsert: (items: DirEntryItem[]): SyncItemChunks => {
    let files = ZERO
    let dirs = ZERO
    const chunks = Functions.Chunk(
      items.map((item) => {
        if (item.isFile) {
          files += ONE
        } else {
          dirs += ONE
        }
        let folder = posix.dirname(item.path)
        if (folder.length > ONE) {
          folder += posix.sep
        }
        const path = item.path + (item.isFile ? '' : posix.sep)
        return {
          folder,
          path,
          isFile: item.isFile,
          sortKey: Functions.ToSortKey(posix.basename(item.path)),
          pathHash: createHash('sha512').update(path).digest('base64'),
        }
      }),
    )
    return {
      files,
      dirs,
      chunks,
    }
  },
  FindSyncItems: async (knex: Knex): Promise<number> => {
    const logger = Imports.debug(`${Imports.logPrefix}:findItems`)
    await knex('syncitems').del()
    await knex('syncitems').insert({
      folder: null,
      path: '/',
      isFile: false,
      sortKey: '',
    })
    let dirs = ZERO
    let files = ZERO
    let counter = ZERO
    await Imports.fsWalker('/data', async (items: DirEntryItem[], pending: number) => {
      const { files: chunkFiles, dirs: chunkDirs, chunks } = Functions.ChunkSyncItemsForInsert(items)
      files += chunkFiles
      dirs += chunkDirs
      await Functions.ExecChunksSynchronously(chunks, async (chunk) => {
        await knex('syncitems').insert(chunk)
      })
      if (counter === ZERO) {
        logger(`Found ${dirs} dirs (${pending} pending) and ${files} files`)
      }
      counter = (counter + ONE) % LOGGING_INTERVAL
    })
    logger(`Found all ${dirs} dirs and ${files} files`)
    return files
  },
  SyncNewPictures: async (logger: Debugger, knex: Knex): Promise<void> => {
    const insertedpics = await knex
      .from(knex.raw('?? (??, ??, ??, ??)', ['pictures', 'folder', 'path', 'sortKey', 'pathHash']))
      .insert(function (this: Knex) {
        return this.select(['syncitems.folder', 'syncitems.path', 'syncitems.sortKey', 'syncitems.pathHash'])
          .from('syncitems')
          .leftJoin('pictures', 'pictures.path', 'syncitems.path')
          .andWhere({
            'syncitems.isFile': true,
            'pictures.path': null,
          })
      })
    let count = ZERO
    if (isRowCountResult(insertedpics)) {
      ;({ rowCount: count } = insertedpics)
    }
    if (insertedpics instanceof Array && insertedpics.length > ZERO && typeof insertedpics[ZERO] === 'number') {
      ;[count] = insertedpics
    }
    logger(`Added ${count} new pictures`)
  },
  SyncRemovedPictures: async (logger: Debugger, knex: Knex): Promise<void> => {
    const deletedpics = await knex('pictures')
      .whereNotExists(function () {
        this.select('*').from('syncitems').whereRaw('syncitems.path = pictures.path')
      })
      .delete()
    logger(`Removed ${deletedpics} missing pictures`)
  },
  SyncRemovedBookmarks: async (logger: Debugger, knex: Knex): Promise<void> => {
    const removedBookmarks = await knex('bookmarks')
      .whereNotExists(function () {
        this.select('*').from('pictures').whereRaw('pictures.path = bookmarks.path')
      })
      .delete()
    logger(`Removed ${removedBookmarks} missing bookmarks`)
  },
  SyncAllPictures: async (knex: Knex): Promise<void> => {
    const logger = Imports.debug(`${Imports.logPrefix}:syncPictures`)
    await Functions.SyncNewPictures(logger, knex)
    await Functions.SyncRemovedPictures(logger, knex)
    await Functions.SyncRemovedBookmarks(logger, knex)
  },
  SyncNewFolders: async (logger: Debugger, knex: Knex): Promise<void> => {
    const folders = await knex
      .from(knex.raw('?? (??, ??, ??)', ['folders', 'folder', 'path', 'sortKey']))
      .insert(function (this: Knex) {
        return this.select(['syncitems.folder', 'syncitems.path', 'syncitems.sortKey'])
          .from('syncitems')
          .leftJoin('folders', 'folders.path', 'syncitems.path')
          .andWhere({
            'syncitems.isFile': false,
            'folders.path': null,
          })
      })
    let count = ZERO
    if (isRowCountResult(folders)) {
      ;({ rowCount: count } = folders)
    }
    if (folders instanceof Array && folders.length > ZERO && typeof folders[ZERO] === 'number') {
      ;[count] = folders
    }
    logger(`Added ${count} new folders`)
  },
  SyncRemovedFolders: async (logger: Debugger, knex: Knex): Promise<void> => {
    const deletedfolders = await knex('folders')
      .whereNotExists(function () {
        this.select('*').from('syncitems').whereRaw('syncitems.path = folders.path')
      })
      .delete()
    logger(`Removed ${deletedfolders} missing folders`)
  },
  SyncMissingCoverImages: async (logger: Debugger, knex: Knex): Promise<void> => {
    const removedCoverImages = await knex('folders')
      .whereNotExists(function () {
        this.select('*').from('pictures').whereRaw('pictures.path = folders.current')
      })
      .whereRaw("folders.current <> ''")
      .update({ current: '' })
    logger(`Removed ${removedCoverImages} missing cover images`)
  },
  SyncFolderFirstImages: async (logger: Debugger, knex: Knex): Promise<void> => {
    const toUpdate = await knex
      .queryBuilder()
      .with('firsts', (qb) =>
        qb.select('pictures.folder').min('pictures.sortKey as sortKey').from('pictures').groupBy('pictures.folder'),
      )
      .select('pictures.folder as path')
      .min('pictures.path as firstPicture')
      .from('firsts')
      .join('pictures', {
        'firsts.folder': 'pictures.folder',
        'firsts.sortKey': 'pictures.sortKey',
      })
      .groupBy('pictures.folder')
      .orderBy('pictures.folder', 'pictures.path')
    await Functions.ExecChunksSynchronously(Functions.Chunk(toUpdate), async (chunk) => {
      await knex('folders').insert(chunk).onConflict('path').merge()
    })
    logger(`Updated ${toUpdate.length} folder first-item images`)
  },
  SyncAllFolders: async (knex: Knex): Promise<void> => {
    const logger = Imports.debug(`${Imports.logPrefix}:syncFolders`)
    await Functions.SyncNewFolders(logger, knex)
    await Functions.SyncRemovedFolders(logger, knex)
    await Functions.SyncMissingCoverImages(logger, knex)
    await Functions.SyncFolderFirstImages(logger, knex)
  },
  GetAllFolderInfos: async (knex: Knex): Promise<Record<string, FolderInfo>> => {
    const rawFolders = (await knex('folders').select('path')) as SyncItem[]
    const folders: Record<string, FolderInfo> = {}
    for (const folder of rawFolders) {
      folders[folder.path] = {
        path: folder.path,
        totalCount: ZERO,
        seenCount: ZERO,
      }
    }
    return folders
  },
  GetFolderInfosWithPictures: async (knex: Knex): Promise<FolderInfo[]> => {
    const folderInfos: FolderInfo[] = await knex('pictures')
      .select('folder as path')
      .count('* as totalCount')
      .sum({ seenCount: knex.raw('CASE WHEN seen THEN 1 ELSE 0 END') })
      .groupBy('folder')
    // force the total count to be a number in case postgres is silly
    for (const info of folderInfos) {
      info.totalCount = Number.parseInt(`${info.totalCount}`, 10)
      info.seenCount = Number.parseInt(`${info.seenCount}`, 10)
    }
    return folderInfos
  },
  CalculateFolderInfos: (allFolders: Record<string, FolderInfo>, folders: FolderInfo[]): FolderInfo[] => {
    const allData = allFolders // TODO: this still mutates the parameter, refactor to avoid that.
    for (const folder of folders) {
      const parts = folder.path.split('/')
      while (parts.length > ONE) {
        // don't loop all the way to zero to avoid double counting the root
        parts.pop()
        const parentPath = `${parts.join('/')}/`
        let { [parentPath]: parent } = allFolders
        if (parent === undefined) {
          parent = {
            path: parentPath,
            totalCount: ZERO,
            seenCount: ZERO,
          }
          allData[parentPath] = parent
        }
        parent.totalCount += folder.totalCount
        parent.seenCount += folder.seenCount
      }
    }
    return Object.values(allData)
  },
  UpdateFolderPictureCounts: async (knex: Knex): Promise<void> => {
    const logger = Imports.debug(`${Imports.logPrefix}:updateSeen`)
    logger('Updating Seen Counts')
    const folderInfos = await Functions.GetFolderInfosWithPictures(knex)
    logger(`Found ${folderInfos.length} Folders to Update`)
    const allFolders = await Functions.GetAllFolderInfos(knex)
    logger(`Found ${Object.keys(allFolders).length} Folders in the DB`)
    const resultFolders = Functions.CalculateFolderInfos(allFolders, folderInfos)
    logger(`Calculated ${resultFolders.length} Folders Seen Counts`)
    await Functions.ExecChunksSynchronously(Functions.Chunk(resultFolders), async (chunk) => {
      await knex('folders').insert(chunk).onConflict('path').merge()
    })
    logger(`Updated ${resultFolders.length} Folders Seen Counts`)
  },
  PruneEmptyFolders: async (knex: Knex): Promise<void> => {
    const logger = Imports.debug(`${Imports.logPrefix}:pruneEmpty`)
    const deletedfolders = await knex('folders').where('totalCount', '=', ZERO).delete()
    logger(`Removed ${deletedfolders} empty folders`)
  },
}

const synchronize = async (): Promise<void> => {
  const logger = Imports.debug(Imports.logPrefix)
  logger('Folder Synchronization Begins')
  const knex = await persistance.initialize()
  try {
    const foundPics = await Functions.FindSyncItems(knex)
    if (foundPics <= ZERO) {
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
