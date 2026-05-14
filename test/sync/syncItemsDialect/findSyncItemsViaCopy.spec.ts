'use sanity'

import { findSyncItemsViaCopy, type CopyHelpers } from '#sync/syncItemsDialect.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createCopyStreamFake } from '#testutils/copyStream.js'
import { noopLogger } from '#testutils/debug.js'
import { eventuallyRejects } from '#testutils/errors.js'
import type { Debugger } from 'debug'
import type { CopyStreamQuery } from 'pg-copy-streams'
import type { PoolClient } from 'pg'

const FILE_COUNT = 4
const DIR_COUNT = 1
// Mirrors the file-private constants in utils/syncItemsDialect.ts.
const DEFAULT_CHUNK_SIZE = 5000
const LOGGING_INTERVAL = 100
const COPY_SQL = 'COPY syncitems (folder, path, "isFile", "sortKey", "pathHash") FROM STDIN WITH (FORMAT csv)'

const sampleRow = { folder: '', path: '/x', sortKey: 'x', isFile: true, pathHash: 'h' }

const buildStreamHandles = (opts: { endError?: Error } = {}): ReturnType<typeof createCopyStreamFake> =>
  createCopyStreamFake({
    emitOnEnd: opts.endError === undefined ? 'finish' : { error: opts.endError },
  })

const buildHelpers = (overrides: Partial<CopyHelpers> = {}): CopyHelpers => ({
  fsWalker: async (_root, cb) => {
    await cb([], 0)
  },
  buildSyncItemRows: () => ({
    files: FILE_COUNT,
    dirs: DIR_COUNT,
    rows: [sampleRow],
  }),
  getDataDir: () => '/',
  formatSyncItemCsv: () => 'csv-row\n',
  copyFrom: () => buildStreamHandles().stream,
  acquireCopyConnection: async () => {
    await Promise.resolve()
    return cast<PoolClient>({ query: (s: CopyStreamQuery) => s })
  },
  releaseCopyConnection: async () => {
    await Promise.resolve()
  },
  ...overrides,
})

describe('sync/syncItemsDialect findSyncItemsViaCopy()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return aggregated counts from buildSyncItemRows', async () => {
    const knex = stubToKnex(vi.fn())
    const result = await findSyncItemsViaCopy(knex, noopLogger, buildHelpers())
    expect(result).toEqual({ files: FILE_COUNT, dirs: DIR_COUNT })
  })

  it('should release the copy connection after streaming completes', async () => {
    const releaseSpy = vi.fn().mockResolvedValue(undefined)
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(knex, noopLogger, buildHelpers({ releaseCopyConnection: releaseSpy }))
    expect(releaseSpy.mock.calls.length).toBe(1)
  })

  it('should pass knex to acquireCopyConnection', async () => {
    const acquireSpy = vi.fn().mockResolvedValue(cast<PoolClient>({ query: (s: CopyStreamQuery) => s }))
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(knex, noopLogger, buildHelpers({ acquireCopyConnection: acquireSpy }))
    expect(acquireSpy.mock.calls[0]?.[0]).toBe(knex)
  })

  it('should issue the COPY SQL when starting the stream', async () => {
    const copyFromSpy = vi.fn().mockReturnValue(buildStreamHandles().stream)
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: copyFromSpy }))
    expect(copyFromSpy.mock.calls[0]?.[0]).toBe(COPY_SQL)
  })

  it('should pass getDataDir() result as fsWalker root', async () => {
    const fsWalkerSpy = vi.fn().mockResolvedValue(undefined)
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(
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
    await findSyncItemsViaCopy(
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

  it('should write formatted CSV rows through stream.write', async () => {
    const handles = buildStreamHandles()
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(
      knex,
      noopLogger,
      buildHelpers({ copyFrom: () => handles.stream, formatSyncItemCsv: () => 'unique-row-marker\n' }),
    )
    expect(handles.writeSpy.mock.calls[0]?.[0]).toContain('unique-row-marker')
  })

  it("should wait for 'drain' when stream.write returns false", async () => {
    const handles = buildStreamHandles()
    handles.writeSpy
      .mockImplementationOnce(() => {
        setImmediate(() => {
          handles.ee.emit('drain')
        })
        return false
      })
      .mockReturnValue(true)
    const knex = stubToKnex(vi.fn())
    const result = await findSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream }))
    expect(result).toEqual({ files: FILE_COUNT, dirs: DIR_COUNT })
  })

  it('should call stream.end exactly once after walking completes', async () => {
    const handles = buildStreamHandles()
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream }))
    expect(handles.endSpy.mock.calls.length).toBe(1)
  })

  it("should reject with the stream's emitted 'error'", async () => {
    const streamErr = new Error('stream blew up')
    const handles = buildStreamHandles({ endError: streamErr })
    const knex = stubToKnex(vi.fn())
    const err = await eventuallyRejects(
      findSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream })),
    )
    expect(err).toBe(streamErr)
  })

  it('should call stream.destroy with the emitted error', async () => {
    const streamErr = new Error('stream blew up')
    const handles = buildStreamHandles({ endError: streamErr })
    const knex = stubToKnex(vi.fn())
    await eventuallyRejects(findSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream })))
    expect(handles.destroySpy.mock.calls[0]?.[0]).toBe(streamErr)
  })

  it('should release the connection even when the stream errors', async () => {
    const handles = buildStreamHandles({ endError: new Error('stream error') })
    const releaseSpy = vi.fn().mockResolvedValue(undefined)
    const knex = stubToKnex(vi.fn())
    await eventuallyRejects(
      findSyncItemsViaCopy(
        knex,
        noopLogger,
        buildHelpers({ copyFrom: () => handles.stream, releaseCopyConnection: releaseSpy }),
      ),
    )
    expect(releaseSpy.mock.calls.length).toBe(1)
  })

  it('should pass knex and client to releaseCopyConnection', async () => {
    const client = cast<PoolClient>({ query: (s: CopyStreamQuery) => s })
    const releaseSpy = vi.fn().mockResolvedValue(undefined)
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(
      knex,
      noopLogger,
      buildHelpers({
        acquireCopyConnection: async () => {
          await Promise.resolve()
          return client
        },
        releaseCopyConnection: releaseSpy,
      }),
    )
    expect(releaseSpy.mock.calls[0]).toEqual([knex, client])
  })

  it('should accumulate files and dirs across multiple fsWalker iterations', async () => {
    const knex = stubToKnex(vi.fn())
    const result = await findSyncItemsViaCopy(
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

  it('should log "Found N dirs (P pending) and F files" on the first iteration', async () => {
    const PENDING = 5
    const loggerSpy = vi.fn()
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(
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
    await findSyncItemsViaCopy(
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
    await findSyncItemsViaCopy(
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

  it('should issue an additional stream.write per fsWalker iteration that pushes the buffer past DEFAULT_CHUNK_SIZE', async () => {
    const ITERATIONS = 3
    const handles = buildStreamHandles()
    const rows = Array.from({ length: DEFAULT_CHUNK_SIZE }, () => sampleRow)
    const knex = stubToKnex(vi.fn())
    await findSyncItemsViaCopy(
      knex,
      noopLogger,
      buildHelpers({
        copyFrom: () => handles.stream,
        buildSyncItemRows: () => ({ files: DEFAULT_CHUNK_SIZE, dirs: 0, rows }),
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
    expect(handles.writeSpy.mock.calls.length).toBe(ITERATIONS)
  })
})
