'use sanity'

import persistance from './persistance.js'
import _fsWalker from './fswalker.js'
import { getDataDir as _getDataDir } from './helpers.js'
import {
  IsPostgres as _IsPostgres,
  FindSyncItemsViaCopy as _FindSyncItemsViaCopy,
  FindSyncItemsViaInsert as _FindSyncItemsViaInsert,
  getDbChunkSize as _getDbChunkSize,
} from './syncItemsDialect.js'
import { wordsToNumbers } from 'words-to-numbers'
import posix from 'node:path'
import { createHash } from 'node:crypto'
import type { Knex } from 'knex'
import _debug from 'debug'
import type { Debugger } from 'debug'
import { from as _copyFrom } from 'pg-copy-streams'
import type { PoolClient } from 'pg'

const ZERO = 0
const ONE = 1
const NUMBER_PAD_LENGTH = 20
const DEFAULT_CHUNK_SIZE = 5000
const TRAILING_SLASH_OFFSET = -1

// SQLite degrades steadily as the library grows: chunked-INSERT bulk loads, the
// whole-DB write lock, and disk page cache pressure all scale unfavourably.
// Above the soft limit performance is noticeably worse than PostgreSQL; above
// the firm limit the initial-sync and 24h re-sync experience is poor enough
// that PostgreSQL is strongly recommended. See README for details.
const SQLITE_PICTURES_SOFT_LIMIT = 100_000
const SQLITE_PICTURES_FIRM_LIMIT = 250_000
const WARNING_BANNER = '================================================================'

interface DirEntryItem {
  path: string
  isFile: boolean
}

interface SyncItem {
  folder: string
  path: string
  isFile: boolean
  sortKey: string
  pathHash: string
}
interface SyncItemRows {
  files: number
  dirs: number
  rows: SyncItem[]
}

export interface FolderInfo {
  path: string
  totalCount: number
  seenCount: number
  folder?: string
  sortKey?: string
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
  getDataDir: _getDataDir,
  copyFrom: _copyFrom,
  IsPostgres: _IsPostgres,
  FindSyncItemsViaCopy: _FindSyncItemsViaCopy,
  FindSyncItemsViaInsert: _FindSyncItemsViaInsert,
  getDbChunkSize: _getDbChunkSize,
  acquireCopyConnection: async (knex: Knex): Promise<PoolClient> =>
    //eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- knex.client.acquireConnection is typed `any`; PoolClient is the concrete shape for the pg dialect
    await knex.client.acquireConnection(),
  releaseCopyConnection: async (knex: Knex, client: PoolClient): Promise<void> => {
    //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- knex.client.releaseConnection is typed `any`; we hand back the same PoolClient we acquired
    await knex.client.releaseConnection(client)
  },
}

