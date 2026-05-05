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
      buildSyncItemRows: () => ({
        files: 1,
        dirs: 0,
        rows: [{ folder: '', path: '/x', sortKey: 'x', isFile: true, pathHash: 'h' }],
      }),
    })
    await FindSyncItemsViaInsert(StubToKnex(knexSpy), noopLogger, helpers)
    expect(insertSpy.callCount).to.equal(1)
  })
})
