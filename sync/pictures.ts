'use sanity'

import _debug from 'debug'
import type { Debugger } from 'debug'
import type { Knex } from 'knex'

import { Functions as _Helpers } from './helpers.js'

export const Imports = {
  logPrefix: 'type-imagereader:syncfolders',
  debug: _debug,
}

export const Functions = {
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
    logger(`Added ${_Helpers.ExtractInsertCount(insertedpics)} new pictures`)
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
}
