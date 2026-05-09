'use sanity'

import posix from 'node:path'
import _debug from 'debug'
import type { Debugger } from 'debug'
import type { Knex } from 'knex'

import {
  AddFolderAndAncestors,
  Chunk as _Chunk,
  ExecChunksSynchronously,
  ExtractInsertCount,
  ToSortKey,
} from './helpers.js'
import { getDbChunkSize as _getDbChunkSize } from './syncItemsDialect.js'

const ZERO = 0
const TRAILING_SLASH_OFFSET = -1

export const LOG_PREFIX = 'type-imagereader:sync:folders'

export const Imports = {
  debug: _debug,
  getDbChunkSize: _getDbChunkSize,
  Chunk: _Chunk,
}

export async function SyncNewFolders(logger: Debugger, knex: Knex): Promise<void> {
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
  logger(`Added ${ExtractInsertCount(folders)} new folders`)
}

export async function SyncRemovedFolders(logger: Debugger, knex: Knex): Promise<void> {
  const deletedfolders = await knex('folders')
    .whereNotExists(function () {
      this.select('*').from('syncitems').whereRaw('syncitems.path = folders.path')
    })
    .delete()
  logger(`Removed ${deletedfolders} missing folders`)
}

export async function SyncMissingAncestorFolders(logger: Debugger, knex: Knex): Promise<void> {
  const leafRows = await knex('pictures').distinct<Array<{ folder: string }>>('folder').whereNotNull('folder')
  const candidates = new Set<string>()
  for (const { folder } of leafRows) {
    AddFolderAndAncestors(candidates, folder)
  }
  candidates.delete(posix.sep)
  if (candidates.size === ZERO) {
    logger('Added 0 missing ancestor folders')
    return
  }
  const candidateList = [...candidates]
  const existing = new Set<string>()
  await ExecChunksSynchronously(Imports.Chunk(candidateList, Imports.getDbChunkSize(knex)), async (chunk) => {
    const rows = await knex('folders').select<Array<{ path: string }>>('path').whereIn('path', chunk)
    for (const row of rows) existing.add(row.path)
  })
  const missing = candidateList.filter((p) => !existing.has(p))
  if (missing.length === ZERO) {
    logger('Added 0 missing ancestor folders')
    return
  }
  const rows = missing.map((path) => {
    const withoutSlash = path.slice(ZERO, TRAILING_SLASH_OFFSET)
    const parentDir = posix.dirname(withoutSlash)
    const folder = parentDir === posix.sep ? posix.sep : parentDir + posix.sep
    const sortKey = ToSortKey(posix.basename(withoutSlash))
    return { folder, path, sortKey }
  })
  await ExecChunksSynchronously(Imports.Chunk(rows, Imports.getDbChunkSize(knex)), async (chunk) => {
    await knex('folders').insert(chunk).onConflict('path').ignore()
  })
  logger(`Added ${missing.length} missing ancestor folders`)
}

export async function SyncMissingCoverImages(logger: Debugger, knex: Knex): Promise<void> {
  const removedCoverImages = await knex('folders')
    .whereNotExists(function () {
      this.select('*').from('pictures').whereRaw('pictures.path = folders.current')
    })
    .whereRaw("folders.current <> ''")
    .update({ current: '' })
  logger(`Removed ${removedCoverImages} missing cover images`)
}

export async function SyncFolderFirstImages(logger: Debugger, knex: Knex): Promise<void> {
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
  await ExecChunksSynchronously(Imports.Chunk(toUpdate, Imports.getDbChunkSize(knex)), async (chunk) => {
    await knex('folders').insert(chunk).onConflict('path').merge(['firstPicture'])
  })
  logger(`Updated ${toUpdate.length} folder first-item images`)
}

export async function SyncAllFolders(knex: Knex): Promise<void> {
  const logger = Imports.debug(LOG_PREFIX)
  await Internals.SyncNewFolders(logger, knex)
  await Internals.SyncRemovedFolders(logger, knex)
  await Internals.SyncMissingAncestorFolders(logger, knex)
  await Internals.SyncMissingCoverImages(logger, knex)
  await Internals.SyncFolderFirstImages(logger, knex)
}

export const Internals = {
  SyncNewFolders,
  SyncRemovedFolders,
  SyncMissingAncestorFolders,
  SyncMissingCoverImages,
  SyncFolderFirstImages,
}
