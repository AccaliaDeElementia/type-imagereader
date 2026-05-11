'use sanity'

import posix from 'node:path'
import { createHash } from 'node:crypto'
import _debug from 'debug'
import type { Knex } from 'knex'
import { from as _copyFrom } from 'pg-copy-streams'
import type { PoolClient } from 'pg'

import { fsWalker as _fsWalker } from './fswalker.js'
import {
  buildSyncItemRows as _buildSyncItemRows,
  chunk,
  execChunksSynchronously,
  formatSyncItemCsv as _formatSyncItemCsv,
} from './helpers.js'
import {
  isPostgres as _isPostgres,
  findSyncItemsViaCopy as _findSyncItemsViaCopy,
  findSyncItemsViaInsert as _findSyncItemsViaInsert,
} from './syncItemsDialect.js'
import { getDataDir as _getDataDir } from '#utils/helpers.js'

export const LOG_PREFIX = 'type-imagereader:sync:findItems'

export const Imports = {
  debug: _debug,
  fsWalker: _fsWalker,
  getDataDir: _getDataDir,
  copyFrom: _copyFrom,
  isPostgres: _isPostgres,
  findSyncItemsViaCopy: _findSyncItemsViaCopy,
  findSyncItemsViaInsert: _findSyncItemsViaInsert,
  acquireCopyConnection: async (knex: Knex): Promise<PoolClient> =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- knex.client.acquireConnection is typed `any`; PoolClient is the concrete shape for the pg dialect
    await knex.client.acquireConnection(),
  releaseCopyConnection: async (knex: Knex, client: PoolClient): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- knex.client.releaseConnection is typed `any`; we hand back the same PoolClient we acquired
    await knex.client.releaseConnection(client)
  },
  buildSyncItemRows: _buildSyncItemRows,
  formatSyncItemCsv: _formatSyncItemCsv,
}

export async function findSyncItems(knex: Knex): Promise<number> {
  const logger = Imports.debug(LOG_PREFIX)
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
    buildSyncItemRows: Imports.buildSyncItemRows,
    getDataDir: Imports.getDataDir,
  }
  const counts = Imports.isPostgres(knex)
    ? await Imports.findSyncItemsViaCopy(knex, logger, {
        ...shared,
        formatSyncItemCsv: Imports.formatSyncItemCsv,
        copyFrom: Imports.copyFrom,
        acquireCopyConnection: Imports.acquireCopyConnection,
        releaseCopyConnection: Imports.releaseCopyConnection,
      })
    : await Imports.findSyncItemsViaInsert(knex, logger, {
        ...shared,
        chunk,
        execChunksSynchronously,
      })
  logger(`Found all ${counts.dirs} dirs and ${counts.files} files`)
  return counts.files
}
