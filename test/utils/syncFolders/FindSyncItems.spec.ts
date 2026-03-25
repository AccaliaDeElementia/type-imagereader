'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast } from '../../../testutils/TypeGuards'
import { createKnexChainFake } from '../../../testutils/Knex'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function FindSyncItems()', () => {
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let fsWalkerStub = Sinon.stub()
  let chunkSyncItemsForInsertStub = Sinon.stub()
  let {
    instance: knexInstanceStub,
    stub: knexFnStub,
    fake: knexFnFake,
  } = createKnexChainFake([] as const, ['del', 'insert'] as const, undefined)
  beforeEach(() => {
    ;({
      instance: knexInstanceStub,
      stub: knexFnStub,
      fake: knexFnFake,
    } = createKnexChainFake([] as const, ['del', 'insert'] as const, undefined))
    loggerStub = Sinon.stub()
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    fsWalkerStub = sandbox.stub(Imports, 'fsWalker').resolves()
    chunkSyncItemsForInsertStub = sandbox.stub(Functions, 'ChunkSyncItemsForInsert').returns({
      files: 0,
      dirs: 0,
      chunks: [],
    })
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
  it('should call knex twice when deleting and inserting syncItems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexFnStub.callCount).to.equal(2)
  })
  it('should call knex with syncitems on first call', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexFnStub.firstCall.calledWith('syncitems')).to.equal(true)
  })
  it('should call knex with syncitems on second call', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexFnStub.secondCall.calledWith('syncitems')).to.equal(true)
  })
  it('should call del once when deleting syncItems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.del.callCount).to.equal(1)
  })
  it('should delete all syncItems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.del.firstCall.args).to.deep.equal([])
  })
  it('should call insert once when inserting root folder', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.insert.callCount).to.equal(1)
  })
  it('should insert root folder into syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexInstanceStub.insert.firstCall.args).to.deep.equal([
      {
        folder: null,
        path: '/',
        isFile: false,
        sortKey: '',
      },
    ])
  })
  it('should call fsWalker once', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(fsWalkerStub.callCount).to.equal(1)
  })
  it('should walk filesystem starting at /data', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(fsWalkerStub.calledWith('/data')).to.equal(true)
  })
  it('should chunk items for insert into syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    await callback(items, 0)
    expect(chunkSyncItemsForInsertStub.calledWith(items)).to.equal(true)
  })
  it('should call insert once per chunk', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    const chunks = [{ a: 1 }, { b: 2 }, { c: 3 }]
    chunkSyncItemsForInsertStub.returns({ files: 3, dirs: 9, chunks })
    knexInstanceStub.insert.resetHistory()
    await callback(items, 0)
    expect(knexInstanceStub.insert.callCount).to.equal(3)
  })
  it('should insert first chunk into syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    const chunks = [{ a: 1 }, { b: 2 }, { c: 3 }]
    chunkSyncItemsForInsertStub.returns({ files: 3, dirs: 9, chunks })
    knexInstanceStub.insert.resetHistory()
    await callback(items, 0)
    expect(knexInstanceStub.insert.firstCall.args[0]).to.equal(chunks[0])
  })
  it('should insert second chunk into syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    const chunks = [{ a: 1 }, { b: 2 }, { c: 3 }]
    chunkSyncItemsForInsertStub.returns({ files: 3, dirs: 9, chunks })
    knexInstanceStub.insert.resetHistory()
    await callback(items, 0)
    expect(knexInstanceStub.insert.secondCall.args[0]).to.equal(chunks[1])
  })
  it('should insert third chunk into syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    const chunks = [{ a: 1 }, { b: 2 }, { c: 3 }]
    chunkSyncItemsForInsertStub.returns({ files: 3, dirs: 9, chunks })
    knexInstanceStub.insert.resetHistory()
    await callback(items, 0)
    expect(knexInstanceStub.insert.thirdCall.args[0]).to.equal(chunks[2])
  })
  it('should log status on first loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    chunkSyncItemsForInsertStub.returns({
      files: 3,
      dirs: 9,
      chunks: [],
    })
    await callback(items, 6)
    expect(loggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
  })
  it('should log twice by the 101st loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    loggerStub.resetHistory()
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    await Promise.all(
      Array(100)
        .fill(undefined)
        .map(async () => {
          await callback(items, 0)
        }),
    )
    chunkSyncItemsForInsertStub.returns({ files: 3, dirs: 9, chunks: [] })
    await callback(items, 6)
    expect(loggerStub.callCount).to.equal(2)
  })
  it('should log status on 101st loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    loggerStub.resetHistory()
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    await Promise.all(
      Array(100)
        .fill(undefined)
        .map(async () => {
          await callback(items, 0)
        }),
    )
    chunkSyncItemsForInsertStub.returns({ files: 3, dirs: 9, chunks: [] })
    await callback(items, 6)
    expect(loggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
  })
  const ChainableFileCounter = async (
    prev: Promise<void>,
    callback: (a: unknown, b: number) => Promise<void>,
    files: number,
  ): Promise<void> => {
    const items = [{ path: '/foo', isFile: false }]
    chunkSyncItemsForInsertStub.returns({
      files,
      dirs: 0,
      chunks: [],
    })
    await callback(items, 0)
    await prev
  }
  it('should count all files in loop', async () => {
    fsWalkerStub.callsFake(async (_, callback: (a: unknown, b: number) => Promise<void>) => {
      let chain = Promise.resolve()
      for (let i = 1; i <= 100; i += 1) {
        chain = ChainableFileCounter(chain, callback, i)
      }
      await chain
    })

    await Functions.FindSyncItems(knexFnFake)
    expect(loggerStub.calledWith('Found all 0 dirs and 5050 files')).to.equal(true)
  })

  const ChainableDirCounter = async (
    prev: Promise<void>,
    callback: (a: unknown, b: number) => Promise<void>,
    dirs: number,
  ): Promise<void> => {
    const items = [{ path: '/foo', isFile: false }]
    chunkSyncItemsForInsertStub.returns({
      files: 0,
      dirs,
      chunks: [],
    })
    await callback(items, 0)
    await prev
  }
  it('should count all dirs in loop', async () => {
    fsWalkerStub.callsFake(async (_, callback: (a: unknown, b: number) => Promise<void>) => {
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
    fsWalkerStub.callsFake(async (_, callback: (a: unknown, b: number) => Promise<void>) => {
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
