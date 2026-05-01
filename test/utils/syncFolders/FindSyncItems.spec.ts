'use sanity'

import { expect } from 'chai'
import { EventEmitter } from 'node:events'
import { Functions, Imports } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'
import { createKnexChainFake } from '#testutils/Knex'
import type { Debugger } from 'debug'
import type { PoolClient } from 'pg'
import type { CopyStreamQuery } from 'pg-copy-streams'

const sandbox = Sinon.createSandbox()

const FLUSH_THRESHOLD = 5000

type Callback = (items: Array<{ path: string; isFile: boolean }>, pending: number) => Promise<void>

interface StreamFake extends EventEmitter {
  write: Sinon.SinonStub
  end: Sinon.SinonStub
  destroy: Sinon.SinonStub
}

const makeRows = (count: number): Array<{ path: string; marker: number }> =>
  Array.from({ length: count }, (_, i) => ({ path: `/p${i}`, marker: i }))

const makeStream = (): StreamFake => {
  const emitter = Cast<StreamFake>(new EventEmitter())
  emitter.write = sandbox.stub().returns(true)
  emitter.destroy = sandbox.stub()
  emitter.end = sandbox.stub().callsFake(() => {
    queueMicrotask(() => emitter.emit('finish'))
  })
  return emitter
}

const scheduleEmit = (target: EventEmitter, event: string, arg?: unknown): void => {
  queueMicrotask(() => {
    if (arg === undefined) target.emit(event)
    else target.emit(event, arg)
  })
}

