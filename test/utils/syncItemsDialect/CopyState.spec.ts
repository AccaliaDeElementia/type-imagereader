'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { EventEmitter } from 'node:events'
import { setImmediate as yieldMacro } from 'node:timers/promises'

import { CopyState, awaitCopyStreamCompletion, type CopyHelpers } from '#utils/syncItemsDialect.js'
import { Cast } from '#testutils/TypeGuards.js'
import { EventuallyRejects } from '#testutils/Errors.js'
import type { Debugger } from 'debug'
import type { CopyStreamQuery } from 'pg-copy-streams'
import type { PoolClient } from 'pg'

const scheduleEmit = (ee: EventEmitter, event: string, ...args: unknown[]): void => {
  setImmediate(() => {
    ee.emit(event, ...args)
  })
}

const sandbox = Sinon.createSandbox()
const noopLogger = Cast<Debugger>(() => undefined)

const FILE_DELTA = 7
const DIR_DELTA = 3
const FILE_DELTA_2 = 2
const DIR_DELTA_2 = 1
const PENDING = 5
const LOGGING_INTERVAL = 100
const DEFAULT_CHUNK_SIZE = 5000

interface StreamHandles {
  stream: CopyStreamQuery
  ee: EventEmitter
  writeSpy: Sinon.SinonStub
  endSpy: Sinon.SinonStub
  destroySpy: Sinon.SinonStub
}

const buildStreamHandles = (): StreamHandles => {
  const ee = new EventEmitter()
  const writeSpy = sandbox.stub().returns(true)
  const endSpy = sandbox.stub()
  const destroySpy = sandbox.stub()
  Object.assign(ee, { write: writeSpy, end: endSpy, destroy: destroySpy, once: ee.once.bind(ee), on: ee.on.bind(ee) })
  return { stream: Cast<CopyStreamQuery>(ee), ee, writeSpy, endSpy, destroySpy }
}

