'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Knex } from 'knex'
import persistence from '../../utils/persistance'

import synchronize, { Functions, Imports } from '../../utils/syncfolders'
import { Debugger } from 'debug'

@suite
export class SyncFoldersToSortKeyTests {
  @test
  'it should return key unchanged with no replacers' () {
    expect(Functions.ToSortKey('this key')).to.equal('this key')
  }

  @test
  'it should return key lowercased with no replacers' () {
    expect(Functions.ToSortKey('THIS KEY')).to.equal('this key')
  }

  @test
  'it should replace number words with numbers' () {
    Functions.padLength = 2
    expect(Functions.ToSortKey('FIFTY')).to.equal('50')
  }

  @test
  'it should pad numbers to length' () {
    Functions.padLength = 5
    expect(Functions.ToSortKey('50')).to.equal('00050')
  }

  @test
  'it should not shrink numbers longer than padding' () {
    Functions.padLength = 5
    expect(Functions.ToSortKey('0123456789')).to.equal('0123456789')
  }
}

@suite
export class SyncFoldersChunkTests {
  @test
  'it should not split chunk of smaller entries' () {
    expect(Functions.Chunk([0, 1, 2, 3, 4, 5], 10)).to.deep.equal([[0, 1, 2, 3, 4, 5]])
  }

  @test
  'it should split chunk of larger entries' () {
    expect(Functions.Chunk(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 5)).to
      .deep.equal([['a', 'b', 'c', 'd', 'e'], ['f', 'g']])
  }

  @test
  'it shhould handle empty input' () {
    expect(Functions.Chunk([], 10)).to.deep.equal([])
  }
}

