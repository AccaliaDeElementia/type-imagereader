'use sanity'

import posix from 'node:path'
import _debug from 'debug'
import type { Knex } from 'knex'

import { Functions as _Helpers } from './helpers.js'
import { getDbChunkSize as _getDbChunkSize } from './syncItemsDialect.js'

const ZERO = 0
const ONE = 1

export interface FolderInfo {
  path: string
  totalCount: number
  seenCount: number
  folder?: string
  sortKey?: string
}

export const Imports = {
  logPrefix: 'type-imagereader:sync:folderCounts',
  debug: _debug,
  getDbChunkSize: _getDbChunkSize,
}

export const Functions = {
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
    await _Helpers.ExecChunksSynchronously(
      _Helpers.Chunk(resultFolders, Imports.getDbChunkSize(knex)),
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
}
