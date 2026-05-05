'use sanity'

import posix from 'node:path'
import { createHash } from 'node:crypto'
import type { Knex } from 'knex'
import type { Changeset } from './filewatcher.js'

import _debug from 'debug'
import type { Debugger } from 'debug'

import _fsWalker from './fswalker.js'
import { Functions as _SyncFunctions } from './syncfolders.js'
import { getDbChunkSize as _getDbChunkSize } from './syncItemsDialect.js'
import { EscapeLikeWildcards } from './helpers.js'

const ZERO = 0
const TRAILING_SLASH_OFFSET = -1
const DECIMAL_RADIX = 10

export const Imports = {
  logPrefix: 'type-imagereader:syncfolders',
  debug: _debug,
  fsWalker: _fsWalker,
  SyncFunctions: _SyncFunctions,
  getDbChunkSize: _getDbChunkSize,
}

export const Functions = {
  IncrementalAddPicturesBulk: async (knex: Knex, paths: string[]): Promise<void> => {
    if (paths.length === ZERO) return
    const pictureRows = paths.map((path) => {
      const parent = posix.dirname(path)
      const folder = parent === posix.sep ? posix.sep : `${parent}${posix.sep}`
      return {
        folder,
        path,
        sortKey: Imports.SyncFunctions.ToSortKey(posix.basename(path)),
        pathHash: createHash('sha512').update(path).digest('base64'),
      }
    })
    await Imports.SyncFunctions.ExecChunksSynchronously(
      Imports.SyncFunctions.Chunk(pictureRows, Imports.getDbChunkSize(knex)),
      async (chunk) => {
        await knex('pictures').insert(chunk).onConflict('path').ignore()
      },
    )
    const parentFolders = pictureRows.map((row) => row.folder)
    await Functions.IncrementalEnsureFoldersBulk(knex, parentFolders)
  },
  IncrementalEnsureFoldersBulk: async (knex: Knex, folderPaths: string[]): Promise<void> => {
    if (folderPaths.length === ZERO) return
    const unique = new Set(folderPaths)
    unique.delete(posix.sep)
    if (unique.size === ZERO) return
    const rows = [...unique].map((folderPath) => {
      const withoutSlash = folderPath.slice(ZERO, TRAILING_SLASH_OFFSET)
      const parentDir = posix.dirname(withoutSlash)
      const parent = parentDir === posix.sep ? posix.sep : `${parentDir}${posix.sep}`
      return {
        folder: parent,
        path: folderPath,
        sortKey: Imports.SyncFunctions.ToSortKey(posix.basename(withoutSlash)),
      }
    })
    await Imports.SyncFunctions.ExecChunksSynchronously(
      Imports.SyncFunctions.Chunk(rows, Imports.getDbChunkSize(knex)),
      async (chunk) => {
        await knex('folders').insert(chunk).onConflict('path').ignore()
      },
    )
  },
  IncrementalRemovePicturesBulk: async (knex: Knex, paths: string[]): Promise<void> => {
    if (paths.length === ZERO) return
    await Imports.SyncFunctions.ExecChunksSynchronously(
      Imports.SyncFunctions.Chunk(paths, Imports.getDbChunkSize(knex)),
      async (chunk) => {
        await knex('pictures').whereIn('path', chunk).delete()
        await knex('bookmarks').whereIn('path', chunk).delete()
      },
    )
  },
  IncrementalRemoveFolder: async (logger: Debugger, knex: Knex, dirPath: string): Promise<void> => {
    const escapedPrefix = `${EscapeLikeWildcards(dirPath)}%`
    const deletedPics = await knex('pictures').where('folder', 'like', escapedPrefix).delete()
    await knex('bookmarks')
      .whereNotExists(function () {
        this.select('*').from('pictures').whereRaw('pictures.path = bookmarks.path')
      })
      .delete()
    const deletedFolders = await knex('folders').where('path', 'like', escapedPrefix).delete()
    logger(`Incremental remove folder: ${dirPath} (${deletedPics} pictures, ${deletedFolders} folders)`)
  },
  IncrementalScanFolder: async (logger: Debugger, knex: Knex, dirPath: string, dataDir: string): Promise<void> => {
    const scanRoot = posix.join(dataDir, dirPath)
    const picturePaths: string[] = []
    const folderPaths: string[] = [dirPath]
    await Imports.fsWalker(scanRoot, async (items) => {
      await Promise.resolve()
      for (const item of items) {
        if (item.isFile) {
          picturePaths.push(posix.join(dirPath, item.path))
        } else {
          folderPaths.push(`${posix.join(dirPath, item.path)}${posix.sep}`)
        }
      }
    })
    await Functions.IncrementalEnsureFoldersBulk(knex, folderPaths)
    await Functions.IncrementalAddPicturesBulk(knex, picturePaths)
    logger(`Incremental scan folder: ${dirPath} (${picturePaths.length} pictures added)`)
  },
  IncrementalEnsureAncestors: async (logger: Debugger, knex: Knex, affectedFolders: Set<string>): Promise<void> => {
    const ancestors = new Set<string>()
    for (const folder of affectedFolders) {
      if (folder === posix.sep) continue
      const withoutSlash = folder.slice(ZERO, TRAILING_SLASH_OFFSET)
      const parentDir = posix.dirname(withoutSlash)
      const parentPath = parentDir === posix.sep ? posix.sep : parentDir + posix.sep
      Imports.SyncFunctions.AddFolderAndAncestors(ancestors, parentPath)
    }
    ancestors.delete(posix.sep)
    if (ancestors.size === ZERO) {
      logger('Ensured 0 ancestor folders')
      return
    }
    const ancestorList = [...ancestors]
    const existing = new Set<string>()
    await Imports.SyncFunctions.ExecChunksSynchronously(
      Imports.SyncFunctions.Chunk(ancestorList, Imports.getDbChunkSize(knex)),
      async (chunk: string[]) => {
        const rows = await knex('folders').select<Array<{ path: string }>>('path').whereIn('path', chunk)
        for (const row of rows) existing.add(row.path)
      },
    )
    const missing = ancestorList.filter((p) => !existing.has(p))
    if (missing.length === ZERO) {
      logger('Ensured 0 ancestor folders')
      return
    }
    const rows = missing.map((path) => {
      const withoutSlash = path.slice(ZERO, TRAILING_SLASH_OFFSET)
      const parentDir = posix.dirname(withoutSlash)
      const folder = parentDir === posix.sep ? posix.sep : parentDir + posix.sep
      const sortKey = Imports.SyncFunctions.ToSortKey(posix.basename(withoutSlash))
      return { folder, path, sortKey }
    })
    await Imports.SyncFunctions.ExecChunksSynchronously(
      Imports.SyncFunctions.Chunk(rows, Imports.getDbChunkSize(knex)),
      async (chunk: Array<{ folder: string; path: string; sortKey: string }>) => {
        await knex('folders').insert(chunk).onConflict('path').ignore()
      },
    )
    logger(`Ensured ${rows.length} ancestor folders`)
  },
  IncrementalUpdateFolders: async (logger: Debugger, knex: Knex, affectedFolders: Set<string>): Promise<void> => {
    const folderList = [...affectedFolders]
    if (folderList.length > ZERO) {
      const perFolderCounts: Array<{ folder: string; totalCount: number; seenCount: number }> = []
      await Imports.SyncFunctions.ExecChunksSynchronously(
        Imports.SyncFunctions.Chunk(folderList, Imports.getDbChunkSize(knex)),
        async (chunk: string[]) => {
          const orLike = chunk.map(() => 'folder LIKE ?').join(' OR ')
          const bindings = chunk.map((af) => `${af}%`)
          const rows = (await knex('pictures')
            .select('folder')
            .count({ totalCount: '*' })
            .sum({ seenCount: knex.raw('CASE WHEN seen THEN 1 ELSE 0 END') })
            .whereRaw(`(${orLike})`, bindings)
            .groupBy('folder')) as Array<{
            folder: string
            totalCount: number | string | null
            seenCount: number | string | null
          }>
          for (const row of rows) {
            perFolderCounts.push({
              folder: row.folder,
              totalCount: Number.parseInt(`${row.totalCount ?? ZERO}`, DECIMAL_RADIX),
              seenCount: Number.parseInt(`${row.seenCount ?? ZERO}`, DECIMAL_RADIX),
            })
          }
        },
      )
      const updateRows = folderList.map((path) => {
        let totalCount = ZERO
        let seenCount = ZERO
        for (const pc of perFolderCounts) {
          if (pc.folder.startsWith(path)) {
            totalCount += pc.totalCount
            seenCount += pc.seenCount
          }
        }
        const withoutSlash = path.slice(ZERO, TRAILING_SLASH_OFFSET)
        const parentDir = posix.dirname(withoutSlash)
        const parent = path === posix.sep ? '' : parentDir === posix.sep ? posix.sep : `${parentDir}${posix.sep}`
        const sortKey = path === posix.sep ? '' : Imports.SyncFunctions.ToSortKey(posix.basename(withoutSlash))
        return { path, totalCount, seenCount, folder: parent, sortKey }
      })
      await Imports.SyncFunctions.ExecChunksSynchronously(
        Imports.SyncFunctions.Chunk(updateRows, Imports.getDbChunkSize(knex)),
        async (chunk) => {
          await knex('folders').insert(chunk).onConflict('path').merge(['totalCount', 'seenCount'])
        },
      )
    }
    const deletedfolders = await knex('folders')
      .where('totalCount', '=', ZERO)
      .andWhere('path', '<>', posix.sep)
      .delete()
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
      Imports.SyncFunctions.AddFolderAndAncestors(affectedFolders, dirPath)
      //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
      await Functions.IncrementalRemoveFolder(logger, knex, dirPath)
    }
    for (const path of fileDeletes) {
      const folder = posix.dirname(path) === posix.sep ? posix.sep : posix.dirname(path) + posix.sep
      Imports.SyncFunctions.AddFolderAndAncestors(affectedFolders, folder)
    }
    if (fileDeletes.length > ZERO) {
      await Functions.IncrementalRemovePicturesBulk(knex, fileDeletes)
      logger(`Incremental remove: ${fileDeletes.length} pictures`)
    }
    for (const dirPath of dirCreates) {
      Imports.SyncFunctions.AddFolderAndAncestors(affectedFolders, dirPath)
      //eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
      await Functions.IncrementalScanFolder(logger, knex, dirPath, dataDir)
    }
    for (const path of fileCreates) {
      const folder = posix.dirname(path) === posix.sep ? posix.sep : posix.dirname(path) + posix.sep
      Imports.SyncFunctions.AddFolderAndAncestors(affectedFolders, folder)
    }
    if (fileCreates.length > ZERO) {
      await Functions.IncrementalAddPicturesBulk(knex, fileCreates)
      logger(`Incremental add: ${fileCreates.length} pictures`)
    }
    await Functions.IncrementalEnsureAncestors(logger, knex, affectedFolders)
    await Functions.IncrementalUpdateFolders(logger, knex, affectedFolders)
    await Functions.IncrementalUpdateFirstImages(logger, knex)
    logger(`Incremental sync complete`)
  },
}