export const Functions = {
  ExtractInsertCount: (result: unknown): number => {
    if (isRowCountResult(result)) {
      return result.rowCount
    }
    if (result instanceof Array && result.length > ZERO && typeof result[ZERO] === 'number') {
      return result[ZERO]
    }
    return ZERO
  },
  padLength: NUMBER_PAD_LENGTH,
  ToSortKey: (key: string): string => {
    const zeroes = '0'.repeat(Functions.padLength)
    return `${wordsToNumbers(key.toLowerCase())}`.replace(/\d+/gv, (num) =>
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
  BuildSyncItemRows: (items: DirEntryItem[]): SyncItemRows => {
    let files = ZERO
    let dirs = ZERO
    const rows = items.map((item) => {
      if (item.isFile) {
        files += ONE
      } else {
        dirs += ONE
      }
      let folder = posix.dirname(item.path)
      if (folder !== posix.sep) {
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
    })
    return { files, dirs, rows }
  },
  FormatSyncItemCsv: (row: SyncItem): string => {
    const q = (value: string): string => `"${value.replaceAll('"', '""')}"`
    return `${q(row.folder)},${q(row.path)},${row.isFile ? 't' : 'f'},${q(row.sortKey)},${q(row.pathHash)}\n`
  },
  FindSyncItems: async (knex: Knex): Promise<number> => {
    const logger = Imports.debug(`${Imports.logPrefix}:findItems`)
    await knex('syncitems').truncate()
    await knex('syncitems').insert({
      folder: '',
      path: posix.sep,
      isFile: false,
      sortKey: '',
      pathHash: createHash('sha512').update(posix.sep).digest('base64'),
    })
    const shared = {
      fsWalker: Imports.fsWalker,
      buildSyncItemRows: Functions.BuildSyncItemRows,
      getDataDir: Imports.getDataDir,
    }
    const counts = Imports.IsPostgres(knex)
      ? await Imports.FindSyncItemsViaCopy(knex, logger, {
          ...shared,
          formatSyncItemCsv: Functions.FormatSyncItemCsv,
          copyFrom: Imports.copyFrom,
          acquireCopyConnection: Imports.acquireCopyConnection,
          releaseCopyConnection: Imports.releaseCopyConnection,
        })
      : await Imports.FindSyncItemsViaInsert(knex, logger, {
          ...shared,
          chunk: Functions.Chunk,
          execChunksSynchronously: Functions.ExecChunksSynchronously,
        })
    logger(`Found all ${counts.dirs} dirs and ${counts.files} files`)
    return counts.files
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
    logger(`Added ${Functions.ExtractInsertCount(insertedpics)} new pictures`)
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
    logger(`Added ${Functions.ExtractInsertCount(folders)} new folders`)
  },
  SyncRemovedFolders: async (logger: Debugger, knex: Knex): Promise<void> => {
    const deletedfolders = await knex('folders')
      .whereNotExists(function () {
        this.select('*').from('syncitems').whereRaw('syncitems.path = folders.path')
      })
      .delete()
    logger(`Removed ${deletedfolders} missing folders`)
  },
  AddFolderAndAncestors: (affected: Set<string>, folderPath: string): void => {
    let current = folderPath
    while (true) {
      affected.add(current)
      if (current === posix.sep) return
      const parent = posix.dirname(current.slice(ZERO, TRAILING_SLASH_OFFSET))
      current = parent === posix.sep ? posix.sep : parent + posix.sep
    }
  },
  SyncMissingAncestorFolders: async (logger: Debugger, knex: Knex): Promise<void> => {
    const leafRows = await knex('pictures').distinct<Array<{ folder: string }>>('folder').whereNotNull('folder')
    const candidates = new Set<string>()
    for (const { folder } of leafRows) {
      Functions.AddFolderAndAncestors(candidates, folder)
    }
    candidates.delete(posix.sep)
    if (candidates.size === ZERO) {
      logger('Added 0 missing ancestor folders')
      return
    }
    const candidateList = [...candidates]
    const existing = new Set<string>()
    await Functions.ExecChunksSynchronously(
      Functions.Chunk(candidateList, Imports.getDbChunkSize(knex)),
      async (chunk) => {
        const rows = await knex('folders').select<Array<{ path: string }>>('path').whereIn('path', chunk)
        for (const row of rows) existing.add(row.path)
      },
    )
    const missing = candidateList.filter((p) => !existing.has(p))
    if (missing.length === ZERO) {
      logger('Added 0 missing ancestor folders')
      return
    }
    const rows = missing.map((path) => {
      const withoutSlash = path.slice(ZERO, TRAILING_SLASH_OFFSET)
      const parentDir = posix.dirname(withoutSlash)
      const folder = parentDir === posix.sep ? posix.sep : parentDir + posix.sep
      const sortKey = Functions.ToSortKey(posix.basename(withoutSlash))
      return { folder, path, sortKey }
    })
    await Functions.ExecChunksSynchronously(Functions.Chunk(rows, Imports.getDbChunkSize(knex)), async (chunk) => {
      await knex('folders').insert(chunk).onConflict('path').ignore()
    })
    logger(`Added ${missing.length} missing ancestor folders`)
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
      .select('pictures.folder as path', 'folders.folder as folder', 'folders.sortKey as sortKey')
      .min('pictures.path as firstPicture')
      .from('firsts')
      .join('pictures', {
        'firsts.folder': 'pictures.folder',
        'firsts.sortKey': 'pictures.sortKey',
      })
      .innerJoin('folders', 'folders.path', 'pictures.folder')
      .groupBy('pictures.folder', 'folders.folder', 'folders.sortKey')
      .orderBy([{ column: 'pictures.folder' }])
    await Functions.ExecChunksSynchronously(Functions.Chunk(toUpdate, Imports.getDbChunkSize(knex)), async (chunk) => {
      await knex('folders').insert(chunk).onConflict('path').merge(['firstPicture'])
    })
    logger(`Updated ${toUpdate.length} folder first-item images`)
  },
  SyncAllFolders: async (knex: Knex): Promise<void> => {
    const logger = Imports.debug(`${Imports.logPrefix}:syncFolders`)
    await Functions.SyncNewFolders(logger, knex)
    await Functions.SyncRemovedFolders(logger, knex)
    await Functions.SyncMissingAncestorFolders(logger, knex)
    await Functions.SyncMissingCoverImages(logger, knex)
    await Functions.SyncFolderFirstImages(logger, knex)
  },
  GetAllFolderInfos: async (knex: Knex): Promise<Record<string, FolderInfo>> => {
    interface Row {
      path: string
      folder: string
      sortKey: string
    }
    const rawFolders = (await knex('folders').select('path', 'folder', 'sortKey')) as Row[]
    const folders: Record<string, FolderInfo> = {}
    for (const f of rawFolders) {
      folders[f.path] = { path: f.path, folder: f.folder, sortKey: f.sortKey, totalCount: ZERO, seenCount: ZERO }
    }
    return folders
  },
  GetFolderInfosWithPictures: async (knex: Knex): Promise<FolderInfo[]> => {
    const folderInfos: FolderInfo[] = await knex('pictures')
      .select('folder as path')
      .count('* as totalCount')
      .sum({ seenCount: knex.raw('CASE WHEN seen THEN 1 ELSE 0 END') })
      .groupBy('folder')
    // Knex's PostgreSQL driver returns aggregate results (COUNT, SUM) as strings
    // to avoid precision loss — coerce them to numbers explicitly
    for (const info of folderInfos) {
      info.totalCount = Number.parseInt(`${info.totalCount}`, 10)
      info.seenCount = Number.parseInt(`${info.seenCount}`, 10)
    }
    return folderInfos
  },
  CalculateFolderInfos: (allFolders: Record<string, FolderInfo>, folders: FolderInfo[]): FolderInfo[] => {
    const allData: Record<string, FolderInfo> = Object.fromEntries(
      Object.entries(allFolders).map(([key, val]) => [key, { ...val }]),
    )
    for (const folder of folders) {
      const parts = folder.path.split('/')
      while (parts.length > ONE) {
        // don't loop all the way to zero to avoid double counting the root
        parts.pop()
        const parentPath = `${parts.join('/')}/`
        let { [parentPath]: parent } = allData
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
    const resultFolders = Functions.CalculateFolderInfos(allFolders, folderInfos).flatMap((info) => {
      const base = allFolders[info.path]
      if (base === undefined) return []
      const { folder = '', sortKey = '' } = base
      return [{ path: info.path, folder, sortKey, totalCount: info.totalCount, seenCount: info.seenCount }]
    })
    logger(`Calculated ${resultFolders.length} Folders Seen Counts`)
    await Functions.ExecChunksSynchronously(
      Functions.Chunk(resultFolders, Imports.getDbChunkSize(knex)),
      async (chunk) => {
        await knex('folders').insert(chunk).onConflict('path').merge(['totalCount', 'seenCount'])
      },
    )
    logger(`Updated ${resultFolders.length} Folders Seen Counts`)
  },
  PruneEmptyFolders: async (knex: Knex): Promise<void> => {
    const logger = Imports.debug(`${Imports.logPrefix}:pruneEmpty`)
    const deletedfolders = await knex('folders')
      .where('totalCount', '=', ZERO)
      .andWhere('path', '<>', posix.sep)
      .delete()
    logger(`Removed ${deletedfolders} empty folders`)
  },
  // Once-per-process flag so the warning fires on startup but not on every
  // recurring scheduled re-sync. Tests reset this between runs.
  SqliteSizeWarningEmitted: false,
  EmitSqliteSizeWarning: (logger: Debugger, knex: Knex, pictureCount: number): void => {
    if (Imports.IsPostgres(knex)) return
    if (pictureCount <= SQLITE_PICTURES_SOFT_LIMIT) return
    if (Functions.SqliteSizeWarningEmitted) return
    Functions.SqliteSizeWarningEmitted = true
    const count = pictureCount.toLocaleString()
    const soft = SQLITE_PICTURES_SOFT_LIMIT.toLocaleString()
    const firm = SQLITE_PICTURES_FIRM_LIMIT.toLocaleString()
    const message =
      pictureCount > SQLITE_PICTURES_FIRM_LIMIT
        ? `WARNING: SQLite picture count (${count}) exceeds the firm recommended limit (${firm}). Initial sync and 24h re-syncs will be slow; PostgreSQL is strongly recommended at this size. See README for details.`
        : `WARNING: SQLite picture count (${count}) exceeds the soft recommended limit (${soft}). Performance may degrade as the library grows; PostgreSQL is recommended above ${firm} pictures. See README for details.`
    logger(WARNING_BANNER)
    logger(message)
    logger(WARNING_BANNER)
  },
}

const MS_PER_SECOND = 1000
const ELAPSED_DECIMALS = 2
const elapsedSeconds = (since: number): string => ((Date.now() - since) / MS_PER_SECOND).toFixed(ELAPSED_DECIMALS)

const synchronize = async (): Promise<void> => {
  const logger = Imports.debug(Imports.logPrefix)
  const start = Date.now()
  logger('Folder Synchronization Begins')
  const knex = await persistance.initialize()
  const runStep = async <T>(label: string, step: () => Promise<T>): Promise<T> => {
    const stepStart = Date.now()
    try {
      const result = await step()
      logger(`${label} completed in ${elapsedSeconds(stepStart)}s`)
      return result
    } catch (e) {
      logger(`${label} failed after ${elapsedSeconds(stepStart)}s`, e)
      throw e
    }
  }
  try {
    const foundPics = await runStep('FindSyncItems', async () => await Functions.FindSyncItems(knex))
    if (foundPics <= ZERO) {
      throw new Error('Found Zero images, refusing to process empty base folder')
    }
    await runStep('SyncAllPictures', async () => {
      await Functions.SyncAllPictures(knex)
    })
    await runStep('SyncAllFolders', async () => {
      await Functions.SyncAllFolders(knex)
    })
    await runStep('UpdateFolderPictureCounts', async () => {
      await Functions.UpdateFolderPictureCounts(knex)
    })
    await runStep('PruneEmptyFolders', async () => {
      await Functions.PruneEmptyFolders(knex)
    })
    Functions.EmitSqliteSizeWarning(logger, knex, foundPics)
  } catch (e) {
    logger('Folder Synchronization Failed', e)
    logger(`Folder Synchronization Failed after ${elapsedSeconds(start)}s`)
    throw e
  }
  logger(`Folder Synchronization Complete after ${elapsedSeconds(start)}s`)
}
export default synchronize
