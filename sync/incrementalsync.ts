'use sanity'

import posix from 'node:path'
import { createHash } from 'node:crypto'
import type { Knex } from 'knex'
import type { Changeset } from './filewatcher.js'

import _debug from 'debug'
import type { Debugger } from 'debug'

import { fsWalker as _fsWalker } from './fswalker.js'
import { addFolderAndAncestors, chunk, execChunksSynchronously, parseFolderPath, toSortKey } from './helpers.js'
import { syncFolderFirstImages as _syncFolderFirstImages } from './folders.js'
import { getDbChunkSize as _getDbChunkSize } from './syncItemsDialect.js'
import { escapeLikeWildcards } from '#utils/helpers.js'
import { toFolderPath } from '#utils/path.js'

const ZERO = 0
const TRAILING_SLASH_OFFSET = -1
const DECIMAL_RADIX = 10

export const LOG_PREFIX = 'type-imagereader:sync:incrementalsync'

export const Imports = {
  debug: _debug,
  fsWalker: _fsWalker,
  syncFolderFirstImages: _syncFolderFirstImages,
  getDbChunkSize: _getDbChunkSize,
}

export async function incrementalAddPicturesBulk(knex: Knex, paths: string[]): Promise<void> {
  if (paths.length === ZERO) return
  const pictureRows = paths.map((path) => {
    const folder = toFolderPath(posix.dirname(path))
    return {
      folder,
      path,
      sortKey: toSortKey(posix.basename(path)),
      pathHash: createHash('sha512').update(path).digest('base64'),
    }
  })
  await execChunksSynchronously(chunk(pictureRows, Imports.getDbChunkSize(knex)), async (chunk) => {
    await knex('pictures').insert(chunk).onConflict('path').ignore()
  })
  const parentFolders = pictureRows.map((row) => row.folder)
  await Internals.incrementalEnsureFoldersBulk(knex, parentFolders)
}

export async function incrementalEnsureFoldersBulk(knex: Knex, folderPaths: string[]): Promise<void> {
  if (folderPaths.length === ZERO) return
  const unique = new Set(folderPaths)
  unique.delete(posix.sep)
  if (unique.size === ZERO) return
  const rows = [...unique].map((folderPath) => ({ ...parseFolderPath(folderPath), path: folderPath }))
  await execChunksSynchronously(chunk(rows, Imports.getDbChunkSize(knex)), async (chunk) => {
    await knex('folders').insert(chunk).onConflict('path').ignore()
  })
}

export async function incrementalRemovePicturesBulk(knex: Knex, paths: string[]): Promise<void> {
  if (paths.length === ZERO) return
  await execChunksSynchronously(chunk(paths, Imports.getDbChunkSize(knex)), async (chunk) => {
    await knex('pictures').whereIn('path', chunk).delete()
    await knex('bookmarks').whereIn('path', chunk).delete()
  })
}

export async function incrementalRemoveFolder(logger: Debugger, knex: Knex, dirPath: string): Promise<void> {
  const escapedPrefix = `${escapeLikeWildcards(dirPath)}%`
  const deletedPics = await knex('pictures').where('folder', 'like', escapedPrefix).delete()
  await knex('bookmarks')
    .whereNotExists(function () {
      this.select('*').from('pictures').whereRaw('pictures.path = bookmarks.path')
    })
    .delete()
  const deletedFolders = await knex('folders').where('path', 'like', escapedPrefix).delete()
  logger(`Incremental remove folder: ${dirPath} (${deletedPics} pictures, ${deletedFolders} folders)`)
}

export async function incrementalScanFolder(
  logger: Debugger,
  knex: Knex,
  dirPath: string,
  dataDir: string,
): Promise<string[]> {
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
  await Internals.incrementalEnsureFoldersBulk(knex, folderPaths)
  await Internals.incrementalAddPicturesBulk(knex, picturePaths)
  logger(`Incremental scan folder: ${dirPath} (${picturePaths.length} pictures added)`)
  return folderPaths
}

export async function incrementalEnsureAncestors(
  logger: Debugger,
  knex: Knex,
  affectedFolders: Set<string>,
): Promise<void> {
  const ancestors = new Set<string>()
  for (const folder of affectedFolders) {
    if (folder === posix.sep) continue
    const withoutSlash = folder.slice(ZERO, TRAILING_SLASH_OFFSET)
    addFolderAndAncestors(ancestors, toFolderPath(posix.dirname(withoutSlash)))
  }
  ancestors.delete(posix.sep)
  if (ancestors.size === ZERO) {
    logger('Ensured 0 ancestor folders')
    return
  }
  const ancestorList = [...ancestors]
  const existing = new Set<string>()
  await execChunksSynchronously(chunk(ancestorList, Imports.getDbChunkSize(knex)), async (chunk: string[]) => {
    const rows = await knex('folders').select<Array<{ path: string }>>('path').whereIn('path', chunk)
    for (const row of rows) existing.add(row.path)
  })
  const missing = ancestorList.filter((p) => !existing.has(p))
  if (missing.length === ZERO) {
    logger('Ensured 0 ancestor folders')
    return
  }
  const rows = missing.map((path) => ({ ...parseFolderPath(path), path }))
  await execChunksSynchronously(
    chunk(rows, Imports.getDbChunkSize(knex)),
    async (chunk: Array<{ folder: string; path: string; sortKey: string }>) => {
      await knex('folders').insert(chunk).onConflict('path').ignore()
    },
  )
  logger(`Ensured ${rows.length} ancestor folders`)
}

