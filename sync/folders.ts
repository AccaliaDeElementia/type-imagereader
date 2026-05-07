'use sanity'

import posix from 'node:path'
import _debug from 'debug'
import type { Debugger } from 'debug'
import type { Knex } from 'knex'

import { Functions as _Helpers } from './helpers.js'
import { getDbChunkSize as _getDbChunkSize } from './syncItemsDialect.js'

const ZERO = 0
const TRAILING_SLASH_OFFSET = -1

export const Imports = {
  logPrefix: 'type-imagereader:syncfolders',
  debug: _debug,
  getDbChunkSize: _getDbChunkSize,
}

export const Functions = {
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
    logger(`Added ${_Helpers.ExtractInsertCount(folders)} new folders`)
  },
  SyncRemovedFolders: async (logger: Debugger, knex: Knex): Promise<void> => {
    const deletedfolders = await knex('folders')
      .whereNotExists(function () {
        this.select('*').from('syncitems').whereRaw('syncitems.path = folders.path')
      })
      .delete()
    logger(`Removed ${deletedfolders} missing folders`)
  },
  SyncMissingAncestorFolders: async (logger: Debugger, knex: Knex): Promise<void> => {
    const leafRows = await knex('pictures').distinct<Array<{ folder: string }>>('folder').whereNotNull('folder')
    const candidates = new Set<string>()
    for (const { folder } of leafRows) {
      _Helpers.AddFolderAndAncestors(candidates, folder)
    }
    candidates.delete(posix.sep)
    if (candidates.size === ZERO) {
      logger('Added 0 missing ancestor folders')
      return
    }
    const candidateList = [...candidates]
    const existing = new Set<string>()
    await _Helpers.ExecChunksSynchronously(
      _Helpers.Chunk(candidateList, Imports.getDbChunkSize(knex)),
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
      const sortKey = _Helpers.ToSortKey(posix.basename(withoutSlash))
      return { folder, path, sortKey }
    })
    await _Helpers.ExecChunksSynchronously(_Helpers.Chunk(rows, Imports.getDbChunkSize(knex)), async (chunk) => {
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
    await _Helpers.ExecChunksSynchronously(_Helpers.Chunk(toUpdate, Imports.getDbChunkSize(knex)), async (chunk) => {
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
}
