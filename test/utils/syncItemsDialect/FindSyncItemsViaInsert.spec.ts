'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { FindSyncItemsViaInsert, type InsertFallbackHelpers } from '#utils/syncItemsDialect.js'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()
const noopLogger = Cast<Debugger>(() => undefined)

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

describe('utils/syncItemsDialect function FindSyncItemsViaInsert()', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should return aggregated counts from buildSyncItemRows', async () => {
    const knex = StubToKnex(sandbox.stub())
    const result = await FindSyncItemsViaInsert(knex, noopLogger, buildHelpers())
    expect(result).to.deep.equal({ files: FILE_COUNT, dirs: DIR_COUNT })
  })

  it('should call knex insert exactly once when one chunk of rows is produced', async () => {
    const insertSpy = sandbox.stub().resolves()
    const knexSpy = sandbox.stub().returns({ insert: insertSpy })
    const helpers = buildHelpers({
      buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }),
    })
    await FindSyncItemsViaInsert(StubToKnex(knexSpy), noopLogger, helpers)
    expect(insertSpy.callCount).to.equal(1)
  })

  it('should pass getDataDir() result as fsWalker root', async () => {
    const fsWalkerSpy = sandbox.stub().resolves()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({ fsWalker: fsWalkerSpy, getDataDir: () => '/custom/data' }),
    )
    expect(fsWalkerSpy.firstCall.args[0]).to.equal('/custom/data')
  })

  it('should pass items from fsWalker through to buildSyncItemRows', async () => {
    const items = [{ path: '/a.jpg', isFile: true }]
    const buildRowsSpy = sandbox.stub().returns({ files: 0, dirs: 0, rows: [] })
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb(items, 0)
        },
        buildSyncItemRows: buildRowsSpy,
      }),
    )
    expect(buildRowsSpy.firstCall.args[0]).to.equal(items)
  })

  it('should request chunks of size SQLITE_DB_CHUNK_SIZE', async () => {
    const chunkSpy = sandbox.stub().returns([[sampleRow]])
    const knex = StubToKnex(sandbox.stub().returns({ insert: sandbox.stub().resolves() }))
    await FindSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({
        buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }),
        chunk: chunkSpy,
      }),
    )
    expect(chunkSpy.firstCall.args[1]).to.equal(SQLITE_DB_CHUNK_SIZE)
  })

  it("should insert into the 'syncitems' table", async () => {
    const knexSpy = sandbox.stub().returns({ insert: sandbox.stub().resolves() })
    await FindSyncItemsViaInsert(
      StubToKnex(knexSpy),
      noopLogger,
      buildHelpers({ buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }) }),
    )
    expect(knexSpy.firstCall.args[0]).to.equal('syncitems')
  })

  it('should accumulate files and dirs across multiple fsWalker iterations', async () => {
    const knex = StubToKnex(sandbox.stub())
    const result = await FindSyncItemsViaInsert(
      knex,
      noopLogger,
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb([], 0)
          await cb([], 0)
        },
      }),
    )
    expect(result).to.deep.equal({ files: FILE_COUNT * 2, dirs: DIR_COUNT * 2 })
  })

  it('should call insert once per chunk when chunk() returns multiple chunks', async () => {
    const CHUNK_COUNT = 3
    const insertSpy = sandbox.stub().resolves()
    const knexSpy = sandbox.stub().returns({ insert: insertSpy })
    await FindSyncItemsViaInsert(
      StubToKnex(knexSpy),
      noopLogger,
      buildHelpers({
        buildSyncItemRows: () => ({ files: CHUNK_COUNT, dirs: 0, rows: [sampleRow] }),
        chunk: <T>(arr: T[]): T[][] => Array.from({ length: CHUNK_COUNT }, () => arr),
      }),
    )
    expect(insertSpy.callCount).to.equal(CHUNK_COUNT)
  })

  it('should log "Found N dirs (P pending) and F files" on the first iteration', async () => {
    const PENDING = 5
    const loggerSpy = sandbox.stub()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaInsert(
      knex,
      Cast<Debugger>(loggerSpy),
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb([], PENDING)
        },
      }),
    )
    expect(loggerSpy.firstCall.args[0]).to.equal(`Found ${DIR_COUNT} dirs (${PENDING} pending) and ${FILE_COUNT} files`)
  })

  it('should not log on the second iteration', async () => {
    const loggerSpy = sandbox.stub()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaInsert(
      knex,
      Cast<Debugger>(loggerSpy),
      buildHelpers({
        fsWalker: async (_root, cb) => {
          await cb([], 0)
          await cb([], 0)
        },
      }),
    )
    expect(loggerSpy.callCount).to.equal(1)
  })

  it('should log again every LOGGING_INTERVAL iterations', async () => {
    const ITERATIONS = LOGGING_INTERVAL + 1
    const EXPECTED_LOG_COUNT = 2
    const loggerSpy = sandbox.stub()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaInsert(
      knex,
      Cast<Debugger>(loggerSpy),
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
    expect(loggerSpy.callCount).to.equal(EXPECTED_LOG_COUNT)
  })
})