describe('utils/syncfolders function FindSyncItems()', () => {
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let fsWalkerStub = sandbox.stub()
  let buildSyncItemRowsStub = sandbox.stub()
  let formatSyncItemCsvStub = sandbox.stub()
  let copyFromStub = sandbox.stub()
  let acquireStub = sandbox.stub()
  let releaseStub = sandbox.stub()
  let streamFake = makeStream()
  let pgClientStub = { query: sandbox.stub().returns(streamFake) }
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
    pgClientStub = { query: sandbox.stub().returns(streamFake) }
    loggerStub = sandbox.stub()
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    fsWalkerStub = sandbox.stub(Imports, 'fsWalker').resolves()
    buildSyncItemRowsStub = sandbox.stub(Functions, 'BuildSyncItemRows').returns({ files: 0, dirs: 0, rows: [] })
    formatSyncItemCsvStub = sandbox.stub(Functions, 'FormatSyncItemCsv').returns('csv-row\n')
    copyFromStub = sandbox.stub(Imports, 'copyFrom').returns(Cast<CopyStreamQuery>(sandbox.stub()))
    acquireStub = sandbox.stub(Imports, 'acquireCopyConnection').resolves(Cast<PoolClient>(pgClientStub))
    releaseStub = sandbox.stub(Imports, 'releaseCopyConnection').resolves()
    sandbox.stub(Imports, 'IsPostgres').returns(true)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when creating logger', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should create logger with prefixed name', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const name = Cast(debugStub.firstCall.args[0], (o) => typeof o === 'string')
    expect(name)
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(`${Imports.logPrefix}:`))
  })
  it('should create prefixed logger', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const name = Cast(debugStub.firstCall.args[0], (o) => typeof o === 'string')
    expect(name)
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.endsWith(':findItems'))
  })
  it('should truncate syncitems once to clear prior contents', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.truncate.callCount).to.equal(1)
  })
  it('should insert the root folder row once', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.insert.callCount).to.equal(1)
  })
  it('should insert the root folder row with the root sentinel in the folder column', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.insert.firstCall.args).to.deep.equal([
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
    await Functions.FindSyncItems(knexFnFake)
    const row = Cast<{ pathHash: string }>(knexInstanceStub.insert.firstCall.args[0])
    expect(row.pathHash.length).to.be.above(0)
  })
  it('should request syncitems on the first knex call', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexFnStub.firstCall.calledWith('syncitems')).to.equal(true)
  })
  it('should request syncitems on the second knex call', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexFnStub.secondCall.calledWith('syncitems')).to.equal(true)
  })
  it('should acquire a pool connection for the COPY stream', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(acquireStub.callCount).to.equal(1)
  })
  it('should release the pool connection after the COPY stream completes', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should release the connection that was acquired', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(releaseStub.firstCall.args[1]).to.equal(pgClientStub)
  })
  it('should release the pool connection even when the walker rejects', async () => {
    fsWalkerStub.rejects(new Error('walker failed'))
    await Functions.FindSyncItems(knexFnFake).catch(() => undefined)
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should destroy the stream if the walker rejects', async () => {
    fsWalkerStub.rejects(new Error('walker failed'))
    await Functions.FindSyncItems(knexFnFake).catch(() => undefined)
    expect(streamFake.destroy.callCount).to.equal(1)
  })
  it('should wrap a non-Error rejection in an Error when destroying the stream', async () => {
    fsWalkerStub.callsFake(
      //eslint-disable-next-line @typescript-eslint/promise-function-async, @typescript-eslint/prefer-promise-reject-errors -- deliberately testing the non-Error rejection branch
      () => Promise.reject('plain string failure'),
    )
    await Functions.FindSyncItems(knexFnFake).catch(() => undefined)
    expect(streamFake.destroy.firstCall.args[0]).to.be.an('Error')
  })
  it('should open exactly one COPY stream', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(copyFromStub.callCount).to.equal(1)
  })
  it('should issue a COPY FROM STDIN statement targeting syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(copyFromStub.firstCall.args[0]).to.equal(
      'COPY syncitems (folder, path, "isFile", "sortKey", "pathHash") FROM STDIN WITH (FORMAT csv)',
    )
  })
  it('should submit the COPY stream through the acquired pg client', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(pgClientStub.query.callCount).to.equal(1)
  })
  it('should end the COPY stream once the walk finishes', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(streamFake.end.callCount).to.equal(1)
  })
  it('should call fsWalker once', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(fsWalkerStub.callCount).to.equal(1)
  })
  it('should walk filesystem starting at /data', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(fsWalkerStub.calledWith('/data')).to.equal(true)
  })
  it('should walk filesystem starting at DATA_DIR when set', async () => {
    process.env.DATA_DIR = '/library/images'
    try {
      await Functions.FindSyncItems(knexFnFake)
      expect(fsWalkerStub.calledWith('/library/images')).to.equal(true)
    } finally {
      delete process.env.DATA_DIR
    }
  })
  it('should pass walker items through BuildSyncItemRows', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast<Callback>(fsWalkerStub.firstCall.args[1])
    const items = [{ path: '/foo', isFile: false }]
    await callback(items, 0)
    expect(buildSyncItemRowsStub.calledWith(items)).to.equal(true)
  })
  it('should format each row through FormatSyncItemCsv', async () => {
    const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
    buildSyncItemRowsStub.returns({ files: 1, dirs: 0, rows: [row] })
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      await callback([{ path: '/f.jpg', isFile: true }], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(formatSyncItemCsvStub.calledWith(row)).to.equal(true)
  })
  it('should write buffered rows to the stream when the threshold is reached', async () => {
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      buildSyncItemRowsStub.returns({ files: 0, dirs: 0, rows: makeRows(FLUSH_THRESHOLD) })
      await callback([], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    const writes = streamFake.write.getCalls().filter((c) => typeof c.args[0] === 'string' && c.args[0].length > 0)
    expect(writes).to.have.lengthOf.at.least(1)
  })
  it('should issue a single write call when only the tail flush produces a batch', async () => {
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      buildSyncItemRowsStub.returns({ files: 0, dirs: 0, rows: makeRows(500) })
      await callback([], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(streamFake.write.callCount).to.equal(1)
  })
  it('should flush the tail buffer via stream.write before ending', async () => {
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      buildSyncItemRowsStub.returns({ files: 0, dirs: 0, rows: makeRows(500) })
      await callback([], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(streamFake.write.getCalls()).to.have.lengthOf.at.least(1)
  })
  it('should wait for drain when stream.write signals backpressure', async () => {
    streamFake.write.onFirstCall().callsFake(() => {
      scheduleEmit(streamFake, 'drain')
      return false
    })
    streamFake.write.returns(true)
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      buildSyncItemRowsStub.returns({ files: 0, dirs: 0, rows: makeRows(FLUSH_THRESHOLD) })
      await callback([], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(streamFake.end.callCount).to.equal(1)
  })
  it('should reject when the stream emits an error before finish', async () => {
    const err = new Error('copy failed')
    streamFake.end.callsFake(() => {
      scheduleEmit(streamFake, 'error', err)
    })
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      buildSyncItemRowsStub.returns({ files: 0, dirs: 0, rows: [] })
      await callback([], 0)
    })
    let caught: unknown = null
    try {
      await Functions.FindSyncItems(knexFnFake)
    } catch (e) {
      caught = e
    }
    expect(caught).to.equal(err)
  })
  it('should log status on first loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast<Callback>(fsWalkerStub.firstCall.args[1])
    const items = [{ path: '/foo', isFile: false }]
    buildSyncItemRowsStub.returns({ files: 3, dirs: 9, rows: [] })
    await callback(items, 6)
    expect(loggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
  })
  it('should log twice by the 101st loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    loggerStub.resetHistory()
    const callback = Cast<Callback>(fsWalkerStub.firstCall.args[1])
    const items = [{ path: '/foo', isFile: false }]
    const invocations: Array<Promise<void>> = []
    for (let i = 0; i < 100; i += 1) invocations.push(callback(items, 0))
    await Promise.all(invocations)
    buildSyncItemRowsStub.returns({ files: 3, dirs: 9, rows: [] })
    await callback(items, 6)
    expect(loggerStub.callCount).to.equal(2)
  })
  it('should log status on 101st loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    loggerStub.resetHistory()
    const callback = Cast<Callback>(fsWalkerStub.firstCall.args[1])
    const items = [{ path: '/foo', isFile: false }]
    const invocations: Array<Promise<void>> = []
    for (let i = 0; i < 100; i += 1) invocations.push(callback(items, 0))
    await Promise.all(invocations)
    buildSyncItemRowsStub.returns({ files: 3, dirs: 9, rows: [] })
    await callback(items, 6)
    expect(loggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
  })
  const ChainableFileCounter = async (prev: Promise<void>, callback: Callback, files: number): Promise<void> => {
    const items = [{ path: '/foo', isFile: false }]
    buildSyncItemRowsStub.returns({ files, dirs: 0, rows: [] })
    await callback(items, 0)
    await prev
  }
  it('should count all files in loop', async () => {
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      let chain = Promise.resolve()
      for (let i = 1; i <= 100; i += 1) {
        chain = ChainableFileCounter(chain, callback, i)
      }
      await chain
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(loggerStub.calledWith('Found all 0 dirs and 5050 files')).to.equal(true)
  })
  const ChainableDirCounter = async (prev: Promise<void>, callback: Callback, dirs: number): Promise<void> => {
    const items = [{ path: '/foo', isFile: false }]
    buildSyncItemRowsStub.returns({ files: 0, dirs, rows: [] })
    await callback(items, 0)
    await prev
  }
  it('should count all dirs in loop', async () => {
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      let chain = Promise.resolve()
      for (let i = 1; i <= 100; i += 1) {
        chain = ChainableDirCounter(chain, callback, i)
      }
      await chain
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(loggerStub.calledWith('Found all 5050 dirs and 0 files')).to.equal(true)
  })
  it('should return count of files', async () => {
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      let chain = Promise.resolve()
      for (let i = 1; i <= 100; i += 1) {
        chain = ChainableFileCounter(chain, callback, i)
      }
      await chain
    })
    const result = await Functions.FindSyncItems(knexFnFake)
    expect(result).to.equal(5050)
  })
})
