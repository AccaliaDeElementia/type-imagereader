'use sanity'

import { findSyncItemsViaInsert, type InsertFallbackHelpers } from '#sync/syncItemsDialect.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { noopLogger } from '#testutils/debug.js'
import type { Debugger } from 'debug'

const FILE_COUNT = 7
const DIR_COUNT = 3
// Mirrors the file-private constants in utils/syncItemsDialect.ts; not exported.
const SQLITE_DB_CHUNK_SIZE = 200
const LOGGING_INTERVAL = 100

const sampleRow = { folder: '', path: '/x', sortKey: 'x', isFile: true, pathHash: 'h' }

const buildHelpers = (overrides: Partial<InsertFallbackHelpers> = {}): InsertFallbackHelpers => ({
  fsWalker: async (_root, cb) => {
    await cb([], 0)
  },
  buildSyncItemRows: () => ({ files: FILE_COUNT, dirs: DIR_COUNT, rows: [] }),
  chunk: (arr) => [arr],
  execChunksSynchronously: async (chunks, fn) => {
    await Promise.all(chunks.map(fn))
  },
  getDataDir: () => '/',
  ...overrides,
})

describe('sync/syncItemsDialect findSyncItemsViaInsert()', () => {
  it('should return aggregated counts from buildSyncItemRows', async () => {
    const knex = stubToKnex(vi.fn())
    const result = await findSyncItemsViaInsert(knex, noopLogger, buildHelpers())
    expect(result).toEqual({ files: FILE_COUNT, dirs: DIR_COUNT })
  })

  it('should call knex insert exactly once when one chunk of rows is produced', async () => {
    const insertSpy = vi.fn().mockResolvedValue(undefined)
    const knexSpy = vi.fn().mockReturnValue({ insert: insertSpy })
    const helpers = buildHelpers({
      buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }),
    })
    await findSyncItemsViaInsert(stubToKnex(knexSpy), noopLogger, helpers)
    expect(insertSpy.mock.calls.length).toBe(1)
  })

  it('should pass getDataDir() result as fsWalker root', async () => {
    const fsWalkerSpy = vi.fn().mockResolvedValue(undefined)
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({ fsWalker: fsWalkerSpy, getDataDir: () => '/custom/data' }),
    )
    expect(fsWalkerSpy.mock.calls[0]?.[0]).toBe('/custom/data')
  })

  it('should pass items from fsWalker through to buildSyncItemRows', async () => {
    const items = [{ path: '/a.jpg', isFile: true }]
    const buildRowsSpy = vi.fn().mockReturnValue({ files: 0, dirs: 0, rows: [] })
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb(items, 0)
        },
        buildSyncItemRows: buildRowsSpy,
      }),
    )
    expect(buildRowsSpy.mock.calls[0]?.[0]).toBe(items)
  })

  it('should request chunks of size SQLITE_DB_CHUNK_SIZE', async () => {
    const chunkSpy = vi.fn().mockReturnValue([[sampleRow]])
    const knex = stubToKnex(vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue(undefined) }))
    await findSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({
        buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }),
        chunk: chunkSpy,
      }),
    )
    expect(chunkSpy.mock.calls[0]?.[1]).toBe(SQLITE_DB_CHUNK_SIZE)
  })

  it("should insert into the 'syncitems' table", async () => {
    const knexSpy = vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue(undefined) })
    await findSyncItemsViaInsert(
      stubToKnex(knexSpy),
      noopLogger,
      buildHelpers({ buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }) }),
    )
    expect(knexSpy.mock.calls[0]?.[0]).toBe('syncitems')
  })

  it('should accumulate files and dirs across multiple fsWalker iterations', async () => {
    const knex = stubToKnex(vi.fn())
    const result = await findSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb([], 0)
          await cb([], 0)
        },
      }),
    )
    expect(result).toEqual({ files: FILE_COUNT * 2, dirs: DIR_COUNT * 2 })
  })

  it('should call insert once per chunk when chunk() returns multiple chunks', async () => {
    const CHUNK_COUNT = 3
    const insertSpy = vi.fn().mockResolvedValue(undefined)
    const knexSpy = vi.fn().mockReturnValue({ insert: insertSpy })
    await findSyncItemsViaInsert(
      stubToKnex(knexSpy),
      noopLogger,
      buildHelpers({
        buildSyncItemRows: () => ({ files: CHUNK_COUNT, dirs: 0, rows: [sampleRow] }),
        chunk: <T>(arr: T[]): T[][] => Array.from({ length: CHUNK_COUNT }, () => arr),
      }),
    )
    expect(insertSpy.mock.calls.length).toBe(CHUNK_COUNT)
  })

  it('should log "Found N dirs (P pending) and F files" on the first iteration', async () => {
    const PENDING = 5
    const loggerSpy = vi.fn()
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaInsert(
      knex,
      cast<Debugger>(loggerSpy),
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb([], PENDING)
        },
      }),
    )
    expect(loggerSpy.mock.calls[0]?.[0]).toBe(`Found ${DIR_COUNT} dirs (${PENDING} pending) and ${FILE_COUNT} files`)
  })

  it('should not log on the second iteration', async () => {
    const loggerSpy = vi.fn()
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaInsert(
      knex,
      cast<Debugger>(loggerSpy),
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb([], 0)
          await cb([], 0)
        },
      }),
    )
    expect(loggerSpy.mock.calls.length).toBe(1)
  })

  it('should log again every LOGGING_INTERVAL iterations', async () => {
    const ITERATIONS = LOGGING_INTERVAL + 1
    const EXPECTED_LOG_COUNT = 2
    const loggerSpy = vi.fn()
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaInsert(
      knex,
      cast<Debugger>(loggerSpy),
      buildHelpers({
        fsWalker: async (_root, cb) => {
          let chain = Promise.resolve()
          for (let i = 0; i < ITERATIONS; i += 1) {
            chain = chain.then(async () => {
              await cb([], 0)
            })
          }
          await chain
        },
      }),
    )
    expect(loggerSpy.mock.calls.length).toBe(EXPECTED_LOG_COUNT)
  })
})
