'use sanity'

import type { EventEmitter } from 'node:events'
import { findSyncItems, Imports, LOG_PREFIX } from '#sync/findItems.js'
import { cast } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import { createCopyStreamFake, scheduleEmit as scheduleEmitOn } from '#testutils/copyStream.js'
import { stubDebug } from '#testutils/debug.js'
import type { PoolClient } from 'pg'
import type { CopyStreamQuery } from 'pg-copy-streams'
import type { MockInstance } from 'vitest'

const FLUSH_THRESHOLD = 5000

type Callback = (items: Array<{ path: string; isFile: boolean }>, pending: number) => Promise<void>

interface StreamFake extends EventEmitter {
  write: MockInstance
  end: MockInstance
  destroy: MockInstance
}

const makeRows = (count: number): Array<{ path: string; marker: number }> =>
  Array.from({ length: count }, (_, i) => ({ path: `/p${i}`, marker: i }))

const makeStream = (): StreamFake => cast<StreamFake>(createCopyStreamFake({ emitOnEnd: 'finish' }).ee)

const scheduleEmit = (target: EventEmitter, event: string, arg?: unknown): void => {
  if (arg === undefined) scheduleEmitOn(target, event)
  else scheduleEmitOn(target, event, arg)
}

describe('sync/findItems findSyncItems()', () => {
  let loggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
  let fsWalkerStub: MockInstance = vi.fn()
  let buildSyncItemRowsStub: MockInstance = vi.fn()
  let formatSyncItemCsvStub: MockInstance = vi.fn()
  let copyFromStub: MockInstance = vi.fn()
  let acquireStub: MockInstance = vi.fn()
  let releaseStub: MockInstance = vi.fn()
  let streamFake = makeStream()
  let pgClientStub = { query: vi.fn().mockReturnValue(streamFake) }
  let {
    instance: knexInstanceStub,
    stub: knexFnStub,
    fake: knexFnFake,
  } = createKnexChainFake([] as const, ['truncate', 'insert'] as const, undefined)
  beforeEach(() => {
    ;({
      instance: knexInstanceStub,
      stub: knexFnStub,
      fake: knexFnFake,
    } = createKnexChainFake([] as const, ['truncate', 'insert'] as const, undefined))
    streamFake = makeStream()
    pgClientStub = { query: vi.fn().mockReturnValue(streamFake) }
    ;({ debugStub, loggerStub } = stubDebug(Imports))
    fsWalkerStub = vi.spyOn(Imports, 'fsWalker').mockResolvedValue(undefined)
    buildSyncItemRowsStub = vi.spyOn(Imports, 'buildSyncItemRows').mockReturnValue({ files: 0, dirs: 0, rows: [] })
    formatSyncItemCsvStub = vi.spyOn(Imports, 'formatSyncItemCsv').mockReturnValue('csv-row\n')
    copyFromStub = vi.spyOn(Imports, 'copyFrom').mockReturnValue(cast<CopyStreamQuery>(vi.fn()))
    acquireStub = vi.spyOn(Imports, 'acquireCopyConnection').mockResolvedValue(cast<PoolClient>(pgClientStub))
    releaseStub = vi.spyOn(Imports, 'releaseCopyConnection').mockResolvedValue(undefined)
  })
  describe('when client is postgres', () => {
    beforeEach(() => {
      vi.spyOn(Imports, 'isPostgres').mockReturnValue(true)
    })

    it('should call debug once when creating logger', async () => {
      await findSyncItems(knexFnFake)
      expect(debugStub.mock.calls.length).toBe(1)
    })
    it('should create logger with the module prefix', async () => {
      await findSyncItems(knexFnFake)
      expect(debugStub.mock.calls[0]?.[0]).toBe(LOG_PREFIX)
    })
    it('should truncate syncitems once to clear prior contents', async () => {
      await findSyncItems(knexFnFake)
      expect(knexInstanceStub.truncate.mock.calls.length).toBe(1)
    })
    it('should insert the root folder row once', async () => {
      await findSyncItems(knexFnFake)
      expect(knexInstanceStub.insert.mock.calls.length).toBe(1)
    })
    it('should insert the root folder row with the root sentinel in the folder column', async () => {
      await findSyncItems(knexFnFake)
      expect(knexInstanceStub.insert.mock.calls[0]).toEqual([
        {
          folder: '',
          path: '/',
          isFile: false,
          sortKey: '',
          pathHash: 'XIbwNE7SSUJciq0/Jytyos4P84h5HzFJfq8lf6cmKUh/qv1/0n6w3WNV1VCeLz+vdnEQFc2SB9JI1VD96hUnTw==',
        },
      ])
    })
    it('should insert the root folder row with a non-empty pathHash to satisfy NOT NULL', async () => {
      await findSyncItems(knexFnFake)
      const row = cast<{ pathHash: string }>(knexInstanceStub.insert.mock.calls[0]?.[0])
      expect(row.pathHash.length).toBeGreaterThan(0)
    })
    it('should request syncitems on the first knex call', async () => {
      await findSyncItems(knexFnFake)
      expect(knexFnStub.mock.calls[0]?.[0] === 'syncitems').toBe(true)
    })
    it('should request syncitems on the second knex call', async () => {
      await findSyncItems(knexFnFake)
      expect(knexFnStub.mock.calls[1]?.[0] === 'syncitems').toBe(true)
    })
    it('should acquire a pool connection for the COPY stream', async () => {
      await findSyncItems(knexFnFake)
      expect(acquireStub.mock.calls.length).toBe(1)
    })
    it('should release the pool connection after the COPY stream completes', async () => {
      await findSyncItems(knexFnFake)
      expect(releaseStub.mock.calls.length).toBe(1)
    })
    it('should release the connection that was acquired', async () => {
      await findSyncItems(knexFnFake)
      expect(releaseStub.mock.calls[0]?.[1]).toBe(pgClientStub)
    })
    it('should release the pool connection even when the walker rejects', async () => {
      fsWalkerStub.mockRejectedValue(new Error('walker failed'))
      await findSyncItems(knexFnFake).catch(() => undefined)
      expect(releaseStub.mock.calls.length).toBe(1)
    })
    it('should destroy the stream if the walker rejects', async () => {
      fsWalkerStub.mockRejectedValue(new Error('walker failed'))
      await findSyncItems(knexFnFake).catch(() => undefined)
      expect(streamFake.destroy.mock.calls.length).toBe(1)
    })
    it('should wrap a non-Error rejection in an Error when destroying the stream', async () => {
      fsWalkerStub.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/promise-function-async, @typescript-eslint/prefer-promise-reject-errors -- deliberately testing the non-Error rejection branch
        () => Promise.reject('plain string failure'),
      )
      await findSyncItems(knexFnFake).catch(() => undefined)
      expect(streamFake.destroy.mock.calls[0]?.[0]).toBeInstanceOf(Error)
    })
    it('should open exactly one COPY stream', async () => {
      await findSyncItems(knexFnFake)
      expect(copyFromStub.mock.calls.length).toBe(1)
    })
    it('should issue a COPY FROM STDIN statement targeting syncitems', async () => {
      await findSyncItems(knexFnFake)
      expect(copyFromStub.mock.calls[0]?.[0]).toBe(
        'COPY syncitems (folder, path, "isFile", "sortKey", "pathHash") FROM STDIN WITH (FORMAT csv)',
      )
    })
    it('should submit the COPY stream through the acquired pg client', async () => {
      await findSyncItems(knexFnFake)
      expect(pgClientStub.query.mock.calls.length).toBe(1)
    })
    it('should end the COPY stream once the walk finishes', async () => {
      await findSyncItems(knexFnFake)
      expect(streamFake.end.mock.calls.length).toBe(1)
    })
    it('should call fsWalker once', async () => {
      await findSyncItems(knexFnFake)
      expect(fsWalkerStub.mock.calls.length).toBe(1)
    })
    it('should walk filesystem starting at /data', async () => {
      await findSyncItems(knexFnFake)
      expect(fsWalkerStub.mock.calls.some((c) => c[0] === '/data')).toBe(true)
    })
    it('should walk filesystem starting at DATA_DIR when set', async () => {
      process.env.DATA_DIR = '/library/images'
      try {
        await findSyncItems(knexFnFake)
        expect(fsWalkerStub.mock.calls.some((c) => c[0] === '/library/images')).toBe(true)
      } finally {
        delete process.env.DATA_DIR
      }
    })
    it('should pass walker items through buildSyncItemRows', async () => {
      await findSyncItems(knexFnFake)
      const callback = cast<Callback>(fsWalkerStub.mock.calls[0]?.[1])
      const items = [{ path: '/foo', isFile: false }]
      await callback(items, 0)
      expect(buildSyncItemRowsStub.mock.calls.some((c) => c[0] === items)).toBe(true)
    })
    it('should format each row through formatSyncItemCsv', async () => {
      const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
      buildSyncItemRowsStub.mockReturnValue({ files: 1, dirs: 0, rows: [row] })
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        await callback([{ path: '/f.jpg', isFile: true }], 0)
      })
      await findSyncItems(knexFnFake)
      expect(formatSyncItemCsvStub.mock.calls.some((c) => c[0] === row)).toBe(true)
    })
    it('should write buffered rows to the stream when the threshold is reached', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        buildSyncItemRowsStub.mockReturnValue({ files: 0, dirs: 0, rows: makeRows(FLUSH_THRESHOLD) })
        await callback([], 0)
      })
      await findSyncItems(knexFnFake)
      const writes = streamFake.write.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].length > 0)
      expect(writes.length).toBeGreaterThanOrEqual(1)
    })
    it('should issue a single write call when only the tail flush produces a batch', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        buildSyncItemRowsStub.mockReturnValue({ files: 0, dirs: 0, rows: makeRows(500) })
        await callback([], 0)
      })
      await findSyncItems(knexFnFake)
      expect(streamFake.write.mock.calls.length).toBe(1)
    })
    it('should flush the tail buffer via stream.write before ending', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        buildSyncItemRowsStub.mockReturnValue({ files: 0, dirs: 0, rows: makeRows(500) })
        await callback([], 0)
      })
      await findSyncItems(knexFnFake)
      expect(streamFake.write.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
    it('should wait for drain when stream.write signals backpressure', async () => {
      streamFake.write.mockImplementationOnce(() => {
        scheduleEmit(streamFake, 'drain')
        return false
      })
      streamFake.write.mockReturnValue(true)
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        buildSyncItemRowsStub.mockReturnValue({ files: 0, dirs: 0, rows: makeRows(FLUSH_THRESHOLD) })
        await callback([], 0)
      })
      await findSyncItems(knexFnFake)
      expect(streamFake.end.mock.calls.length).toBe(1)
    })
    it('should reject when the stream emits an error before finish', async () => {
      const err = new Error('copy failed')
      streamFake.end.mockImplementation(() => {
        scheduleEmit(streamFake, 'error', err)
      })
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        buildSyncItemRowsStub.mockReturnValue({ files: 0, dirs: 0, rows: [] })
        await callback([], 0)
      })
      let caught: unknown = null
      try {
        await findSyncItems(knexFnFake)
      } catch (e) {
        caught = e
      }
      expect(caught).toBe(err)
    })
    it('should log status on first loop', async () => {
      await findSyncItems(knexFnFake)
      const callback = cast<Callback>(fsWalkerStub.mock.calls[0]?.[1])
      const items = [{ path: '/foo', isFile: false }]
      buildSyncItemRowsStub.mockReturnValue({ files: 3, dirs: 9, rows: [] })
      await callback(items, 6)
      expect(loggerStub.mock.calls.some((c) => c[0] === 'Found 9 dirs (6 pending) and 3 files')).toBe(true)
    })
    it('should log twice by the 101st loop', async () => {
      await findSyncItems(knexFnFake)
      loggerStub.mockClear()
      const callback = cast<Callback>(fsWalkerStub.mock.calls[0]?.[1])
      const items = [{ path: '/foo', isFile: false }]
      const invocations: Array<Promise<void>> = []
      for (let i = 0; i < 100; i += 1) invocations.push(callback(items, 0))
      await Promise.all(invocations)
      buildSyncItemRowsStub.mockReturnValue({ files: 3, dirs: 9, rows: [] })
      await callback(items, 6)
      expect(loggerStub.mock.calls.length).toBe(2)
    })
    it('should log status on 101st loop', async () => {
      await findSyncItems(knexFnFake)
      loggerStub.mockClear()
      const callback = cast<Callback>(fsWalkerStub.mock.calls[0]?.[1])
      const items = [{ path: '/foo', isFile: false }]
      const invocations: Array<Promise<void>> = []
      for (let i = 0; i < 100; i += 1) invocations.push(callback(items, 0))
      await Promise.all(invocations)
      buildSyncItemRowsStub.mockReturnValue({ files: 3, dirs: 9, rows: [] })
      await callback(items, 6)
      expect(loggerStub.mock.calls.some((c) => c[0] === 'Found 9 dirs (6 pending) and 3 files')).toBe(true)
    })
    const ChainableFileCounter = async (prev: Promise<void>, callback: Callback, files: number): Promise<void> => {
      const items = [{ path: '/foo', isFile: false }]
      buildSyncItemRowsStub.mockReturnValue({ files, dirs: 0, rows: [] })
      await callback(items, 0)
      await prev
    }
    it('should count all files in loop', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        let chain = Promise.resolve()
        for (let i = 1; i <= 100; i += 1) {
          chain = ChainableFileCounter(chain, callback, i)
        }
        await chain
      })
      await findSyncItems(knexFnFake)
      expect(loggerStub.mock.calls.some((c) => c[0] === 'Found all 0 dirs and 5050 files')).toBe(true)
    })
    const ChainableDirCounter = async (prev: Promise<void>, callback: Callback, dirs: number): Promise<void> => {
      const items = [{ path: '/foo', isFile: false }]
      buildSyncItemRowsStub.mockReturnValue({ files: 0, dirs, rows: [] })
      await callback(items, 0)
      await prev
    }
    it('should count all dirs in loop', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        let chain = Promise.resolve()
        for (let i = 1; i <= 100; i += 1) {
          chain = ChainableDirCounter(chain, callback, i)
        }
        await chain
      })
      await findSyncItems(knexFnFake)
      expect(loggerStub.mock.calls.some((c) => c[0] === 'Found all 5050 dirs and 0 files')).toBe(true)
    })
    it('should return count of files', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        let chain = Promise.resolve()
        for (let i = 1; i <= 100; i += 1) {
          chain = ChainableFileCounter(chain, callback, i)
        }
        await chain
      })
      const result = await findSyncItems(knexFnFake)
      expect(result).toBe(5050)
    })
  })

  describe('when client is not postgres (sqlite fallback)', () => {
    beforeEach(() => {
      vi.spyOn(Imports, 'isPostgres').mockReturnValue(false)
    })

    it('should not acquire a copy connection', async () => {
      await findSyncItems(knexFnFake)
      expect(acquireStub.mock.calls.length > 0).toBe(false)
    })

    it('should not release a copy connection', async () => {
      await findSyncItems(knexFnFake)
      expect(releaseStub.mock.calls.length > 0).toBe(false)
    })

    it('should not invoke copyFrom', async () => {
      await findSyncItems(knexFnFake)
      expect(copyFromStub.mock.calls.length > 0).toBe(false)
    })

    it('should not write to the COPY stream', async () => {
      await findSyncItems(knexFnFake)
      expect(streamFake.write.mock.calls.length > 0).toBe(false)
    })

    it('should still walk the filesystem', async () => {
      await findSyncItems(knexFnFake)
      expect(fsWalkerStub.mock.calls.length).toBe(1)
    })

    it('should walk filesystem starting at /data', async () => {
      await findSyncItems(knexFnFake)
      expect(fsWalkerStub.mock.calls.some((c) => c[0] === '/data')).toBe(true)
    })

    it('should walk filesystem starting at DATA_DIR when set', async () => {
      process.env.DATA_DIR = '/library/images'
      try {
        await findSyncItems(knexFnFake)
        expect(fsWalkerStub.mock.calls.some((c) => c[0] === '/library/images')).toBe(true)
      } finally {
        delete process.env.DATA_DIR
      }
    })

    it('should pass walker items through buildSyncItemRows', async () => {
      await findSyncItems(knexFnFake)
      const callback = cast<Callback>(fsWalkerStub.mock.calls[0]?.[1])
      const items = [{ path: '/foo', isFile: false }]
      await callback(items, 0)
      expect(buildSyncItemRowsStub.mock.calls.some((c) => c[0] === items)).toBe(true)
    })

    it('should not invoke formatSyncItemCsv', async () => {
      const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
      buildSyncItemRowsStub.mockReturnValue({ files: 1, dirs: 0, rows: [row] })
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        await callback([{ path: '/f.jpg', isFile: true }], 0)
      })
      await findSyncItems(knexFnFake)
      expect(formatSyncItemCsvStub.mock.calls.length > 0).toBe(false)
    })

    it('should insert each chunk via knex when rows are produced', async () => {
      const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
      buildSyncItemRowsStub.mockReturnValue({ files: 1, dirs: 0, rows: [row] })
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        await callback([{ path: '/f.jpg', isFile: true }], 0)
      })
      await findSyncItems(knexFnFake)
      expect(knexInstanceStub.insert.mock.calls.length).toBe(2)
    })

    it('should pass chunk rows to insert', async () => {
      const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
      buildSyncItemRowsStub.mockReturnValue({ files: 1, dirs: 0, rows: [row] })
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        await callback([{ path: '/f.jpg', isFile: true }], 0)
      })
      await findSyncItems(knexFnFake)
      expect(knexInstanceStub.insert.mock.calls[1]?.[0]).toEqual([row])
    })

    it('should not insert when a callback yields zero rows', async () => {
      buildSyncItemRowsStub.mockReturnValue({ files: 0, dirs: 0, rows: [] })
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        await callback([], 0)
      })
      await findSyncItems(knexFnFake)
      expect(knexInstanceStub.insert.mock.calls.length).toBe(1)
    })

    it('should log status on first loop', async () => {
      await findSyncItems(knexFnFake)
      const callback = cast<Callback>(fsWalkerStub.mock.calls[0]?.[1])
      const items = [{ path: '/foo', isFile: false }]
      buildSyncItemRowsStub.mockReturnValue({ files: 3, dirs: 9, rows: [] })
      await callback(items, 6)
      expect(loggerStub.mock.calls.some((c) => c[0] === 'Found 9 dirs (6 pending) and 3 files')).toBe(true)
    })

    it('should log status on 101st loop', async () => {
      await findSyncItems(knexFnFake)
      loggerStub.mockClear()
      const callback = cast<Callback>(fsWalkerStub.mock.calls[0]?.[1])
      const items = [{ path: '/foo', isFile: false }]
      const invocations: Array<Promise<void>> = []
      for (let i = 0; i < 100; i += 1) invocations.push(callback(items, 0))
      await Promise.all(invocations)
      buildSyncItemRowsStub.mockReturnValue({ files: 3, dirs: 9, rows: [] })
      await callback(items, 6)
      expect(loggerStub.mock.calls.some((c) => c[0] === 'Found 9 dirs (6 pending) and 3 files')).toBe(true)
    })

    const ChainableFileCounter = async (prev: Promise<void>, callback: Callback, files: number): Promise<void> => {
      const items = [{ path: '/foo', isFile: false }]
      buildSyncItemRowsStub.mockReturnValue({ files, dirs: 0, rows: [] })
      await callback(items, 0)
      await prev
    }

    it('should count all files across the walk', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        let chain = Promise.resolve()
        for (let i = 1; i <= 100; i += 1) {
          chain = ChainableFileCounter(chain, callback, i)
        }
        await chain
      })
      await findSyncItems(knexFnFake)
      expect(loggerStub.mock.calls.some((c) => c[0] === 'Found all 0 dirs and 5050 files')).toBe(true)
    })

    it('should return count of files', async () => {
      fsWalkerStub.mockImplementation(async (_: string, callback: Callback) => {
        let chain = Promise.resolve()
        for (let i = 1; i <= 100; i += 1) {
          chain = ChainableFileCounter(chain, callback, i)
        }
        await chain
      })
      const result = await findSyncItems(knexFnFake)
      expect(result).toBe(5050)
    })
  })
})
