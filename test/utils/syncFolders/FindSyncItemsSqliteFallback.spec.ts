'use sanity'

import { expect } from 'chai'
import { EventEmitter } from 'node:events'
import { Functions, Imports } from '#utils/syncfolders.js'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards.js'
import { createKnexChainFake } from '#testutils/Knex.js'
import type { Debugger } from 'debug'
import type { PoolClient } from 'pg'
import type { CopyStreamQuery } from 'pg-copy-streams'

const sandbox = Sinon.createSandbox()

type Callback = (items: Array<{ path: string; isFile: boolean }>, pending: number) => Promise<void>

interface StreamFake extends EventEmitter {
  write: Sinon.SinonStub
  end: Sinon.SinonStub
  destroy: Sinon.SinonStub
}

const makeStream = (): StreamFake => {
  const emitter = Cast<StreamFake>(new EventEmitter())
  emitter.write = sandbox.stub().returns(true)
  emitter.destroy = sandbox.stub()
  emitter.end = sandbox.stub().callsFake(() => {
    queueMicrotask(() => emitter.emit('finish'))
  })
  return emitter
}

describe('utils/syncfolders FindSyncItems() when client is not postgres (sqlite fallback)', () => {
  let loggerStub = sandbox.stub()
  let fsWalkerStub = sandbox.stub()
  let buildSyncItemRowsStub = sandbox.stub()
  let formatSyncItemCsvStub = sandbox.stub()
  let copyFromStub = sandbox.stub()
  let acquireStub = sandbox.stub()
  let releaseStub = sandbox.stub()
  let streamFake = makeStream()
  let pgClientStub = { query: sandbox.stub().returns(streamFake) }
  let { instance: knexInstanceStub, fake: knexFnFake } = createKnexChainFake(
    [] as const,
    ['truncate', 'insert'] as const,
    undefined,
  )

  beforeEach(() => {
    ;({ instance: knexInstanceStub, fake: knexFnFake } = createKnexChainFake(
      [] as const,
      ['truncate', 'insert'] as const,
      undefined,
    ))
    streamFake = makeStream()
    pgClientStub = { query: sandbox.stub().returns(streamFake) }
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    fsWalkerStub = sandbox.stub(Imports, 'fsWalker').resolves()
    buildSyncItemRowsStub = sandbox.stub(Functions, 'BuildSyncItemRows').returns({ files: 0, dirs: 0, rows: [] })
    formatSyncItemCsvStub = sandbox.stub(Functions, 'FormatSyncItemCsv').returns('csv-row\n')
    copyFromStub = sandbox.stub(Imports, 'copyFrom').returns(Cast<CopyStreamQuery>(sandbox.stub()))
    acquireStub = sandbox.stub(Imports, 'acquireCopyConnection').resolves(Cast<PoolClient>(pgClientStub))
    releaseStub = sandbox.stub(Imports, 'releaseCopyConnection').resolves()
    sandbox.stub(Imports, 'IsPostgres').returns(false)
  })
  afterEach(() => {
    sandbox.restore()
  })

  it('should not acquire a copy connection', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(acquireStub.called).to.equal(false)
  })

  it('should not release a copy connection', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(releaseStub.called).to.equal(false)
  })

  it('should not invoke copyFrom', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(copyFromStub.called).to.equal(false)
  })

  it('should not write to the COPY stream', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(streamFake.write.called).to.equal(false)
  })

  it('should still walk the filesystem', async () => {
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

  it('should not invoke FormatSyncItemCsv', async () => {
    const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
    buildSyncItemRowsStub.returns({ files: 1, dirs: 0, rows: [row] })
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      await callback([{ path: '/f.jpg', isFile: true }], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(formatSyncItemCsvStub.called).to.equal(false)
  })

  it('should insert each chunk via knex when rows are produced', async () => {
    const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
    buildSyncItemRowsStub.returns({ files: 1, dirs: 0, rows: [row] })
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      await callback([{ path: '/f.jpg', isFile: true }], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.insert.callCount).to.equal(2)
  })

  it('should pass chunk rows to insert', async () => {
    const row = { folder: '/', path: '/f.jpg', isFile: true, sortKey: 'f', pathHash: 'h' }
    buildSyncItemRowsStub.returns({ files: 1, dirs: 0, rows: [row] })
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      await callback([{ path: '/f.jpg', isFile: true }], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.insert.secondCall.args[0]).to.deep.equal([row])
  })

  it('should not insert when a callback yields zero rows', async () => {
    buildSyncItemRowsStub.returns({ files: 0, dirs: 0, rows: [] })
    fsWalkerStub.callsFake(async (_: string, callback: Callback) => {
      await callback([], 0)
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.insert.callCount).to.equal(1)
  })

  it('should log status on first loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast<Callback>(fsWalkerStub.firstCall.args[1])
    const items = [{ path: '/foo', isFile: false }]
    buildSyncItemRowsStub.returns({ files: 3, dirs: 9, rows: [] })
    await callback(items, 6)
    expect(loggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
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

  it('should count all files across the walk', async () => {
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
