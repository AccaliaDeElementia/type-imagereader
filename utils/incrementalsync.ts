'use sanity'

import posix from 'node:path'
import { createHash } from 'node:crypto'
import type { Knex } from 'knex'
import type { Changeset } from './filewatcher'
import type { FolderInfo } from './syncfolders'

import _debug from 'debug'
import type { Debugger } from 'debug'

import _fsWalker from './fswalker'
import { Functions as _SyncFunctions } from './syncfolders'

const ZERO = 0
const ONE = 1
const TRAILING_SLASH_OFFSET = -1

export const Imports = {
  logPrefix: 'type-imagereader:syncfolders',
  debug: _debug,
  fsWalker: _fsWalker,
  SyncFunctions: _SyncFunctions,
}

export const Functions = {
  IncrementalAddPicture: async (logger: Debugger, knex: Knex, path: string): Promise<void> => {
    const folder = posix.dirname(path) === posix.sep ? posix.sep : posix.dirname(path) + posix.sep
    const sortKey = Imports.SyncFunctions.ToSortKey(posix.basename(path))
    const pathHash = createHash('sha512').update(path).digest('base64')
    const existing = await knex('pictures').select<Array<{ path: string }>>('path').where({ path }).first()
    if (existing !== undefined) return
    await knex('pictures').insert({ folder, path, sortKey, pathHash })
    const existingFolder = await knex('folders').select<Array<{ path: string }>>('path').where({ path: folder }).first()
    if (existingFolder === undefined) {
      const folderSortKey = Imports.SyncFunctions.ToSortKey(posix.basename(posix.dirname(path)))
      const parentFolder = posix.dirname(posix.dirname(path))
      const parentPath = parentFolder === posix.sep ? posix.sep : parentFolder + posix.sep
      await knex('folders')
        .insert({ folder: parentPath, path: folder, sortKey: folderSortKey })
        .onConflict('path')
        .ignore()
    }
    logger(`Incremental add: ${path}`)
  },
  IncrementalRemovePicture: async (logger: Debugger, knex: Knex, path: string): Promise<void> => {
    await knex('pictures').where({ path }).delete()
    await knex('bookmarks').where({ path }).delete()
    logger(`Incremental remove: ${path}`)
  },
  IncrementalRemoveFolder: async (logger: Debugger, knex: Knex, dirPath: string): Promise<void> => {
    const deletedPics = await knex('pictures').where('folder', 'like', `${dirPath}%`).delete()
    await knex('bookmarks')
      .whereNotExists(function () {
        this.select('*').from('pictures').whereRaw('pictures.path = bookmarks.path')
      })
      .delete()
    const deletedFolders = await knex('folders').where('path', 'like', `${dirPath}%`).delete()
    logger(`Incremental remove folder: ${dirPath} (${deletedPics} pictures, ${deletedFolders} folders)`)
  },
  IncrementalEnsureFolder: async (knex: Knex, folderPath: string): Promise<void> => {
    const existing = await knex('folders').select<Array<{ path: string }>>('path').where({ path: folderPath }).first()
    if (existing !== undefined) return
    const withoutSlash = folderPath.slice(ZERO, TRAILING_SLASH_OFFSET)
    const parentDir = posix.dirname(withoutSlash)
    const parentPath = parentDir === posix.sep ? posix.sep : parentDir + posix.sep
    const sortKey = Imports.SyncFunctions.ToSortKey(posix.basename(withoutSlash))
    await knex('folders').insert({ folder: parentPath, path: folderPath, sortKey }).onConflict('path').ignore()
  },
  IncrementalScanFolder: async (logger: Debugger, knex: Knex, dirPath: string, dataDir: string): Promise<void> => {
    const scanRoot = posix.join(dataDir, dirPath)
    await Functions.IncrementalEnsureFolder(knex, dirPath)
    let added = ZERO
    await Imports.fsWalker(scanRoot, async (items) => {
      for (const item of items) {
        if (item.isFile) {
          const picPath = posix.join(dirPath, item.path)
          //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
          await Functions.IncrementalAddPicture(logger, knex, picPath)
          added += ONE
        } else {
          const subDirPath = posix.join(dirPath, item.path) + posix.sep
          //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
          await Functions.IncrementalEnsureFolder(knex, subDirPath)
        }
      }
    })
    logger(`Incremental scan folder: ${dirPath} (${added} pictures added)`)
  },
  IncrementalUpdateFolders: async (logger: Debugger, knex: Knex, affectedFolders: Set<string>): Promise<void> => {
    for (const folder of affectedFolders) {
      //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous for folder-by-folder update
      const [result]: FolderInfo[] = await knex('pictures')
        .select('folder as path')
        .count('* as totalCount')
        .sum({ seenCount: knex.raw('CASE WHEN seen THEN 1 ELSE 0 END') })
        .where('folder', folder)
        .groupBy('folder')
      if (result !== undefined) {
        //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous for folder-by-folder update
        await knex('folders')
          .where({ path: folder })
          .update({
            totalCount: Number.parseInt(`${result.totalCount}`, 10),
            seenCount: Number.parseInt(`${result.seenCount}`, 10),
          })
      }
    }
    const allFolders = await Imports.SyncFunctions.GetAllFolderInfos(knex)
    const folderInfos = await Imports.SyncFunctions.GetFolderInfosWithPictures(knex)
    const resultFolders = Imports.SyncFunctions.CalculateFolderInfos(allFolders, folderInfos)
    await Imports.SyncFunctions.ExecChunksSynchronously(Imports.SyncFunctions.Chunk(resultFolders), async (chunk) => {
      await knex('folders').insert(chunk).onConflict('path').merge()
    })
    const deletedfolders = await knex('folders').where('totalCount', '=', ZERO).delete()
    logger(`Incremental folder update: ${affectedFolders.size} folders checked, ${deletedfolders} empty folders pruned`)
  },
  CategorizeChangeset: (
    changeset: Changeset,
  ): {
    dirDeletes: string[]
    fileDeletes: string[]
    dirCreates: string[]
    fileCreates: string[]
  } => {
    const dirDeletes: string[] = []
    const fileDeletes: string[] = []
    const dirCreates: string[] = []
    const fileCreates: string[] = []
    for (const [path, type] of changeset) {
      if (type === 'dir-delete') dirDeletes.push(path)
      else if (type === 'delete') fileDeletes.push(path)
      else if (type === 'dir-create') dirCreates.push(path)
      else fileCreates.push(path)
    }
    return { dirDeletes, fileDeletes, dirCreates, fileCreates }
  },
  IncrementalUpdateFirstImages: async (logger: Debugger, knex: Knex): Promise<void> => {
    await Imports.SyncFunctions.SyncFolderFirstImages(logger, knex)
  },
  IncrementalSync: async (knex: Knex, changeset: Changeset, dataDir = '/data'): Promise<void> => {
    const logger = Imports.debug(`${Imports.logPrefix}:incremental`)
    logger(`Processing ${changeset.size} incremental changes`)
    const { dirDeletes, fileDeletes, dirCreates, fileCreates } = Functions.CategorizeChangeset(changeset)
    const affectedFolders = new Set<string>()
    for (const dirPath of dirDeletes) {
      affectedFolders.add(dirPath)
      //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
      await Functions.IncrementalRemoveFolder(logger, knex, dirPath)
    }
    for (const path of fileDeletes) {
      const folder = posix.dirname(path) === posix.sep ? posix.sep : posix.dirname(path) + posix.sep
      affectedFolders.add(folder)
      //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
      await Functions.IncrementalRemovePicture(logger, knex, path)
    }
    for (const dirPath of dirCreates) {
      affectedFolders.add(dirPath)
      //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
      await Functions.IncrementalScanFolder(logger, knex, dirPath, dataDir)
    }
    for (const path of fileCreates) {
      const folder = posix.dirname(path) === posix.sep ? posix.sep : posix.dirname(path) + posix.sep
      affectedFolders.add(folder)
      //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
      await Functions.IncrementalAddPicture(logger, knex, path)
    }
    await Functions.IncrementalUpdateFolders(logger, knex, affectedFolders)
    await Functions.IncrementalUpdateFirstImages(logger, knex)
    logger(`Incremental sync complete`)
  },
}
