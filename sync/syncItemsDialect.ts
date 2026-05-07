'use sanity'

import type { Knex } from 'knex'
import type { Debugger } from 'debug'
import type { PoolClient } from 'pg'
import type { CopyStreamQuery } from 'pg-copy-streams'

const ZERO = 0
const ONE = 1
const DEFAULT_CHUNK_SIZE = 5000
const LOGGING_INTERVAL = 100
const COPY_SQL = 'COPY syncitems (folder, path, "isFile", "sortKey", "pathHash") FROM STDIN WITH (FORMAT csv)'

// PG can absorb a 5000-row bulk insert in a single round-trip; SQLite caps
// SQLITE_LIMIT_COMPOUND_SELECT at 500, so knex's UNION ALL bulk-insert form
// fails. 200 stays well under the cap (and under SQLITE_MAX_VARIABLE_NUMBER
// for whereIn() patterns with multi-column rows) while keeping per-load
// round-trip count manageable.
const PG_DB_CHUNK_SIZE = 5000
const SQLITE_DB_CHUNK_SIZE = 200

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

export function getDbChunkSize(knex: Knex): number {
  return IsPostgres(knex) ? PG_DB_CHUNK_SIZE : SQLITE_DB_CHUNK_SIZE
}

// Resolves on the stream's 'finish' event, rejects on 'error'.
export const awaitCopyStreamCompletion = async (stream: CopyStreamQuery): Promise<void> => {
  const { promise, resolve, reject } = Promise.withResolvers<undefined>()
  stream.on('finish', () => {
    resolve(undefined)
  })
  stream.on('error', (err: Error) => {
    reject(err)
  })
  await promise
}

// Tracks per-walk progress and decides when to log. Each iteration is a single
// `advance()` call; when the walk completes, `toCounts()` returns the totals.
export class InsertState {
  files = ZERO
  dirs = ZERO
  counter = ZERO

  addCounts(cf: number, cd: number): void {
    this.files += cf
    this.dirs += cd
  }

  shouldLog(): boolean {
    return this.counter === ZERO
  }

  formatProgressMessage(pending: number): string {
    return `Found ${this.dirs} dirs (${pending} pending) and ${this.files} files`
  }

  tickCounter(): void {
    this.counter = (this.counter + ONE) % LOGGING_INTERVAL
  }

  toCounts(): SyncItemCounts {
    return { files: this.files, dirs: this.dirs }
  }

  async advance(deps: {
    knex: Knex
    helpers: InsertFallbackHelpers
    logger: Debugger
    items: DirEntryItem[]
    pending: number
  }): Promise<void> {
    const { knex, helpers, logger, items, pending } = deps
    const { files: cf, dirs: cd, rows } = helpers.buildSyncItemRows(items)
    this.addCounts(cf, cd)
    if (rows.length > ZERO) {
      await helpers.execChunksSynchronously(helpers.chunk(rows, SQLITE_DB_CHUNK_SIZE), async (chunk) => {
        await knex('syncitems').insert(chunk)
      })
    }
    if (this.shouldLog()) logger(this.formatProgressMessage(pending))
    this.tickCounter()
  }
}

// Like InsertState but also owns the CSV row buffer and the flush-chain
// promise that serialises stream.write() calls behind a single in-flight flush.
export class CopyState {
  files = ZERO
  dirs = ZERO
  counter = ZERO
  readonly buffer: string[] = []
  chain: Promise<void> = Promise.resolve()

  addCounts(cf: number, cd: number): void {
    this.files += cf
    this.dirs += cd
  }

  pushRow(formatted: string): void {
    this.buffer.push(formatted)
  }

  needsFlush(): boolean {
    return this.buffer.length >= DEFAULT_CHUNK_SIZE
  }

  // Drains the buffer into the stream as a single payload, awaiting a 'drain'
  // event when the stream signals backpressure. No-op for empty buffers.
  async flushBuffer(stream: CopyStreamQuery): Promise<void> {
    if (this.buffer.length === ZERO) return
    const payload = this.buffer.splice(ZERO).join('')
    if (!stream.write(payload)) {
      const { promise, resolve } = Promise.withResolvers<undefined>()
      stream.once('drain', () => {
        resolve(undefined)
      })
      await promise
    }
  }

  async scheduleFlush(stream: CopyStreamQuery): Promise<void> {
    this.chain = this.chain.then(async () => {
      await this.flushBuffer(stream)
    })
    await this.chain
  }

  shouldLog(): boolean {
    return this.counter === ZERO
  }

  formatProgressMessage(pending: number): string {
    return `Found ${this.dirs} dirs (${pending} pending) and ${this.files} files`
  }

  tickCounter(): void {
    this.counter = (this.counter + ONE) % LOGGING_INTERVAL
  }

  toCounts(): SyncItemCounts {
    return { files: this.files, dirs: this.dirs }
  }

  async advance(deps: {
    stream: CopyStreamQuery
    helpers: CopyHelpers
    logger: Debugger
    items: DirEntryItem[]
    pending: number
  }): Promise<void> {
    const { stream, helpers, logger, items, pending } = deps
    const { files: cf, dirs: cd, rows } = helpers.buildSyncItemRows(items)
    this.addCounts(cf, cd)
    for (const row of rows) {
      this.pushRow(helpers.formatSyncItemCsv(row))
    }
    if (this.needsFlush()) await this.scheduleFlush(stream)
    if (this.shouldLog()) logger(this.formatProgressMessage(pending))
    this.tickCounter()
  }
}

export const FindSyncItemsViaInsert = async (
  knex: Knex,
  logger: Debugger,
  helpers: InsertFallbackHelpers,
): Promise<SyncItemCounts> => {
  const state = new InsertState()
  await helpers.fsWalker(helpers.getDataDir(), async (items, pending) => {
    await state.advance({ knex, helpers, logger, items, pending })
  })
  return state.toCounts()
}

export const FindSyncItemsViaCopy = async (
  knex: Knex,
  logger: Debugger,
  helpers: CopyHelpers,
): Promise<SyncItemCounts> => {
  const state = new CopyState()
  const client = await helpers.acquireCopyConnection(knex)
  try {
    const stream = client.query(helpers.copyFrom(COPY_SQL))
    try {
      await helpers.fsWalker(helpers.getDataDir(), async (items, pending) => {
        await state.advance({ stream, helpers, logger, items, pending })
      })
      await state.chain
      await state.scheduleFlush(stream)
      stream.end()
      await awaitCopyStreamCompletion(stream)
    } catch (err) {
      stream.destroy(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  } finally {
    await helpers.releaseCopyConnection(knex, client)
  }
  return state.toCounts()
}
