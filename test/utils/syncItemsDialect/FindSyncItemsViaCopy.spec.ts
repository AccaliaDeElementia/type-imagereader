'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { EventEmitter } from 'node:events'

import { FindSyncItemsViaCopy, type CopyHelpers } from '#utils/syncItemsDialect.js'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import { EventuallyRejects } from '#testutils/Errors.js'
import type { Debugger } from 'debug'
import type { CopyStreamQuery } from 'pg-copy-streams'
import type { PoolClient } from 'pg'

const sandbox = Sinon.createSandbox()
const noopLogger = Cast<Debugger>(() => undefined)

const FILE_COUNT = 4
const DIR_COUNT = 1
// Mirrors the file-private constants in utils/syncItemsDialect.ts.
const DEFAULT_CHUNK_SIZE = 5000
const LOGGING_INTERVAL = 100
const COPY_SQL = 'COPY syncitems (folder, path, "isFile", "sortKey", "pathHash") FROM STDIN WITH (FORMAT csv)'

const sampleRow = { folder: '', path: '/x', sortKey: 'x', isFile: true, pathHash: 'h' }

interface StreamHandles {
  stream: CopyStreamQuery
  ee: EventEmitter
  writeSpy: Sinon.SinonStub
  endSpy: Sinon.SinonStub
  destroySpy: Sinon.SinonStub
}

const buildStreamHandles = (opts: { endError?: Error } = {}): StreamHandles => {
  const ee = new EventEmitter()
  const writeSpy = sandbox.stub().returns(true)
  const endSpy = sandbox.stub().callsFake(() => {
    setImmediate(() => {
      if (opts.endError === undefined) ee.emit('finish')
      else ee.emit('error', opts.endError)
    })
  })
  const destroySpy = sandbox.stub()
  Object.assign(ee, { write: writeSpy, end: endSpy, destroy: destroySpy })
  return { stream: Cast<CopyStreamQuery>(ee), ee, writeSpy, endSpy, destroySpy }
}

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
    return Cast<PoolClient>({ query: (s: CopyStreamQuery) => s })
  },
  releaseCopyConnection: async () => {
    await Promise.resolve()
  },
  ...overrides,
})

describe('utils/syncItemsDialect function FindSyncItemsViaCopy()', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should return aggregated counts from buildSyncItemRows', async () => {
    const knex = StubToKnex(sandbox.stub())
    const result = await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers())
    expect(result).to.deep.equal({ files: FILE_COUNT, dirs: DIR_COUNT })
  })

  it('should release the copy connection after streaming completes', async () => {
    const releaseSpy = sandbox.stub().resolves()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ releaseCopyConnection: releaseSpy }))
    expect(releaseSpy.callCount).to.equal(1)
  })

  it('should pass knex to acquireCopyConnection', async () => {
    const acquireSpy = sandbox.stub().resolves(Cast<PoolClient>({ query: (s: CopyStreamQuery) => s }))
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ acquireCopyConnection: acquireSpy }))
    expect(acquireSpy.firstCall.args[0]).to.equal(knex)
  })

  it('should issue the COPY SQL when starting the stream', async () => {
    const copyFromSpy = sandbox.stub().returns(buildStreamHandles().stream)
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: copyFromSpy }))
    expect(copyFromSpy.firstCall.args[0]).to.equal(COPY_SQL)
  })

  it('should pass getDataDir() result as fsWalker root', async () => {
    const fsWalkerSpy = sandbox.stub().resolves()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(
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
    await FindSyncItemsViaCopy(
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

  it('should write formatted CSV rows through stream.write', async () => {
    const handles = buildStreamHandles()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(
      knex,
      noopLogger,
      buildHelpers({ copyFrom: () => handles.stream, formatSyncItemCsv: () => 'unique-row-marker\n' }),
    )
    expect(handles.writeSpy.firstCall.args[0]).to.contain('unique-row-marker')
  })

  it("should wait for 'drain' when stream.write returns false", async () => {
    const handles = buildStreamHandles()
    handles.writeSpy.onFirstCall().returns(false).returns(true)
    handles.writeSpy.onFirstCall().callsFake(() => {
      setImmediate(() => {
        handles.ee.emit('drain')
      })
      return false
    })
    const knex = StubToKnex(sandbox.stub())
    const result = await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream }))
    expect(result).to.deep.equal({ files: FILE_COUNT, dirs: DIR_COUNT })
  })

  it('should call stream.end exactly once after walking completes', async () => {
    const handles = buildStreamHandles()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream }))
    expect(handles.endSpy.callCount).to.equal(1)
  })

  it("should reject with the stream's emitted 'error'", async () => {
    const streamErr = new Error('stream blew up')
    const handles = buildStreamHandles({ endError: streamErr })
    const knex = StubToKnex(sandbox.stub())
    const err = await EventuallyRejects(
      FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream })),
    )
    expect(err).to.equal(streamErr)
  })

  it('should call stream.destroy with the emitted error', async () => {
    const streamErr = new Error('stream blew up')
    const handles = buildStreamHandles({ endError: streamErr })
    const knex = StubToKnex(sandbox.stub())
    await EventuallyRejects(FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ copyFrom: () => handles.stream })))
    expect(handles.destroySpy.firstCall.args[0]).to.equal(streamErr)
  })

  it('should release the connection even when the stream errors', async () => {
    const handles = buildStreamHandles({ endError: new Error('stream error') })
    const releaseSpy = sandbox.stub().resolves()
    const knex = StubToKnex(sandbox.stub())
    await EventuallyRejects(
      FindSyncItemsViaCopy(
        knex,
        noopLogger,
        buildHelpers({ copyFrom: () => handles.stream, releaseCopyConnection: releaseSpy }),
      ),
    )
    expect(releaseSpy.callCount).to.equal(1)
  })

  it('should pass knex and client to releaseCopyConnection', async () => {
    const client = Cast<PoolClient>({ query: (s: CopyStreamQuery) => s })
    const releaseSpy = sandbox.stub().resolves()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(
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
    expect(releaseSpy.firstCall.args).to.deep.equal([knex, client])
  })

  it('should accumulate files and dirs across multiple fsWalker iterations', async () => {
    const knex = StubToKnex(sandbox.stub())
    const result = await FindSyncItemsViaCopy(
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

  it('should log "Found N dirs (P pending) and F files" on the first iteration', async () => {
    const PENDING = 5
    const loggerSpy = sandbox.stub()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(
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
    await FindSyncItemsViaCopy(
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
    await FindSyncItemsViaCopy(
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

  it('should issue an additional stream.write per fsWalker iteration that pushes the buffer past DEFAULT_CHUNK_SIZE', async () => {
    const ITERATIONS = 3
    const handles = buildStreamHandles()
    const rows = Array.from({ length: DEFAULT_CHUNK_SIZE }, () => sampleRow)
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(
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
    expect(handles.writeSpy.callCount).to.equal(ITERATIONS)
  })
})
