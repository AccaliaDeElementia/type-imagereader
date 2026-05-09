'use sanity'

import _debug from 'debug'
import type { Debugger } from 'debug'
import type { Knex } from 'knex'

import { extractInsertCount } from './helpers.js'

export const LOG_PREFIX = 'type-imagereader:sync:pictures'

export const Imports = {
  debug: _debug,
}

export async function syncNewPictures(logger: Debugger, knex: Knex): Promise<void> {
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
  logger(`Added ${extractInsertCount(insertedpics)} new pictures`)
}

export async function syncRemovedPictures(logger: Debugger, knex: Knex): Promise<void> {
  const deletedpics = await knex('pictures')
    .whereNotExists(function () {
      this.select('*').from('syncitems').whereRaw('syncitems.path = pictures.path')
    })
    .delete()
  logger(`Removed ${deletedpics} missing pictures`)
}

export async function syncRemovedBookmarks(logger: Debugger, knex: Knex): Promise<void> {
  const removedBookmarks = await knex('bookmarks')
    .whereNotExists(function () {
      this.select('*').from('pictures').whereRaw('pictures.path = bookmarks.path')
    })
    .delete()
  logger(`Removed ${removedBookmarks} missing bookmarks`)
}

export async function syncAllPictures(knex: Knex): Promise<void> {
  const logger = Imports.debug(LOG_PREFIX)
  await Internals.syncNewPictures(logger, knex)
  await Internals.syncRemovedPictures(logger, knex)
  await Internals.syncRemovedBookmarks(logger, knex)
}

export const Internals = { syncNewPictures, syncRemovedPictures, syncRemovedBookmarks }
