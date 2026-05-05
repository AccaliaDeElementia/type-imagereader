'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { InsertState, type InsertFallbackHelpers } from '#utils/syncItemsDialect.js'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()
const noopLogger = Cast<Debugger>(() => undefined)

const FILE_DELTA = 7
const DIR_DELTA = 3
const FILE_DELTA_2 = 2
const DIR_DELTA_2 = 1
const PENDING = 5
const LOGGING_INTERVAL = 100
const SQLITE_DB_CHUNK_SIZE = 200

describe('utils/syncItemsDialect class InsertState', () => {
  afterEach(() => {
    sandbox.restore()
  })

  describe('addCounts()', () => {
    it('should increment files by cf', () => {
      const state = new InsertState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.files).to.equal(FILE_DELTA)
    })

    it('should increment dirs by cd', () => {
      const state = new InsertState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.dirs).to.equal(DIR_DELTA)
    })

    it('should accumulate files across multiple calls', () => {
      const state = new InsertState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      state.addCounts(FILE_DELTA_2, DIR_DELTA_2)
      expect(state.files).to.equal(FILE_DELTA + FILE_DELTA_2)
    })

    it('should accumulate dirs across multiple calls', () => {
      const state = new InsertState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      state.addCounts(FILE_DELTA_2, DIR_DELTA_2)
      expect(state.dirs).to.equal(DIR_DELTA + DIR_DELTA_2)
    })
  })

  describe('shouldLog()', () => {
    it('should return true on a fresh state', () => {
      const state = new InsertState()
      expect(state.shouldLog()).to.equal(true)
    })

    it('should return false after one tick', () => {
      const state = new InsertState()
      state.tickCounter()
      expect(state.shouldLog()).to.equal(false)
    })
  })

  describe('formatProgressMessage()', () => {
    it('should embed dirs, pending, and files in the standard format', () => {
      const state = new InsertState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.formatProgressMessage(PENDING)).to.equal(
        `Found ${DIR_DELTA} dirs (${PENDING} pending) and ${FILE_DELTA} files`,
      )
    })
  })

  describe('tickCounter()', () => {
    it('should increment counter by one', () => {
      const state = new InsertState()
      state.tickCounter()
      expect(state.counter).to.equal(1)
    })

    it('should wrap counter to zero after LOGGING_INTERVAL ticks', () => {
      const state = new InsertState()
      for (let i = 0; i < LOGGING_INTERVAL; i += 1) state.tickCounter()
      expect(state.counter).to.equal(0)
    })
  })

  describe('toCounts()', () => {
    it('should return a plain object with files and dirs', () => {
      const state = new InsertState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.toCounts()).to.deep.equal({ files: FILE_DELTA, dirs: DIR_DELTA })
    })
  })

  describe('advance()', () => {
    const sampleRow = { folder: '', path: '/x', sortKey: 'x', isFile: true, pathHash: 'h' }
    const buildHelpers = (overrides: Partial<InsertFallbackHelpers> = {}): InsertFallbackHelpers => ({
      fsWalker: async () => {
        await Promise.resolve()
      },
      buildSyncItemRows: () => ({ files: FILE_DELTA, dirs: DIR_DELTA, rows: [] }),
      chunk: (arr) => [arr],
      execChunksSynchronously: async (chunks, fn) => {
        await Promise.all(chunks.map(fn))
      },
      getDataDir: () => '/',
      ...overrides,
    })

    it('should add the buildSyncItemRows counts to state.files', async () => {
      const state = new InsertState()
      const knex = StubToKnex(sandbox.stub())
      await state.advance({ knex, helpers: buildHelpers(), logger: noopLogger, items: [], pending: 0 })
      expect(state.files).to.equal(FILE_DELTA)
    })

    it('should call knex insert when buildSyncItemRows returns rows', async () => {
      const insertSpy = sandbox.stub().resolves()
      const knexSpy = sandbox.stub().returns({ insert: insertSpy })
      const state = new InsertState()
      await state.advance({
        knex: StubToKnex(knexSpy),
        helpers: buildHelpers({
          buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }),
        }),
        logger: noopLogger,
        items: [],
        pending: 0,
      })
      expect(insertSpy.callCount).to.equal(1)
    })

    it('should request chunks of size SQLITE_DB_CHUNK_SIZE', async () => {
      const chunkSpy = sandbox.stub().returns([[sampleRow]])
      const knex = StubToKnex(sandbox.stub().returns({ insert: sandbox.stub().resolves() }))
      const state = new InsertState()
      await state.advance({
        knex,
        helpers: buildHelpers({
          buildSyncItemRows: () => ({ files: 1, dirs: 0, rows: [sampleRow] }),
          chunk: chunkSpy,
        }),
        logger: noopLogger,
        items: [],
        pending: 0,
      })
      expect(chunkSpy.firstCall.args[1]).to.equal(SQLITE_DB_CHUNK_SIZE)
    })

    it('should log on the first iteration', async () => {
      const loggerSpy = sandbox.stub()
      const state = new InsertState()
      const knex = StubToKnex(sandbox.stub())
      await state.advance({
        knex,
        helpers: buildHelpers(),
        logger: Cast<Debugger>(loggerSpy),
        items: [],
        pending: PENDING,
      })
      expect(loggerSpy.firstCall.args[0]).to.equal(
        `Found ${DIR_DELTA} dirs (${PENDING} pending) and ${FILE_DELTA} files`,
      )
    })

    it('should advance the counter', async () => {
      const state = new InsertState()
      const knex = StubToKnex(sandbox.stub())
      await state.advance({ knex, helpers: buildHelpers(), logger: noopLogger, items: [], pending: 0 })
      expect(state.counter).to.equal(1)
    })
  })
})
