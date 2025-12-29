'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function FindSyncItems()', () => {
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let fsWalkerStub = Sinon.stub()
  let chunkSyncItemsForInsertStub = Sinon.stub()
  let knexInstanceStub = {
    del: Sinon.stub().resolves(),
    insert: Sinon.stub().resolves(),
  }
  let knexFnStub = Sinon.stub().returns(knexInstanceStub)
  let knexFnFake = StubToKnex(knexFnStub)
  beforeEach(() => {
    knexInstanceStub = {
      del: Sinon.stub().resolves(),
      insert: Sinon.stub().resolves(),
    }
    knexFnStub = Sinon.stub().returns(knexInstanceStub)
    knexFnFake = StubToKnex(knexFnStub)
    loggerStub = Sinon.stub()
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    fsWalkerStub = Sinon.stub(Imports, 'fsWalker').resolves()
    chunkSyncItemsForInsertStub = Sinon.stub(Functions, 'ChunkSyncItemsForInsert').returns({
      files: 0,
      dirs: 0,
      chunks: [],
    })
  })
  afterEach(() => {
    debugStub.restore()
    fsWalkerStub.restore()
    chunkSyncItemsForInsertStub.restore()
  })
  it('should create prefixed logger', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(debugStub.callCount).to.equal(1)
    const name = Cast(debugStub.firstCall.args[0], (o) => typeof o === 'string')
    expect(name)
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(Imports.logPrefix + ':'))
    expect(name)
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.endsWith(':findItems'))
  })
  it('should delete all syncItems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexFnStub.callCount).to.equal(2)
    expect(knexFnStub.firstCall.calledWith('syncitems')).to.equal(true)
    expect(knexFnStub.secondCall.calledWith('syncitems')).to.equal(true)
    expect(knexInstanceStub.del.callCount).to.equal(1)
    expect(knexInstanceStub.del.firstCall.args).to.deep.equal([])
  })
  it('should insert root folder into syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(knexFnStub.callCount).to.equal(2)
    expect(knexFnStub.firstCall.calledWith('syncitems')).to.equal(true)
    expect(knexFnStub.secondCall.calledWith('syncitems')).to.equal(true)
    expect(knexInstanceStub.insert.callCount).to.equal(1)
    expect(knexInstanceStub.insert.firstCall.args).to.deep.equal([
      {
        folder: null,
        path: '/',
        isFile: false,
        sortKey: '',
      },
    ])
  })
  it('should walk filesystem starting at /data', async () => {
    await Functions.FindSyncItems(knexFnFake)
    expect(fsWalkerStub.callCount).to.equal(1)
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
  it('should insert chunked items for insert into syncitems', async () => {
    await Functions.FindSyncItems(knexFnFake)
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    const chunks = [{ a: 1 }, { b: 2 }, { c: 3 }]
    chunkSyncItemsForInsertStub.returns({
      files: 3,
      dirs: 9,
      chunks,
    })
    knexInstanceStub.insert.resetHistory()
    await callback(items, 0)
    expect(knexInstanceStub.insert.callCount).to.equal(3)
    expect(knexInstanceStub.insert.firstCall.args[0]).to.equal(chunks[0])
    expect(knexInstanceStub.insert.secondCall.args[0]).to.equal(chunks[1])
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
  it('should log status on 101st loop', async () => {
    await Functions.FindSyncItems(knexFnFake)
    loggerStub.resetHistory()
    const callback = Cast(
      fsWalkerStub.firstCall.args[1],
      (o): o is (_: unknown, __: number) => Promise<void> => typeof o === 'function',
    )
    const items = [{ path: '/foo', isFile: false }]
    for (let i = 0; i < 100; i++) {
      await callback(items, 0)
    }
    chunkSyncItemsForInsertStub.returns({
      files: 3,
      dirs: 9,
      chunks: [],
    })
    await callback(items, 6)
    expect(loggerStub.callCount).to.equal(2)
    expect(loggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
  })
  it('should count all files in loop', async () => {
    fsWalkerStub.callsFake(async (_, callback: (a: unknown, b: number) => Promise<void>) => {
      const items = [{ path: '/foo', isFile: false }]
      for (let i = 1; i <= 100; i++) {
        chunkSyncItemsForInsertStub.returns({
          files: i,
          dirs: 0,
          chunks: [],
        })
        await callback(items, 0)
      }
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(loggerStub.calledWith('Found all 0 dirs and 5050 files')).to.equal(true)
  })
  it('should count all dirs in loop', async () => {
    fsWalkerStub.callsFake(async (_, callback: (a: unknown, b: number) => Promise<void>) => {
      const items = [{ path: '/foo', isFile: false }]
      for (let i = 1; i <= 100; i++) {
        chunkSyncItemsForInsertStub.returns({
          files: 0,
          dirs: i,
          chunks: [],
        })
        await callback(items, 0)
      }
    })
    await Functions.FindSyncItems(knexFnFake)
    expect(loggerStub.calledWith('Found all 5050 dirs and 0 files')).to.equal(true)
  })
  it('should return count of files', async () => {
    fsWalkerStub.callsFake(async (_, callback: (a: unknown, b: number) => Promise<void>) => {
      const items = [{ path: '/foo', isFile: false }]
      for (let i = 1; i <= 100; i++) {
        chunkSyncItemsForInsertStub.returns({
          files: i,
          dirs: 0,
          chunks: [],
        })
        await callback(items, 0)
      }
    })
    const result = await Functions.FindSyncItems(knexFnFake)
    expect(result).to.equal(5050)
  })
})