export async function incrementalUpdateFolders(
  logger: Debugger,
  knex: Knex,
  affectedFolders: Set<string>,
): Promise<void> {
  const folderList = [...affectedFolders]
  if (folderList.length > ZERO) {
    const perFolderCounts: Array<{ folder: string; totalCount: number; seenCount: number }> = []
    await execChunksSynchronously(chunk(folderList, Imports.getDbChunkSize(knex)), async (chunk: string[]) => {
      const orLike = chunk.map(() => `folder LIKE ? ESCAPE '\\'`).join(' OR ')
      const bindings = chunk.map((af) => `${escapeLikeWildcards(af)}%`)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- knex aggregation result shape isn't inferred from chained count/sum
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
    })
    const updateRows = folderList.map((path) => {
      let totalCount = ZERO
      let seenCount = ZERO
      for (const pc of perFolderCounts) {
        if (pc.folder.startsWith(path)) {
          totalCount += pc.totalCount
          seenCount += pc.seenCount
        }
      }
      const { folder, sortKey } = path === posix.sep ? { folder: '', sortKey: '' } : parseFolderPath(path)
      return { path, totalCount, seenCount, folder, sortKey }
    })
    await execChunksSynchronously(chunk(updateRows, Imports.getDbChunkSize(knex)), async (chunk) => {
      await knex('folders').insert(chunk).onConflict('path').merge(['totalCount', 'seenCount'])
    })
  }
  const prunedPerChunk: number[] = []
  await execChunksSynchronously(chunk(folderList, Imports.getDbChunkSize(knex)), async (chunk: string[]) => {
    prunedPerChunk.push(
      await knex('folders')
        .where('totalCount', '=', ZERO)
        .andWhere('path', '<>', posix.sep)
        .whereIn('path', chunk)
        .delete(),
    )
  })
  const deletedfolders = prunedPerChunk.reduce((sum, count) => sum + count, ZERO)
  logger(`Incremental folder update: ${affectedFolders.size} folders checked, ${deletedfolders} empty folders pruned`)
}

export function categorizeChangeset(changeset: Changeset): {
  dirDeletes: string[]
  fileDeletes: string[]
  dirCreates: string[]
  fileCreates: string[]
} {
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
}

export async function incrementalUpdateFirstImages(logger: Debugger, knex: Knex): Promise<void> {
  await Imports.syncFolderFirstImages(logger, knex)
}

export async function incrementalSync(knex: Knex, changeset: Changeset, dataDir = '/data'): Promise<void> {
  const logger = Imports.debug(LOG_PREFIX)
  logger(`Processing ${changeset.size} incremental changes`)
  const { dirDeletes, fileDeletes, dirCreates, fileCreates } = Internals.categorizeChangeset(changeset)
  const affectedFolders = new Set<string>()
  for (const dirPath of dirDeletes) {
    addFolderAndAncestors(affectedFolders, dirPath)
    // eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
    await Internals.incrementalRemoveFolder(logger, knex, dirPath)
  }
  for (const path of fileDeletes) {
    addFolderAndAncestors(affectedFolders, toFolderPath(posix.dirname(path)))
  }
  if (fileDeletes.length > ZERO) {
    await Internals.incrementalRemovePicturesBulk(knex, fileDeletes)
    logger(`Incremental remove: ${fileDeletes.length} pictures`)
  }
  for (const dirPath of dirCreates) {
    addFolderAndAncestors(affectedFolders, dirPath)
    // eslint-disable-next-line no-await-in-loop -- Deliberately synchronous to avoid race conditions
    const scannedFolders = await Internals.incrementalScanFolder(logger, knex, dirPath, dataDir)
    for (const scanned of scannedFolders) {
      addFolderAndAncestors(affectedFolders, scanned)
    }
  }
  for (const path of fileCreates) {
    addFolderAndAncestors(affectedFolders, toFolderPath(posix.dirname(path)))
  }
  if (fileCreates.length > ZERO) {
    await Internals.incrementalAddPicturesBulk(knex, fileCreates)
    logger(`Incremental add: ${fileCreates.length} pictures`)
  }
  await Internals.incrementalEnsureAncestors(logger, knex, affectedFolders)
  await Internals.incrementalUpdateFolders(logger, knex, affectedFolders)
  await Internals.incrementalUpdateFirstImages(logger, knex)
  logger(`Incremental sync complete`)
}

export const Internals = {
  incrementalAddPicturesBulk,
  incrementalEnsureFoldersBulk,
  incrementalRemovePicturesBulk,
  incrementalRemoveFolder,
  incrementalScanFolder,
  incrementalEnsureAncestors,
  incrementalUpdateFolders,
  categorizeChangeset,
  incrementalUpdateFirstImages,
}
