'use sanity'

import posix from 'node:path'
import { createHash } from 'node:crypto'
import _debug from 'debug'
import type { Knex } from 'knex'
import { from as _copyFrom } from 'pg-copy-streams'
import type { PoolClient } from 'pg'

import { FsWalker as _FsWalker } from './fswalker.js'
import {
  BuildSyncItemRows as _BuildSyncItemRows,
  Chunk,
  ExecChunksSynchronously,
  FormatSyncItemCsv as _FormatSyncItemCsv,
} from './helpers.js'
import {
  IsPostgres as _IsPostgres,
  FindSyncItemsViaCopy as _FindSyncItemsViaCopy,
  FindSyncItemsViaInsert as _FindSyncItemsViaInsert,
} from './syncItemsDialect.js'
import { getDataDir as _getDataDir } from '../utils/helpers.js'

export const Imports = {
  logPrefix: 'type-imagereader:sync:findItems',
  debug: _debug,
  fsWalker: _FsWalker,
  getDataDir: _getDataDir,
  copyFrom: _copyFrom,
  IsPostgres: _IsPostgres,
  FindSyncItemsViaCopy: _FindSyncItemsViaCopy,
  FindSyncItemsViaInsert: _FindSyncItemsViaInsert,
  acquireCopyConnection: async (knex: Knex): Promise<PoolClient> =>
    //eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- knex.client.acquireConnection is typed `any`; PoolClient is the concrete shape for the pg dialect
    await knex.client.acquireConnection(),
  releaseCopyConnection: async (knex: Knex, client: PoolClient): Promise<void> => {
    //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- knex.client.releaseConnection is typed `any`; we hand back the same PoolClient we acquired
    await knex.client.releaseConnection(client)
  },
  BuildSyncItemRows: _BuildSyncItemRows,
  FormatSyncItemCsv: _FormatSyncItemCsv,
}

export async function FindSyncItems(knex: Knex): Promise<number> {
  const logger = Imports.debug(Imports.logPrefix)
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
    buildSyncItemRows: Imports.BuildSyncItemRows,
    getDataDir: Imports.getDataDir,
  }
  const counts = Imports.IsPostgres(knex)
    ? await Imports.FindSyncItemsViaCopy(knex, logger, {
        ...shared,
        formatSyncItemCsv: Imports.FormatSyncItemCsv,
        copyFrom: Imports.copyFrom,
        acquireCopyConnection: Imports.acquireCopyConnection,
        releaseCopyConnection: Imports.releaseCopyConnection,
      })
    : await Imports.FindSyncItemsViaInsert(knex, logger, {
        ...shared,
        chunk: Chunk,
        execChunksSynchronously: ExecChunksSynchronously,
      })
  logger(`Found all ${counts.dirs} dirs and ${counts.files} files`)
  return counts.files
}
