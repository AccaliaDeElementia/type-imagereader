'use sanity'

import { expect } from 'chai'
import knex from 'knex'
import type { Knex } from 'knex'
import type { Debugger } from 'debug'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Functions as SyncFunctions } from '#utils/syncfolders.js'
import { IsPostgres, FindSyncItemsViaInsert } from '#utils/syncItemsDialect.js'
import { Cast } from '#testutils/TypeGuards.js'

const noopLogger = Cast<Debugger>(() => undefined)

const moduleDir = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(moduleDir, '..', '..', 'migrations')

type WalkerCallback = (items: Array<{ path: string; isFile: boolean }>, pending: number) => Promise<void>

function assertDb(d: Knex | undefined): asserts d is Knex {
  if (d === undefined) throw new Error('db not initialized — beforeEach did not run')
}

// Migrations + driver init can take a moment on first invocation.
const INTEGRATION_TIMEOUT_MS = 15000

describe(
  'better-sqlite3 :memory: integration',
  () => {
    let db: Knex | undefined = undefined

    beforeEach(async () => {
      const conn = knex({
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
        useNullAsDefault: true,
        migrations: {
          tableName: 'knex_migrations',
          directory: MIGRATIONS_DIR,
          loadExtensions: ['.ts'],
          disableTransactions: true,
        },
      })
      await conn.migrate.latest()
      db = conn
    })

    afterEach(async () => {
      if (db !== undefined) await db.destroy()
    })

    it('should run all migrations to completion', async () => {
      assertDb(db)
      const rows = await db('knex_migrations').select<Array<{ name: string }>>('name')
      expect(rows.length).to.be.greaterThan(0)
    })

    it('should create the folders table', async () => {
      assertDb(db)
      const result = await db('folders').count<Array<{ count: number | string }>>('* as count')
      expect(Number(result[0]?.count ?? -1)).to.equal(0)
    })

    it('should create the pictures table', async () => {
      assertDb(db)
      const result = await db('pictures').count<Array<{ count: number | string }>>('* as count')
      expect(Number(result[0]?.count ?? -1)).to.equal(0)
    })

    it('should create the bookmarks table', async () => {
      assertDb(db)
      const result = await db('bookmarks').count<Array<{ count: number | string }>>('* as count')
      expect(Number(result[0]?.count ?? -1)).to.equal(0)
    })

    it('should create the syncitems table', async () => {
      assertDb(db)
      const result = await db('syncitems').count<Array<{ count: number | string }>>('* as count')
      expect(Number(result[0]?.count ?? -1)).to.equal(0)
    })

    it('should detect the dialect as non-postgres', () => {
      assertDb(db)
      expect(IsPostgres(db)).to.equal(false)
    })

    it('should insert a row through the chunked-INSERT fallback path', async () => {
      assertDb(db)
      const fakeWalker = async (_root: string, callback: WalkerCallback): Promise<void> => {
        await callback(
          [
            { path: '/comics/page1.jpg', isFile: true },
            { path: '/comics/page2.jpg', isFile: true },
            { path: '/comics', isFile: false },
          ],
          0,
        )
      }
      const counts = await FindSyncItemsViaInsert(db, noopLogger, {
        fsWalker: fakeWalker,
        buildSyncItemRows: SyncFunctions.BuildSyncItemRows,
        chunk: SyncFunctions.Chunk,
        execChunksSynchronously: SyncFunctions.ExecChunksSynchronously,
        getDataDir: () => '/data',
      })
      expect(counts.files).to.equal(2)
    })

    it('should round-trip rows inserted by the fallback path', async () => {
      assertDb(db)
      const fakeWalker = async (_root: string, callback: WalkerCallback): Promise<void> => {
        await callback([{ path: '/comics/page1.jpg', isFile: true }], 0)
      }
      await FindSyncItemsViaInsert(db, noopLogger, {
        fsWalker: fakeWalker,
        buildSyncItemRows: SyncFunctions.BuildSyncItemRows,
        chunk: SyncFunctions.Chunk,
        execChunksSynchronously: SyncFunctions.ExecChunksSynchronously,
        getDataDir: () => '/data',
      })
      const rows = await db('syncitems').select<Array<{ path: string }>>('path')
      expect(rows.map((r) => r.path)).to.include('/comics/page1.jpg')
    })

    it('should reject inserts that violate the path uniqueness constraint', async () => {
      assertDb(db)
      const row = {
        folder: '/',
        path: '/dup.jpg',
        sortKey: 'dup',
        pathHash: 'h',
      }
      await db('pictures').insert(row)
      let caught: unknown = null
      try {
        await db('pictures').insert(row)
      } catch (err) {
        caught = err
      }
      expect(caught).to.be.an.instanceOf(Error)
    })

    it('should support onConflict().ignore() for duplicate inserts', async () => {
      assertDb(db)
      const row = {
        folder: '/',
        path: '/x.jpg',
        sortKey: 'x',
        pathHash: 'h',
      }
      await db('pictures').insert(row)
      await db('pictures').insert(row).onConflict('path').ignore()
      const result = await db('pictures').count<Array<{ count: number | string }>>('* as count')
      expect(Number(result[0]?.count ?? -1)).to.equal(1)
    })

    it('should support onConflict().merge() for upserts', async () => {
      assertDb(db)
      await db('folders').insert({ folder: '', path: '/', sortKey: '', firstPicture: 'a.jpg' })
      await db('folders')
        .insert({ folder: '', path: '/', sortKey: '', firstPicture: 'b.jpg' })
        .onConflict('path')
        .merge(['firstPicture'])
      const result = await db('folders').select<Array<{ firstPicture: string }>>('firstPicture').where({ path: '/' })
      expect(result[0]?.firstPicture).to.equal('b.jpg')
    })

    it('should roll back the most recent migration without error', async () => {
      assertDb(db)
      await db.migrate.down()
      const rows = await db('knex_migrations').select<Array<{ name: string }>>('name')
      const remaining = rows.map((r) => r.name)
      expect(remaining).to.not.include('20260421130000_not-null-and-root-sentinel.ts')
    })

    it('should bulk-insert past the SQLITE_LIMIT_COMPOUND_SELECT cap (1000 rows)', async () => {
      assertDb(db)
      const ROW_COUNT = 1000
      const fakeWalker = async (_root: string, callback: WalkerCallback): Promise<void> => {
        const items = Array.from({ length: ROW_COUNT }, (_, i) => ({
          path: `/comics/page${i.toString().padStart(4, '0')}.jpg`,
          isFile: true,
        }))
        await callback(items, 0)
      }
      const counts = await FindSyncItemsViaInsert(db, noopLogger, {
        fsWalker: fakeWalker,
        buildSyncItemRows: SyncFunctions.BuildSyncItemRows,
        chunk: SyncFunctions.Chunk,
        execChunksSynchronously: SyncFunctions.ExecChunksSynchronously,
        getDataDir: () => '/data',
      })
      expect(counts.files).to.equal(ROW_COUNT)
    })
  },
  INTEGRATION_TIMEOUT_MS,
)
