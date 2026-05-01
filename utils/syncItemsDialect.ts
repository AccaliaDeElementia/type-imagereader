'use sanity'

import type { Knex } from 'knex'
import type { Debugger } from 'debug'
import type { PoolClient } from 'pg'
import type { CopyStreamQuery } from 'pg-copy-streams'

const ZERO = 0
const ONE = 1
const DEFAULT_CHUNK_SIZE = 5000
const LOGGING_INTERVAL = 100

interface DirEntryItem {
  path: string
  isFile: boolean
}

interface SyncItem {
  folder: string
  path: string
  isFile: boolean
  sortKey: string
  pathHash: string
}

interface SyncItemRows {
  files: number
  dirs: number
  rows: SyncItem[]
}

interface SyncItemCounts {
  files: number
  dirs: number
}

interface SharedHelpers {
  fsWalker: (root: string, callback: (items: DirEntryItem[], pending: number) => Promise<void>) => Promise<void>
  buildSyncItemRows: (items: DirEntryItem[]) => SyncItemRows
  getDataDir: () => string
}

export interface InsertFallbackHelpers extends SharedHelpers {
  chunk: <T>(arr: T[], size?: number) => T[][]
  execChunksSynchronously: <T>(chunks: T[][], execFn: (chunk: T[]) => Promise<void>) => Promise<void>
}

export interface CopyHelpers extends SharedHelpers {
  formatSyncItemCsv: (row: SyncItem) => string
  copyFrom: (sql: string) => CopyStreamQuery
  acquireCopyConnection: (knex: Knex) => Promise<PoolClient>
  releaseCopyConnection: (knex: Knex, client: PoolClient) => Promise<void>
}

export function IsPostgres(knex: Knex): boolean {
  //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- knex.client.config is typed `any`
  const client: unknown = knex.client.config.client
  return client === 'pg' || client === 'postgresql'
}

export const FindSyncItemsViaInsert = async (
  knex: Knex,
  logger: Debugger,
  helpers: InsertFallbackHelpers,
): Promise<SyncItemCounts> => {
  let dirs = ZERO
  let files = ZERO
  let counter = ZERO
  await helpers.fsWalker(helpers.getDataDir(), async (items, pending) => {
    const { files: cf, dirs: cd, rows } = helpers.buildSyncItemRows(items)
    files += cf
    dirs += cd
    if (rows.length > ZERO) {
      await helpers.execChunksSynchronously(helpers.chunk(rows), async (chunk) => {
        await knex('syncitems').insert(chunk)
      })
    }
    if (counter === ZERO) {
      logger(`Found ${dirs} dirs (${pending} pending) and ${files} files`)
    }
    counter = (counter + ONE) % LOGGING_INTERVAL
  })
  return { files, dirs }
}

export const FindSyncItemsViaCopy = async (
  knex: Knex,
  logger: Debugger,
  helpers: CopyHelpers,
): Promise<SyncItemCounts> => {
  let dirs = ZERO
  let files = ZERO
  let counter = ZERO
  const buffer: string[] = []
  const client = await helpers.acquireCopyConnection(knex)
  try {
    const stream = client.query(
      helpers.copyFrom('COPY syncitems (folder, path, "isFile", "sortKey", "pathHash") FROM STDIN WITH (FORMAT csv)'),
    )
    let chain = Promise.resolve()
    const flushBuffer = async (): Promise<void> => {
      if (buffer.length === ZERO) return
      const payload = buffer.splice(ZERO).join('')
      if (!stream.write(payload)) {
        const { promise, resolve } = Promise.withResolvers<undefined>()
        stream.once('drain', () => {
          resolve(undefined)
        })
        await promise
      }
    }
    const scheduleFlush = async (): Promise<void> => {
      chain = chain.then(flushBuffer)
      await chain
    }
    try {
      await helpers.fsWalker(helpers.getDataDir(), async (items, pending) => {
        const { files: cf, dirs: cd, rows } = helpers.buildSyncItemRows(items)
        files += cf
        dirs += cd
        for (const row of rows) {
          buffer.push(helpers.formatSyncItemCsv(row))
        }
        if (buffer.length >= DEFAULT_CHUNK_SIZE) {
          await scheduleFlush()
        }
        if (counter === ZERO) {
          logger(`Found ${dirs} dirs (${pending} pending) and ${files} files`)
        }
        counter = (counter + ONE) % LOGGING_INTERVAL
      })
      await chain
      await scheduleFlush()
      stream.end()
      const { promise, resolve, reject } = Promise.withResolvers<undefined>()
      stream.on('finish', () => {
        resolve(undefined)
      })
      stream.on('error', (err: Error) => {
        reject(err)
      })
      await promise
    } catch (err) {
      stream.destroy(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  } finally {
    await helpers.releaseCopyConnection(knex, client)
  }
  return { files, dirs }
}
