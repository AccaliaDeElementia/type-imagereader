'use sanity'

import { expect } from 'chai'
import { incrementalRemoveFolder } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/TypeGuards.js'
import { createLoggerFake } from '#testutils/Debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/incrementalsync incrementalRemoveFolder()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox)
  let picturesStub = {
    where: sandbox.stub().returnsThis(),
    delete: sandbox.stub().resolves(0),
  }
  let bookmarksStub = {
    whereNotExists: sandbox.stub().returnsThis(),
    delete: sandbox.stub().resolves(0),
  }
  let bookmarksInnerStub = {
    select: sandbox.stub().returnsThis(),
    from: sandbox.stub().returnsThis(),
    whereRaw: sandbox.stub().returnsThis(),
  }
  let foldersStub = {
    where: sandbox.stub().returnsThis(),
    delete: sandbox.stub().resolves(0),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox))
    picturesStub = {
      where: sandbox.stub().returnsThis(),
      delete: sandbox.stub().resolves(5),
    }
    bookmarksInnerStub = {
      select: sandbox.stub().returnsThis(),
      from: sandbox.stub().returnsThis(),
      whereRaw: sandbox.stub().returnsThis(),
    }
    bookmarksStub = {
      whereNotExists: sandbox.stub().callsFake((fn: (this: unknown) => void) => {
        fn.apply(bookmarksInnerStub)
        return bookmarksStub
      }),
      delete: sandbox.stub().resolves(2),
    }
    foldersStub = {
      where: sandbox.stub().returnsThis(),
      delete: sandbox.stub().resolves(3),
    }
    knexFnStub = sandbox.stub()
    knexFnStub.withArgs('pictures').returns(picturesStub)
    knexFnStub.withArgs('bookmarks').returns(bookmarksStub)
    knexFnStub.withArgs('folders').returns(foldersStub)
    knexFnFake = stubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should query pictures by folder prefix', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(picturesStub.where.calledWith('folder', 'like', '/comics/series/%')).to.equal(true)
  })

  it('should call delete on pictures', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(picturesStub.delete.callCount).to.equal(1)
  })

  it('should call whereNotExists for orphaned bookmarks', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksStub.whereNotExists.callCount).to.equal(1)
  })

  it('should call delete on bookmarks', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksStub.delete.callCount).to.equal(1)
  })

  it('should select all columns in bookmarks subquery', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksInnerStub.select.calledWith('*')).to.equal(true)
  })

  it('should query from pictures in bookmarks subquery', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksInnerStub.from.calledWith('pictures')).to.equal(true)
  })

  it('should join on path in bookmarks subquery', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksInnerStub.whereRaw.calledWith('pictures.path = bookmarks.path')).to.equal(true)
  })

  it('should query folders by path prefix', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(foldersStub.where.calledWith('path', 'like', '/comics/series/%')).to.equal(true)
  })

  it('should call delete on folders', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(foldersStub.delete.callCount).to.equal(1)
  })

  it('should log summary with picture and folder counts', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(loggerStub.calledWith('Incremental remove folder: /comics/series/ (5 pictures, 3 folders)')).to.equal(true)
  })

  it('should escape underscore wildcards when querying pictures', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo_bar/')
    expect(picturesStub.where.calledWith('folder', 'like', '/foo\\_bar/%')).to.equal(true)
  })

  it('should escape percent wildcards when querying pictures', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo%bar/')
    expect(picturesStub.where.calledWith('folder', 'like', '/foo\\%bar/%')).to.equal(true)
  })

  it('should escape underscore wildcards when querying folders', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo_bar/')
    expect(foldersStub.where.calledWith('path', 'like', '/foo\\_bar/%')).to.equal(true)
  })

  it('should escape percent wildcards when querying folders', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo%bar/')
    expect(foldersStub.where.calledWith('path', 'like', '/foo\\%bar/%')).to.equal(true)
  })
})