@suite
export class SyncFoldersChunkSyncItemsForInsert {
  @test
  'it should count files in input' () {
    const items = [
      { path: '/foo', isFile: false },
      { path: '/bar', isFile: false },
      { path: '/baz', isFile: false },
      { path: '/foo.jpg', isFile: true },
      { path: '/bar.png', isFile: true },
      { path: '/baz.gif', isFile: true },
      { path: '/quux', isFile: false },
      { path: '/quuux', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items)
    expect(result.files).to.equal(3)
  }

  @test
  'it should count dirs in input' () {
    const items = [
      { path: '/foo', isFile: false },
      { path: '/bar', isFile: false },
      { path: '/baz', isFile: false },
      { path: '/foo.jpg', isFile: true },
      { path: '/bar.png', isFile: true },
      { path: '/baz.gif', isFile: true },
      { path: '/quux', isFile: false },
      { path: '/quuux', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items)
    expect(result.dirs).to.equal(5)
  }

  @test
  'it should set dirname for root folder item' () {
    const items = [
      { path: '/foo', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.folder).to.equal('/')
  }

  @test
  'it should set dirname for non root folder item' () {
    const items = [
      { path: '/foo/bar', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.folder).to.equal('/foo/')
  }

  @test
  'it should set path for root folder folder' () {
    const items = [
      { path: '/foo', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo/')
  }

  @test
  'it should set path for root folder file' () {
    const items = [
      { path: '/foo.bmp', isFile: true }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo.bmp')
  }

  @test
  'it should set path for non root folder folder' () {
    const items = [
      { path: '/foo/bar', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo/bar/')
  }

  @test
  'it should set path for non root folder file' () {
    const items = [
      { path: '/foo/bar.jpg', isFile: true }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo/bar.jpg')
  }

  @test
  'it should set isFile for file' () {
    const items = [
      { path: '/foo/bar.jpg', isFile: true }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.isFile).to.equal(true)
  }

  @test
  'it should set isFile for folder' () {
    const items = [
      { path: '/foo/bar', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.isFile).to.equal(false)
  }

  @test
  'it should set sort key' () {
    const items = [
      { path: '/foo/bar', isFile: false }
    ]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.sortKey).to.equal('bar')
  }
}

@suite
export class SyncFoldersFindSyncItemsTests {
  LoggerStub: Sinon.SinonStub = sinon.stub()
  DebugStub?: Sinon.SinonStub
  FsWalkerStub?: Sinon.SinonStub
  ChunkSyncItemsForInsertStub?: Sinon.SinonStub

  KnexInstanceStub = {
    del: sinon.stub().resolves(),
    insert: sinon.stub().resolves()
  }

  KnexFnStub = sinon.stub().returns(this.KnexInstanceStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  before () {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)
    this.FsWalkerStub = sinon.stub(Imports, 'fsWalker').resolves()
    this.ChunkSyncItemsForInsertStub = sinon.stub(Functions, 'ChunkSyncItemsForInsert').returns({
      files: 0,
      dirs: 0,
      chunks: []
    })
  }

  after () {
    this.DebugStub?.restore()
    this.FsWalkerStub?.restore()
    this.ChunkSyncItemsForInsertStub?.restore()
  }

  @test
  async 'it should create prefixed logger' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    expect(this.DebugStub?.callCount).to.equal(1)
    const name = this.DebugStub?.firstCall.args[0]
    expect(name).to.be.a('string')
      .and.satisfy((msg:string) => msg.startsWith(Imports.logPrefix + ':'))
    expect(name).to.be.a('string')
      .and.satisfy((msg:string) => msg.endsWith(':findItems'))
  }

  @test
  async 'it should delete all syncItems' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(2)
    expect(this.KnexFnStub.firstCall.calledWith('syncitems')).to.equal(true)
    expect(this.KnexFnStub.secondCall.calledWith('syncitems')).to.equal(true)
    expect(this.KnexInstanceStub.del.callCount).to.equal(1)
    expect(this.KnexInstanceStub.del.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should insert root folder into syncitems' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(2)
    expect(this.KnexFnStub.firstCall.calledWith('syncitems')).to.equal(true)
    expect(this.KnexFnStub.secondCall.calledWith('syncitems')).to.equal(true)
    expect(this.KnexInstanceStub.insert.callCount).to.equal(1)
    expect(this.KnexInstanceStub.insert.firstCall.args).to.deep.equal([{
      folder: null,
      path: '/',
      isFile: false,
      sortKey: ''
    }])
  }

  @test
  async 'it should walk filesystem starting at /data' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    expect(this.FsWalkerStub?.callCount).to.equal(1)
    expect(this.FsWalkerStub?.calledWith('/data')).to.equal(true)
  }

  @test
  async 'it should chunk items for insert into syncitems' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    const callback = this.FsWalkerStub?.firstCall.args[1]
    const items = [{ path: '/foo', isFile: false }]
    await callback(items, 0)
    expect(this.ChunkSyncItemsForInsertStub?.calledWith(items)).to.equal(true)
  }

  @test
  async 'it should insert chunked items for insert into syncitems' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    const callback = this.FsWalkerStub?.firstCall.args[1]
    const items = [{ path: '/foo', isFile: false }]
    const chunks = [{ a: 1 }, { b: 2 }, { c: 3 }]
    this.ChunkSyncItemsForInsertStub?.returns({
      files: 3,
      dirs: 9,
      chunks
    })
    this.KnexInstanceStub.insert.resetHistory()
    await callback(items, 0)
    expect(this.KnexInstanceStub.insert.callCount).to.equal(3)
    expect(this.KnexInstanceStub.insert.firstCall.args[0]).to.equal(chunks[0])
    expect(this.KnexInstanceStub.insert.secondCall.args[0]).to.equal(chunks[1])
    expect(this.KnexInstanceStub.insert.thirdCall.args[0]).to.equal(chunks[2])
  }

  @test
  async 'it should log status on first loop' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    const callback = this.FsWalkerStub?.firstCall.args[1]
    const items = [{ path: '/foo', isFile: false }]
    this.ChunkSyncItemsForInsertStub?.returns({
      files: 3,
      dirs: 9,
      chunks: []
    })
    await callback(items, 6)
    expect(this.LoggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
  }

  @test
  async 'it should log status on 101st loop' () {
    await Functions.FindSyncItems(this.KnexFnFake)
    this.LoggerStub.resetHistory()
    const callback = this.FsWalkerStub?.firstCall.args[1]
    const items = [{ path: '/foo', isFile: false }]
    for (let i = 0; i < 100; i++) {
      await callback(items, 0)
    }
    this.ChunkSyncItemsForInsertStub?.returns({
      files: 3,
      dirs: 9,
      chunks: []
    })
    await callback(items, 6)
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.calledWith('Found 9 dirs (6 pending) and 3 files')).to.equal(true)
  }

  @test
  async 'it should count all files in loop' () {
    this.FsWalkerStub?.callsFake(async (_, callback) => {
      const items = [{ path: '/foo', isFile: false }]
      for (let i = 1; i <= 100; i++) {
        this.ChunkSyncItemsForInsertStub?.returns({
          files: i,
          dirs: 0,
          chunks: []
        })
        await callback(items, 0)
      }
    })
    await Functions.FindSyncItems(this.KnexFnFake)
    expect(this.LoggerStub.calledWith('Found all 0 dirs and 5050 files')).to.equal(true)
  }

  @test
  async 'it should count all dirs in loop' () {
    this.FsWalkerStub?.callsFake(async (_, callback) => {
      const items = [{ path: '/foo', isFile: false }]
      for (let i = 1; i <= 100; i++) {
        this.ChunkSyncItemsForInsertStub?.returns({
          files: 0,
          dirs: i,
          chunks: []
        })
        await callback(items, 0)
      }
    })
    await Functions.FindSyncItems(this.KnexFnFake)
    expect(this.LoggerStub.calledWith('Found all 5050 dirs and 0 files')).to.equal(true)
  }

  @test
  async 'it should return count of files' () {
    this.FsWalkerStub?.callsFake(async (_, callback) => {
      const items = [{ path: '/foo', isFile: false }]
      for (let i = 1; i <= 100; i++) {
        this.ChunkSyncItemsForInsertStub?.returns({
          files: i,
          dirs: 0,
          chunks: []
        })
        await callback(items, 0)
      }
    })
    const result = await Functions.FindSyncItems(this.KnexFnFake)
    expect(result).to.equal(5050)
  }
}

@suite
export class SyncFoldersSyncNewPicturesTests {
  LoggerStub: Sinon.SinonStub = sinon.stub()
  LoggerFake = this.LoggerStub as unknown as Debugger

  KnexInnerInstanceStub = {
    select: sinon.stub().returnsThis(),
    from: sinon.stub().returnsThis(),
    leftJoin: sinon.stub().returnsThis(),
    andWhere: sinon.stub().returnsThis()
  }

  KnexInstanceStub = {
    raw: sinon.stub(),
    from: sinon.stub().returnsThis(),
    insert: sinon.stub().resolves([0])
  }

  KnexFnFake = this.KnexInstanceStub as unknown as Knex

  @test
  async 'it should select raw from pictures table' () {
    const rawQuery = { a: 'flapjacks for breakfast' }
    this.KnexInstanceStub.raw.returns(rawQuery)
    await Functions.SyncNewPictures(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexInstanceStub.raw.callCount).to.equal(1)
    expect(this.KnexInstanceStub.raw.firstCall.args[0]).to.equal('?? (??, ??, ??)')
    expect(this.KnexInstanceStub.raw.firstCall.args[1]).to.deep.equal(['pictures', 'folder', 'path', 'sortKey'])
    expect(this.KnexInstanceStub.from.calledAfter(this.KnexInstanceStub.raw)).to.equal(true)
    expect(this.KnexInstanceStub.from.calledWith(rawQuery)).to.equal(true)
  }

  @test
  async 'it should log results with sqlite return style' () {
    this.KnexInstanceStub.insert.resolves([65536])
    await Functions.SyncNewPictures(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Added 65536 new pictures')
  }

  @test
  async 'it should log results with postgresql return style' () {
    this.KnexInstanceStub.insert.resolves({ rowCount: 256 })
    await Functions.SyncNewPictures(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Added 256 new pictures')
  }

  @test
  async 'it should construct nested select within insert call' () {
    await Functions.SyncNewPictures(this.LoggerFake, this.KnexFnFake)
    const fn = this.KnexInstanceStub.insert.firstCall.args[0]
    fn.apply(this.KnexInnerInstanceStub)
    expect(this.KnexInnerInstanceStub.select.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.select.firstCall.args[0]).to.deep.equal(
      ['syncitems.folder', 'syncitems.path', 'syncitems.sortKey']
    )
    expect(this.KnexInnerInstanceStub.select.calledBefore(this.KnexInnerInstanceStub.from)).to.equal(true)
    expect(this.KnexInnerInstanceStub.from.calledWith('syncitems')).to.equal(true)
    expect(this.KnexInnerInstanceStub.from.calledBefore(this.KnexInnerInstanceStub.leftJoin))
    expect(this.KnexInnerInstanceStub.leftJoin.firstCall.args).to.deep.equal(
      ['pictures', 'pictures.path', 'syncitems.path']
    )
    expect(this.KnexInnerInstanceStub.leftJoin.calledBefore(this.KnexInnerInstanceStub.andWhere))
    expect(this.KnexInnerInstanceStub.andWhere.firstCall.args[0]).to.deep.equal({
      'syncitems.isFile': true,
      'pictures.path': null
    })
  }
}

@suite
export class SyncFoldersSyncRemovedPicturesTests {
  LoggerStub: Sinon.SinonStub = sinon.stub()
  LoggerFake = this.LoggerStub as unknown as Debugger

  KnexInnerInstanceStub = {
    select: sinon.stub().returnsThis(),
    from: sinon.stub().returnsThis(),
    whereRaw: sinon.stub().returnsThis()
  }

  KnexInstanceStub = {
    whereNotExists: sinon.stub().returnsThis(),
    delete: sinon.stub().resolves(0)
  }

  KnexFnStub = sinon.stub().returns(this.KnexInstanceStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  @test
  async 'it should remove records from pictures table' () {
    await Functions.SyncRemovedPictures(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.calledWith('pictures')).to.equal(true)
    expect(this.KnexFnStub.calledImmediatelyBefore(this.KnexInstanceStub.whereNotExists)).to.equal(true)
    expect(this.KnexInstanceStub.whereNotExists.calledImmediatelyBefore(this.KnexInstanceStub.delete))
    expect(this.KnexInstanceStub.delete.callCount).to.equal(1)
    expect(this.KnexInstanceStub.delete.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should log removed records counts' () {
    this.KnexInstanceStub.delete.returns(1023)
    await Functions.SyncRemovedPictures(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Removed 1023 missing pictures')
  }

  @test
  async 'it should construct inner query to detect removed images' () {
    await Functions.SyncRemovedPictures(this.LoggerFake, this.KnexFnFake)
    const fn = this.KnexInstanceStub.whereNotExists.firstCall.args[0]
    fn.apply(this.KnexInnerInstanceStub)
    expect(this.KnexInnerInstanceStub.select.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
    expect(this.KnexInnerInstanceStub.select.calledImmediatelyBefore(this.KnexInnerInstanceStub.from)).to.equal(true)
    expect(this.KnexInnerInstanceStub.from.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.from.firstCall.args).to.deep.equal(['syncitems'])
    expect(this.KnexInnerInstanceStub.from.calledImmediatelyBefore(this.KnexInnerInstanceStub.whereRaw)).to.equal(true)
    expect(this.KnexInnerInstanceStub.whereRaw.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['syncitems.path = pictures.path'])
  }
}

@suite
export class SyncFoldersSyncRemovedBookmarksTests {
  LoggerStub: Sinon.SinonStub = sinon.stub()
  LoggerFake = this.LoggerStub as unknown as Debugger

  KnexInnerInstanceStub = {
    select: sinon.stub().returnsThis(),
    from: sinon.stub().returnsThis(),
    whereRaw: sinon.stub().returnsThis()
  }

  KnexInstanceStub = {
    whereNotExists: sinon.stub().returnsThis(),
    delete: sinon.stub().resolves(0)
  }

  KnexFnStub = sinon.stub().returns(this.KnexInstanceStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  @test
  async 'it should remove records from pictures table' () {
    await Functions.SyncRemovedBookmarks(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.calledWith('bookmarks')).to.equal(true)
    expect(this.KnexFnStub.calledImmediatelyBefore(this.KnexInstanceStub.whereNotExists)).to.equal(true)
    expect(this.KnexInstanceStub.whereNotExists.calledImmediatelyBefore(this.KnexInstanceStub.delete))
    expect(this.KnexInstanceStub.delete.callCount).to.equal(1)
    expect(this.KnexInstanceStub.delete.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should log removed records counts' () {
    this.KnexInstanceStub.delete.returns(42)
    await Functions.SyncRemovedBookmarks(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Removed 42 missing bookmarks')
  }

  @test
  async 'it should construct inner query to detect removed images' () {
    await Functions.SyncRemovedBookmarks(this.LoggerFake, this.KnexFnFake)
    const fn = this.KnexInstanceStub.whereNotExists.firstCall.args[0]
    fn.apply(this.KnexInnerInstanceStub)
    expect(this.KnexInnerInstanceStub.select.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
    expect(this.KnexInnerInstanceStub.select.calledImmediatelyBefore(this.KnexInnerInstanceStub.from)).to.equal(true)
    expect(this.KnexInnerInstanceStub.from.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.from.firstCall.args).to.deep.equal(['pictures'])
    expect(this.KnexInnerInstanceStub.from.calledImmediatelyBefore(this.KnexInnerInstanceStub.whereRaw)).to.equal(true)
    expect(this.KnexInnerInstanceStub.whereRaw.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['pictures.path = bookmarks.path'])
  }
}

@suite
export class SyncFoldersSyncAllPicturesTests {
  SyncNewPicturesStub?: Sinon.SinonStub
  SyncRemovedPicturesStub?: Sinon.SinonStub
  SyncRemovedBookmarksStub?: Sinon.SinonStub
  LoggerStub = sinon.stub()
  DebugStub?: Sinon.SinonStub

  KnexFake = { id: Math.random() } as unknown as Knex

  before () {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)
    this.SyncNewPicturesStub = sinon.stub(Functions, 'SyncNewPictures').resolves()
    this.SyncRemovedPicturesStub = sinon.stub(Functions, 'SyncRemovedPictures').resolves()
    this.SyncRemovedBookmarksStub = sinon.stub(Functions, 'SyncRemovedBookmarks').resolves()
  }

  after () {
    this.DebugStub?.restore()
    this.SyncNewPicturesStub?.restore()
    this.SyncRemovedPicturesStub?.restore()
    this.SyncRemovedBookmarksStub?.restore()
  }

  @test
  async 'it should construct prefixed logger' () {
    await Functions.SyncAllPictures(this.KnexFake)
    expect(this.DebugStub?.callCount).to.equal(1)
    expect(this.DebugStub?.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg:string) => msg.startsWith(Imports.logPrefix + ':'),
        'Logger should be prefixed')
      .and.satisfy((msg:string) => msg.endsWith(':syncPictures'),
        'Logger should be suffixed with `syncPictures`')
  }

  @test
  async 'it should call SyncNewPictures' () {
    await Functions.SyncAllPictures(this.KnexFake)
    expect(this.SyncNewPicturesStub?.callCount).to.equal(1)
    expect(this.SyncNewPicturesStub?.firstCall.args).to.deep.equal([this.LoggerStub, this.KnexFake])
  }

  @test
  async 'it should call SyncRemovedPictures' () {
    await Functions.SyncAllPictures(this.KnexFake)
    expect(this.SyncRemovedPicturesStub?.callCount).to.equal(1)
    expect(this.SyncRemovedPicturesStub?.firstCall.args).to.deep.equal([this.LoggerStub, this.KnexFake])
  }

  @test
  async 'it should call SyncRemovedBookmarks' () {
    await Functions.SyncAllPictures(this.KnexFake)
    expect(this.SyncRemovedBookmarksStub?.callCount).to.equal(1)
    expect(this.SyncRemovedBookmarksStub?.firstCall.args).to.deep.equal([this.LoggerStub, this.KnexFake])
  }
}

@suite
export class SyncFoldersSyncNewFoldersTests {
  LoggerStub: Sinon.SinonStub = sinon.stub()
  LoggerFake = this.LoggerStub as unknown as Debugger

  KnexInnerInstanceStub = {
    select: sinon.stub().returnsThis(),
    from: sinon.stub().returnsThis(),
    leftJoin: sinon.stub().returnsThis(),
    andWhere: sinon.stub().returnsThis()
  }

  KnexInstanceStub = {
    raw: sinon.stub(),
    from: sinon.stub().returnsThis(),
    insert: sinon.stub().resolves([0])
  }

  KnexFnFake = this.KnexInstanceStub as unknown as Knex

  @test
  async 'it should select raw from folders table' () {
    const rawQuery = { a: 'flapjacks for breakfast' }
    this.KnexInstanceStub.raw.returns(rawQuery)
    await Functions.SyncNewFolders(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexInstanceStub.raw.callCount).to.equal(1)
    expect(this.KnexInstanceStub.raw.firstCall.args[0]).to.equal('?? (??, ??, ??)')
    expect(this.KnexInstanceStub.raw.firstCall.args[1]).to.deep.equal(['folders', 'folder', 'path', 'sortKey'])
    expect(this.KnexInstanceStub.from.calledAfter(this.KnexInstanceStub.raw)).to.equal(true)
    expect(this.KnexInstanceStub.from.calledWith(rawQuery)).to.equal(true)
  }

  @test
  async 'it should log results with sqlite return style' () {
    this.KnexInstanceStub.insert.resolves([65536])
    await Functions.SyncNewFolders(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Added 65536 new folders')
  }

  @test
  async 'it should log results with postgresql return style' () {
    this.KnexInstanceStub.insert.resolves({ rowCount: 256 })
    await Functions.SyncNewFolders(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Added 256 new folders')
  }

  @test
  async 'it should construct nested select within insert call' () {
    await Functions.SyncNewFolders(this.LoggerFake, this.KnexFnFake)
    const fn = this.KnexInstanceStub.insert.firstCall.args[0]
    fn.apply(this.KnexInnerInstanceStub)
    expect(this.KnexInnerInstanceStub.select.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.select.firstCall.args[0]).to.deep.equal(
      ['syncitems.folder', 'syncitems.path', 'syncitems.sortKey']
    )
    expect(this.KnexInnerInstanceStub.select.calledBefore(this.KnexInnerInstanceStub.from)).to.equal(true)
    expect(this.KnexInnerInstanceStub.from.calledWith('syncitems')).to.equal(true)
    expect(this.KnexInnerInstanceStub.from.calledBefore(this.KnexInnerInstanceStub.leftJoin))
    expect(this.KnexInnerInstanceStub.leftJoin.firstCall.args).to.deep.equal(
      ['folders', 'folders.path', 'syncitems.path']
    )
    expect(this.KnexInnerInstanceStub.leftJoin.calledBefore(this.KnexInnerInstanceStub.andWhere))
    expect(this.KnexInnerInstanceStub.andWhere.firstCall.args[0]).to.deep.equal({
      'syncitems.isFile': false,
      'folders.path': null
    })
  }
}

@suite
export class SyncFoldersSyncRemovedFoldersTests {
  LoggerStub: Sinon.SinonStub = sinon.stub()
  LoggerFake = this.LoggerStub as unknown as Debugger

  KnexInnerInstanceStub = {
    select: sinon.stub().returnsThis(),
    from: sinon.stub().returnsThis(),
    whereRaw: sinon.stub().returnsThis()
  }

  KnexInstanceStub = {
    whereNotExists: sinon.stub().returnsThis(),
    delete: sinon.stub().resolves(0)
  }

  KnexFnStub = sinon.stub().returns(this.KnexInstanceStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  @test
  async 'it should remove records from folders table' () {
    await Functions.SyncRemovedFolders(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.calledWith('folders')).to.equal(true)
    expect(this.KnexFnStub.calledImmediatelyBefore(this.KnexInstanceStub.whereNotExists)).to.equal(true)
    expect(this.KnexInstanceStub.whereNotExists.calledImmediatelyBefore(this.KnexInstanceStub.delete))
    expect(this.KnexInstanceStub.delete.callCount).to.equal(1)
    expect(this.KnexInstanceStub.delete.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should log removed records counts' () {
    this.KnexInstanceStub.delete.returns(1023)
    await Functions.SyncRemovedFolders(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Removed 1023 missing folders')
  }

  @test
  async 'it should construct inner query to detect removed folders' () {
    await Functions.SyncRemovedFolders(this.LoggerFake, this.KnexFnFake)
    const fn = this.KnexInstanceStub.whereNotExists.firstCall.args[0]
    fn.apply(this.KnexInnerInstanceStub)
    expect(this.KnexInnerInstanceStub.select.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
    expect(this.KnexInnerInstanceStub.select.calledImmediatelyBefore(this.KnexInnerInstanceStub.from)).to.equal(true)
    expect(this.KnexInnerInstanceStub.from.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.from.firstCall.args).to.deep.equal(['syncitems'])
    expect(this.KnexInnerInstanceStub.from.calledImmediatelyBefore(this.KnexInnerInstanceStub.whereRaw)).to.equal(true)
    expect(this.KnexInnerInstanceStub.whereRaw.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['syncitems.path = folders.path'])
  }
}

@suite
export class SyncFoldersSyncMissingCoverImagesTests {
  LoggerStub: Sinon.SinonStub = sinon.stub()
  LoggerFake = this.LoggerStub as unknown as Debugger

  KnexInnerInstanceStub = {
    select: sinon.stub().returnsThis(),
    from: sinon.stub().returnsThis(),
    whereRaw: sinon.stub().returnsThis()
  }

  KnexInstanceStub = {
    whereNotExists: sinon.stub().returnsThis(),
    whereRaw: sinon.stub().returnsThis(),
    update: sinon.stub().resolves(0)
  }

  KnexFnStub = sinon.stub().returns(this.KnexInstanceStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  @test
  async 'it should operate on folders table' () {
    await Functions.SyncMissingCoverImages(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.firstCall.args).to.deep.equal(['folders'])
  }

  @test
  async 'it should issue an update clearing current image for selected rows' () {
    await Functions.SyncMissingCoverImages(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexInstanceStub.update.callCount).to.equal(1)
    expect(this.KnexInstanceStub.update.firstCall.args).to.deep.equal([{ current: '' }])
  }

  @test
  async 'it should only select folders where cover image doesn\'t exist in the pictures table' () {
    await Functions.SyncMissingCoverImages(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexInstanceStub.whereNotExists.callCount).to.equal(1)
    const fn = this.KnexInstanceStub.whereNotExists.firstCall.args[0]
    fn.apply(this.KnexInnerInstanceStub)
    expect(this.KnexInnerInstanceStub.select.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
    expect(this.KnexInnerInstanceStub.from.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.from.firstCall.args).to.deep.equal(['pictures'])
    expect(this.KnexInnerInstanceStub.whereRaw.callCount).to.equal(1)
    expect(this.KnexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['pictures.path = folders.current'])
  }

  @test
  async 'it should only operate on folders that have a cover image set' () {
    await Functions.SyncMissingCoverImages(this.LoggerFake, this.KnexFnFake)
    expect(this.KnexInstanceStub.whereRaw.callCount).to.equal(1)
    expect(this.KnexInstanceStub.whereRaw.firstCall.args).to.deep.equal(['folders.current <> \'\''])
  }

  @test
  async 'it should log number of updated records' () {
    this.KnexInstanceStub.update.resolves(99)
    await Functions.SyncMissingCoverImages(this.LoggerFake, this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Removed 99 missing cover images'])
  }
}

@suite
export class SyncFoldersSyncAllFoldersTests {
  SyncNewFoldersStub?: Sinon.SinonStub
  SyncRemovedFoldersStub?: Sinon.SinonStub
  SyncMissingCoverImagesStub?: Sinon.SinonStub
  LoggerStub = sinon.stub()
  DebugStub?: Sinon.SinonStub

  KnexFake = { id: Math.random() } as unknown as Knex

  before () {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)
    this.SyncNewFoldersStub = sinon.stub(Functions, 'SyncNewFolders').resolves()
    this.SyncRemovedFoldersStub = sinon.stub(Functions, 'SyncRemovedFolders').resolves()
    this.SyncMissingCoverImagesStub = sinon.stub(Functions, 'SyncMissingCoverImages').resolves()
  }

  after () {
    this.DebugStub?.restore()
    this.SyncNewFoldersStub?.restore()
    this.SyncRemovedFoldersStub?.restore()
    this.SyncMissingCoverImagesStub?.restore()
  }

  @test
  async 'it should construct prefixed logger' () {
    await Functions.SyncAllFolders(this.KnexFake)
    expect(this.DebugStub?.callCount).to.equal(1)
    expect(this.DebugStub?.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg:string) => msg.startsWith(Imports.logPrefix + ':'),
        'Logger should be prefixed')
      .and.satisfy((msg:string) => msg.endsWith(':syncFolders'),
        'Logger should be suffixed with `syncPictures`')
  }

  @test
  async 'it should call SyncNewPictures' () {
    await Functions.SyncAllFolders(this.KnexFake)
    expect(this.SyncNewFoldersStub?.callCount).to.equal(1)
    expect(this.SyncNewFoldersStub?.firstCall.args).to.deep.equal([this.LoggerStub, this.KnexFake])
  }

  @test
  async 'it should call SyncRemovedPictures' () {
    await Functions.SyncAllFolders(this.KnexFake)
    expect(this.SyncRemovedFoldersStub?.callCount).to.equal(1)
    expect(this.SyncRemovedFoldersStub?.firstCall.args).to.deep.equal([this.LoggerStub, this.KnexFake])
  }

  @test
  async 'it should call SyncRemovedBookmarks' () {
    await Functions.SyncAllFolders(this.KnexFake)
    expect(this.SyncMissingCoverImagesStub?.callCount).to.equal(1)
    expect(this.SyncMissingCoverImagesStub?.firstCall.args).to.deep.equal([this.LoggerStub, this.KnexFake])
  }
}

@suite
export class SyncFoldersGetAllFolderInfosTests {
  KnexInstanceStub = {
    select: sinon.stub().resolves([])
  }

  KnexFnStub = sinon.stub().returns(this.KnexInstanceStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  @test
  async 'it should select all paths from folders table' () {
    await Functions.GetAllFolderInfos(this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.firstCall.args).to.deep.equal(['folders'])
    expect(this.KnexInstanceStub.select.callCount).to.equal(1)
    expect(this.KnexInstanceStub.select.firstCall.args).to.deep.equal(['path'])
  }

  @test
  async 'it should resolve to empty array for blank db' () {
    const result = await Functions.GetAllFolderInfos(this.KnexFnFake)
    expect(result).to.deep.equal({})
  }

  @test
  async 'it should add path to result for each folder' () {
    const folders = ['/', '/foo', '/foo/bar', '/baz', '/quux/is/beast']
    this.KnexInstanceStub.select.resolves(folders.map(path => {
      return { path }
    }))
    const results = await Functions.GetAllFolderInfos(this.KnexFnFake)
    for (const folder of folders) {
      expect(results).to.have.any.keys(folder)
      expect(results[folder]).to.deep.equal({
        path: folder,
        totalCount: 0,
        seenCount: 0
      })
    }
  }
}

@suite
export class SyncFoldersGetFolderInfosWithPictures {
  KnexStub = {
    select: sinon.stub().returnsThis(),
    count: sinon.stub().returnsThis(),
    sum: sinon.stub().returnsThis(),
    groupBy: sinon.stub().resolves([])
  }

  KnexFnStub: Sinon.SinonStub & { raw?: Sinon.SinonStub } = sinon.stub().returns(this.KnexStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  before () {
    this.KnexFnStub.raw = sinon.stub()
  }

  @test
  async 'it should handle empty results gracefully' () {
    const result = await Functions.GetFolderInfosWithPictures(this.KnexFnFake)
    expect(result).to.deep.equal([])
  }

  @test
  async 'it should start knex query from pictures' () {
    await Functions.GetFolderInfosWithPictures(this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.firstCall.args).to.deep.equal(['pictures'])
  }

  @test
  async 'it should select folder field from pictures' () {
    await Functions.GetFolderInfosWithPictures(this.KnexFnFake)
    expect(this.KnexStub.select.callCount).to.equal(1)
    expect(this.KnexStub.select.firstCall.args).to.deep.equal(['folder as path'])
  }

  @test
  async 'it should count star from pictures' () {
    await Functions.GetFolderInfosWithPictures(this.KnexFnFake)
    expect(this.KnexStub.count.callCount).to.equal(1)
    expect(this.KnexStub.count.firstCall.args).to.deep.equal(['* as totalCount'])
  }

  @test
  async 'it should sum of read from pictures' () {
    const rawQuery = { random: Math.random() }
    this.KnexFnStub.raw?.returns(rawQuery)
    await Functions.GetFolderInfosWithPictures(this.KnexFnFake)
    expect(this.KnexFnStub.raw?.callCount).to.equal(1)
    expect(this.KnexFnStub.raw?.firstCall.args).to.deep.equal(['CASE WHEN seen THEN 1 ELSE 0 END'])
    expect(this.KnexStub.sum.callCount).to.equal(1)
    expect(this.KnexStub.sum.firstCall.args).to.deep.equal([{ seenCount: rawQuery }])
  }
}

@suite
export class SyncFoldersCalculateFolderInfosTests {
  @test
  'it should handle empty input map gracefully' () {
    expect(Functions.CalculateFolderInfos({}, [])).to.deep.equal([])
  }

  @test
  'it should handle empty input map with input list gracefully' () {
    const folders = [{ path: '/', totalCount: 5, seenCount: 0 }]
    expect(Functions.CalculateFolderInfos({}, folders)).to.deep.equal([{ path: '/', totalCount: 5, seenCount: 0 }])
  }

  @test
  'it should handle empty input list gracefully' () {
    const allFolders = {
      '/': { path: '/', totalCount: 5, seenCount: 0 }
    }
    expect(Functions.CalculateFolderInfos(allFolders, [])).to.deep.equal([{ path: '/', totalCount: 5, seenCount: 0 }])
  }

  @test
  'it should calculate correctly' () {
    const allFolders = {
      '/': { path: '/', totalCount: 0, seenCount: 0 },
      '/foo/': { path: '/foo/', totalCount: 0, seenCount: 0 },
      '/foo/bar/': { path: '/foo/bar/', totalCount: 0, seenCount: 0 },
      '/baz/': { path: '/baz/', totalCount: 0, seenCount: 0 },
      '/quux/': { path: '/quux/', totalCount: 0, seenCount: 0 },
      '/quux/is/': { path: '/quux/is/', totalCount: 0, seenCount: 0 }
    }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/', totalCount: 10, seenCount: 1 },
      { path: '/foo/bar/', totalCount: 20, seenCount: 2 },
      { path: '/baz/', totalCount: 30, seenCount: 3 },
      { path: '/quux/', totalCount: 40, seenCount: 4 },
      { path: '/quux/is/', totalCount: 50, seenCount: 5 }
    ]
    const results = Functions.CalculateFolderInfos(allFolders, folders)
    expect(results).to.have.lengthOf(6)
    expect(results).to.deep.include({ path: '/quux/is/', totalCount: 50, seenCount: 5 })
    expect(results).to.deep.include({ path: '/quux/', totalCount: 90, seenCount: 9 })
    expect(results).to.deep.include({ path: '/baz/', totalCount: 30, seenCount: 3 })
    expect(results).to.deep.include({ path: '/foo/bar/', totalCount: 20, seenCount: 2 })
    expect(results).to.deep.include({ path: '/foo/', totalCount: 30, seenCount: 3 })
    expect(results).to.deep.include({ path: '/', totalCount: 151, seenCount: 16 })
  }

  @test
  'it should add missing parent folders correctly' () {
    const allFolders = {
      '/': { path: '/', totalCount: 0, seenCount: 0 }
    }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 }
    ]
    const results = Functions.CalculateFolderInfos(allFolders, folders)
    expect(results).to.have.lengthOf(4)
    expect(results).to.deep.include({ path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 })
    expect(results).to.deep.include({ path: '/foo/bar/', totalCount: 20, seenCount: 2 })
    expect(results).to.deep.include({ path: '/foo/', totalCount: 20, seenCount: 2 })
    expect(results).to.deep.include({ path: '/', totalCount: 21, seenCount: 3 })
  }
}

@suite
export class SyncFoldersUpdateFolderPictureCountsTests {
  GetFolderInfosWithPicturesStub?: Sinon.SinonStub
  GetAllFolderInfosStub?: Sinon.SinonStub
  CalculateFolderInfosStub?: Sinon.SinonStub
  ChunkStub?: Sinon.SinonStub
  LoggerStub = sinon.stub()
  DebugStub?: Sinon.SinonStub

  KnexStub = {
    insert: Sinon.stub().returnsThis(),
    onConflict: Sinon.stub().returnsThis(),
    merge: Sinon.stub().resolves()
  }

  KnexFnStub = sinon.stub().returns(this.KnexStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  before () {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)
    this.GetFolderInfosWithPicturesStub = sinon.stub(Functions, 'GetFolderInfosWithPictures').resolves([])
    this.GetAllFolderInfosStub = sinon.stub(Functions, 'GetAllFolderInfos').resolves({})
    this.CalculateFolderInfosStub = sinon.stub(Functions, 'CalculateFolderInfos').returns([])
    this.ChunkStub = sinon.stub(Functions, 'Chunk').returns([])
  }

  after () {
    this.DebugStub?.restore()
    this.GetFolderInfosWithPicturesStub?.restore()
    this.GetAllFolderInfosStub?.restore()
    this.CalculateFolderInfosStub?.restore()
    this.ChunkStub?.restore()
  }

  @test
  async 'it should construct prefixed logger' () {
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.DebugStub?.callCount).to.equal(1)
    expect(this.DebugStub?.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg:string) => msg.startsWith(Imports.logPrefix + ':'),
        'Logger should be prefixed')
      .and.satisfy((msg:string) => msg.endsWith(':updateSeen'),
        'Logger should be suffixed with `updateSeen`')
  }

  @test
  async 'it should use knex to get folders with pictures counts' () {
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.GetFolderInfosWithPicturesStub?.callCount).to.equal(1)
    expect(this.GetFolderInfosWithPicturesStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.GetFolderInfosWithPicturesStub?.firstCall.args[0]).to.equal(this.KnexFnFake)
  }

  @test
  async 'it should use knex to all folders in the db' () {
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.GetAllFolderInfosStub?.callCount).to.equal(1)
    expect(this.GetAllFolderInfosStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.GetAllFolderInfosStub?.firstCall.args[0]).to.equal(this.KnexFnFake)
  }

  @test
  async 'it should calculate folder infos using results from both' () {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    this.GetFolderInfosWithPicturesStub?.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 }
    }
    this.GetAllFolderInfosStub?.resolves(allFolders)
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.CalculateFolderInfosStub?.callCount).to.equal(1)
    expect(this.CalculateFolderInfosStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.CalculateFolderInfosStub?.firstCall.args[0]).to.equal(allFolders)
    expect(this.CalculateFolderInfosStub?.firstCall.args[1]).to.equal(pictureFolders)
  }

  @test
  async 'it should chunk the results of calculation' () {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    this.CalculateFolderInfosStub?.returns(results)
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.ChunkStub?.callCount).to.equal(1)
    expect(this.ChunkStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.ChunkStub?.firstCall.args[0]).to.equal(results)
  }

  @test
  async 'it should insert results with conflict resolution' () {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    this.ChunkStub?.returns(records)
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.firstCall.args).to.deep.equal(['folders'])
    expect(this.KnexStub.insert.callCount).to.equal(1)
    expect(this.KnexStub.insert.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.insert.firstCall.args[0]).to.equal(records[0])
    expect(this.KnexStub.onConflict.callCount).to.equal(1)
    expect(this.KnexStub.onConflict.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.onConflict.firstCall.args[0]).to.equal('path')
    expect(this.KnexStub.merge.callCount).to.equal(1)
    expect(this.KnexStub.merge.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should loop on insert for each chunk' () {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }]
    ]
    this.ChunkStub?.returns(records)
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.KnexStub.insert.callCount).to.equal(3)
    expect(this.KnexStub.insert.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.insert.firstCall.args[0]).to.equal(records[0])
    expect(this.KnexStub.insert.secondCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.insert.secondCall.args[0]).to.equal(records[1])
    expect(this.KnexStub.insert.thirdCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.insert.thirdCall.args[0]).to.equal(records[2])
  }

  @test
  async 'it should log status' () {
    const pictureFolders = [
      { path: 'Test Path', totalCount: 0, seenCount: 0 },
      { path: 'Path under test', totalCount: 0, seenCount: 0 }
    ]
    this.GetFolderInfosWithPicturesStub?.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 }
    }
    this.GetAllFolderInfosStub?.resolves(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 }
    ]
    this.CalculateFolderInfosStub?.returns(results)
    await Functions.UpdateFolderPictureCounts(this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(5)
    expect(this.LoggerStub.getCall(0).args).to.deep.equal(['Updating Seen Counts'])
    expect(this.LoggerStub.getCall(1).args).to.deep.equal(['Found 2 Folders to Update'])
    expect(this.LoggerStub.getCall(2).args).to.deep.equal(['Found 1 Folders in the DB'])
    expect(this.LoggerStub.getCall(3).args).to.deep.equal(['Calculated 3 Folders Seen Counts'])
    expect(this.LoggerStub.getCall(4).args).to.deep.equal(['Updated 3 Folders Seen Counts'])
  }
}

@suite
export class SyncFoldersPruneEmptyFoldersTests {
  LoggerStub = sinon.stub()
  DebugStub?: Sinon.SinonStub

  KnexStub = {
    where: Sinon.stub().returnsThis(),
    delete: Sinon.stub().resolves()
  }

  KnexFnStub = sinon.stub().returns(this.KnexStub)
  KnexFnFake = this.KnexFnStub as unknown as Knex

  before () {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)
  }

  after () {
    this.DebugStub?.restore()
  }

  @test
  async 'it should construct prefixed logger' () {
    await Functions.PruneEmptyFolders(this.KnexFnFake)
    expect(this.DebugStub?.callCount).to.equal(1)
    expect(this.DebugStub?.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg:string) => msg.startsWith(Imports.logPrefix + ':'),
        'Logger should be prefixed')
      .and.satisfy((msg:string) => msg.endsWith(':pruneEmpty'),
        'Logger should be suffixed with `pruneEmpty`')
  }

  @test
  async 'it should use knex to delete folders with total count=0' () {
    await Functions.PruneEmptyFolders(this.KnexFnFake)
    expect(this.KnexFnStub.callCount).to.equal(1)
    expect(this.KnexFnStub.firstCall.args).to.deep.equal(['folders'])
    expect(this.KnexStub.where.callCount).to.equal(1)
    expect(this.KnexStub.where.firstCall.args).to.deep.equal(['totalCount', '=', 0])
    expect(this.KnexStub.delete.callCount).to.equal(1)
    expect(this.KnexStub.delete.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it log removed folder count' () {
    this.KnexStub.delete.resolves(42)
    await Functions.PruneEmptyFolders(this.KnexFnFake)
    expect(this.LoggerStub.callCount).to.equal(1)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Removed 42 empty folders'])
  }
}

@suite
export class SyncFoldersSynchronizeTests {
  LoggerStub = sinon.stub()
  DebugStub?: Sinon.SinonStub

  FindSyncItemsStub?: Sinon.SinonStub
  SyncAllPicturesStub?: Sinon.SinonStub
  SyncAllFoldersStub?: Sinon.SinonStub
  UpdateFolderPictureCountsStub?: Sinon.SinonStub
  PruneEmptyFoldersStub?: Sinon.SinonStub
  PersistenceIntitializerStub?: Sinon.SinonStub

  KnexFnStub = sinon.stub().returnsThis()

  before () {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)
    this.PersistenceIntitializerStub = sinon.stub(persistence, 'initialize').resolves(this.KnexFnStub as unknown as Knex)
    this.FindSyncItemsStub = sinon.stub(Functions, 'FindSyncItems').resolves(1)
    this.SyncAllPicturesStub = sinon.stub(Functions, 'SyncAllPictures').resolves()
    this.SyncAllFoldersStub = sinon.stub(Functions, 'SyncAllFolders').resolves()
    this.UpdateFolderPictureCountsStub = sinon.stub(Functions, 'UpdateFolderPictureCounts').resolves()
    this.PruneEmptyFoldersStub = sinon.stub(Functions, 'PruneEmptyFolders').resolves()
  }

  after () {
    this.DebugStub?.restore()
    this.FindSyncItemsStub?.restore()
    this.SyncAllPicturesStub?.restore()
    this.SyncAllFoldersStub?.restore()
    this.UpdateFolderPictureCountsStub?.restore()
    this.PruneEmptyFoldersStub?.restore()
    this.PersistenceIntitializerStub?.restore()
  }

  @test
  async 'it should create logger at start of process' () {
    await synchronize()
    expect(this.DebugStub?.callCount).to.equal(1)
    expect(this.DebugStub?.firstCall.args[0]).to.equal(Imports.logPrefix)
  }

  @test
  async 'it should log start of processing' () {
    await synchronize()
    expect(this.LoggerStub.callCount).to.be.above(1)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Folder Synchronization Begins')
  }

  @test
  async 'it should initialize the persistence layer' () {
    await synchronize()
    expect(this.PersistenceIntitializerStub?.callCount).to.equal(1)
    expect(this.PersistenceIntitializerStub?.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should find the sync items using the knex instance' () {
    await synchronize()
    expect(this.FindSyncItemsStub?.callCount).to.equal(1)
    expect(this.FindSyncItemsStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.FindSyncItemsStub?.firstCall.args[0]).to.equal(this.KnexFnStub)
  }

  @test
  async 'it should abort synchronizing when zero images found' () {
    this.FindSyncItemsStub?.resolves(0)
    await synchronize()
    expect(this.SyncAllPicturesStub?.callCount).to.equal(0)
    expect(this.SyncAllFoldersStub?.callCount).to.equal(0)
    expect(this.UpdateFolderPictureCountsStub?.callCount).to.equal(0)
    expect(this.PruneEmptyFoldersStub?.callCount).to.equal(0)
  }

  @test
  async 'it should log error when aborting synchronizing with zero images found' () {
    this.FindSyncItemsStub?.resolves(-1)
    await synchronize()
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.secondCall.args[0]).to.equal('Folder Synchronization Failed')
    expect(this.LoggerStub.secondCall.args[1]).to.be.an('Error')
    expect(this.LoggerStub.secondCall.args[1].message).to.equal('Found Zero images, refusing to process empty base folder')
  }

  @test
  async 'it should log success at end of processing with success' () {
    this.FindSyncItemsStub?.resolves(45)
    await synchronize()
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal('Folder Synchronization Complete')
  }

  @test
  async 'it should log success at end of processing with error' () {
    this.FindSyncItemsStub?.resolves(-1)
    await synchronize()
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal('Folder Synchronization Complete')
  }
}