describe('utils/syncItemsDialect class CopyState', () => {
  afterEach(() => {
    sandbox.restore()
  })

  describe('addCounts()', () => {
    it('should increment files by cf', () => {
      const state = new CopyState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.files).to.equal(FILE_DELTA)
    })

    it('should increment dirs by cd', () => {
      const state = new CopyState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.dirs).to.equal(DIR_DELTA)
    })

    it('should accumulate files across calls', () => {
      const state = new CopyState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      state.addCounts(FILE_DELTA_2, DIR_DELTA_2)
      expect(state.files).to.equal(FILE_DELTA + FILE_DELTA_2)
    })

    it('should accumulate dirs across calls', () => {
      const state = new CopyState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      state.addCounts(FILE_DELTA_2, DIR_DELTA_2)
      expect(state.dirs).to.equal(DIR_DELTA + DIR_DELTA_2)
    })
  })

  describe('pushRow()', () => {
    it('should append the formatted row to the buffer', () => {
      const state = new CopyState()
      state.pushRow('csv-line\n')
      expect(state.buffer).to.deep.equal(['csv-line\n'])
    })
  })

  describe('needsFlush()', () => {
    it('should return false on a fresh state', () => {
      const state = new CopyState()
      expect(state.needsFlush()).to.equal(false)
    })

    it('should return true once the buffer reaches DEFAULT_CHUNK_SIZE', () => {
      const state = new CopyState()
      for (let i = 0; i < DEFAULT_CHUNK_SIZE; i += 1) state.pushRow('row')
      expect(state.needsFlush()).to.equal(true)
    })
  })

  describe('flushBuffer()', () => {
    it('should be a no-op on an empty buffer', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      await state.flushBuffer(handles.stream)
      expect(handles.writeSpy.callCount).to.equal(0)
    })

    it('should write the joined buffer payload to the stream', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      state.pushRow('a')
      state.pushRow('b')
      await state.flushBuffer(handles.stream)
      expect(handles.writeSpy.firstCall.args[0]).to.equal('ab')
    })

    it('should empty the buffer after flushing', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      state.pushRow('a')
      await state.flushBuffer(handles.stream)
      expect(state.buffer.length).to.equal(0)
    })

    it("should wait for 'drain' when stream.write returns false", async () => {
      const handles = buildStreamHandles()
      handles.writeSpy.returns(false)
      const state = new CopyState()
      state.pushRow('a')
      const flushPromise = state.flushBuffer(handles.stream)
      scheduleEmit(handles.ee, 'drain')
      await flushPromise
      expect(handles.writeSpy.callCount).to.equal(1)
    })
  })

  describe('scheduleFlush()', () => {
    it('should write the queued payload through the stream', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      state.pushRow('only-row')
      await state.scheduleFlush(handles.stream)
      expect(handles.writeSpy.firstCall.args[0]).to.equal('only-row')
    })

    it('should drain rows pushed between back-to-back scheduleFlush calls into the first flush', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      state.pushRow('first')
      const a = state.scheduleFlush(handles.stream)
      state.pushRow('second')
      const b = state.scheduleFlush(handles.stream)
      await Promise.all([a, b])
      expect(handles.writeSpy.firstCall.args[0]).to.equal('firstsecond')
    })
  })

  describe('shouldLog()', () => {
    it('should return true on a fresh state', () => {
      const state = new CopyState()
      expect(state.shouldLog()).to.equal(true)
    })

    it('should return false after one tick', () => {
      const state = new CopyState()
      state.tickCounter()
      expect(state.shouldLog()).to.equal(false)
    })
  })

  describe('formatProgressMessage()', () => {
    it('should embed dirs, pending, and files in the standard format', () => {
      const state = new CopyState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.formatProgressMessage(PENDING)).to.equal(
        `Found ${DIR_DELTA} dirs (${PENDING} pending) and ${FILE_DELTA} files`,
      )
    })
  })

  describe('tickCounter()', () => {
    it('should increment counter by one', () => {
      const state = new CopyState()
      state.tickCounter()
      expect(state.counter).to.equal(1)
    })

    it('should wrap counter to zero after LOGGING_INTERVAL ticks', () => {
      const state = new CopyState()
      for (let i = 0; i < LOGGING_INTERVAL; i += 1) state.tickCounter()
      expect(state.counter).to.equal(0)
    })
  })

  describe('toCounts()', () => {
    it('should return a plain object with files and dirs', () => {
      const state = new CopyState()
      state.addCounts(FILE_DELTA, DIR_DELTA)
      expect(state.toCounts()).to.deep.equal({ files: FILE_DELTA, dirs: DIR_DELTA })
    })
  })

  describe('advance()', () => {
    const sampleRow = { folder: '', path: '/x', sortKey: 'x', isFile: true, pathHash: 'h' }
    const buildHelpers = (overrides: Partial<CopyHelpers> = {}): CopyHelpers => ({
      fsWalker: async () => {
        await Promise.resolve()
      },
      buildSyncItemRows: () => ({ files: FILE_DELTA, dirs: DIR_DELTA, rows: [sampleRow] }),
      getDataDir: () => '/',
      formatSyncItemCsv: () => 'csv-line\n',
      copyFrom: () => buildStreamHandles().stream,
      acquireCopyConnection: async () => {
        await Promise.resolve()
        return Cast<PoolClient>({ query: (s: CopyStreamQuery) => s })
      },
      releaseCopyConnection: async () => {
        await Promise.resolve()
      },
      ...overrides,
    })

    it('should add the buildSyncItemRows counts to state.files', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      await state.advance({
        stream: handles.stream,
        helpers: buildHelpers(),
        logger: noopLogger,
        items: [],
        pending: 0,
      })
      expect(state.files).to.equal(FILE_DELTA)
    })

    it('should push formatted rows into the buffer', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      await state.advance({
        stream: handles.stream,
        helpers: buildHelpers({ formatSyncItemCsv: () => 'unique-tag\n' }),
        logger: noopLogger,
        items: [],
        pending: 0,
      })
      expect(state.buffer).to.deep.equal(['unique-tag\n'])
    })

    it('should flush mid-iteration when buffer reaches DEFAULT_CHUNK_SIZE', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      const fillerRows = Array.from({ length: DEFAULT_CHUNK_SIZE }, () => sampleRow)
      await state.advance({
        stream: handles.stream,
        helpers: buildHelpers({
          buildSyncItemRows: () => ({ files: DEFAULT_CHUNK_SIZE, dirs: 0, rows: fillerRows }),
        }),
        logger: noopLogger,
        items: [],
        pending: 0,
      })
      expect(handles.writeSpy.callCount).to.equal(1)
    })

    it('should log on the first iteration', async () => {
      const loggerSpy = sandbox.stub()
      const handles = buildStreamHandles()
      const state = new CopyState()
      await state.advance({
        stream: handles.stream,
        helpers: buildHelpers({
          buildSyncItemRows: () => ({ files: FILE_DELTA, dirs: DIR_DELTA, rows: [] }),
        }),
        logger: Cast<Debugger>(loggerSpy),
        items: [],
        pending: PENDING,
      })
      expect(loggerSpy.firstCall.args[0]).to.equal(
        `Found ${DIR_DELTA} dirs (${PENDING} pending) and ${FILE_DELTA} files`,
      )
    })

    it('should advance the counter', async () => {
      const handles = buildStreamHandles()
      const state = new CopyState()
      await state.advance({
        stream: handles.stream,
        helpers: buildHelpers({
          buildSyncItemRows: () => ({ files: 0, dirs: 0, rows: [] }),
        }),
        logger: noopLogger,
        items: [],
        pending: 0,
      })
      expect(state.counter).to.equal(1)
    })
  })
})

describe('utils/syncItemsDialect function awaitCopyStreamCompletion()', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it("should resolve when the stream emits 'finish'", async () => {
    const ee = new EventEmitter()
    const stream = Cast<CopyStreamQuery>(ee)
    const promise = awaitCopyStreamCompletion(stream)
    scheduleEmit(ee, 'finish')
    await promise
    await yieldMacro()
    expect(true).to.equal(true)
  })

  it("should reject with the emitted error when the stream emits 'error'", async () => {
    const ee = new EventEmitter()
    const stream = Cast<CopyStreamQuery>(ee)
    const streamErr = new Error('blew up')
    const promise = awaitCopyStreamCompletion(stream)
    scheduleEmit(ee, 'error', streamErr)
    const err = await EventuallyRejects(promise)
    expect(err).to.equal(streamErr)
  })
})
