'use sanity'

import { expect } from 'chai'
import { Functions, ModCount } from '#routes/apiFunctions'
import Sinon from 'sinon'
import { createKnexChainFake } from '#testutils/Knex'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions function GetListing direction and result', () => {
  let getFolderStub = Sinon.stub()
  let getDirectionFolderStub = Sinon.stub()
  let getNextFolderStub = Sinon.stub()
  let getPreviousFolderStub = Sinon.stub()
  let getChildFoldersStub = Sinon.stub()
  let getPicturesStub = Sinon.stub()
  let getBookmarksStub = Sinon.stub()
  let { fake: knexFake } = createKnexChainFake([] as const, [] as const)
  beforeEach(() => {
    ModCount._modCount = 32_768
    ;({ fake: knexFake } = createKnexChainFake([] as const, [] as const))
    getFolderStub = sandbox.stub(Functions, 'GetFolder').resolves(null)
    getDirectionFolderStub = sandbox.stub(Functions, 'GetDirectionFolder').resolves(null)
    getNextFolderStub = sandbox.stub(Functions, 'GetNextFolder').resolves(null)
    getPreviousFolderStub = sandbox.stub(Functions, 'GetPreviousFolder').resolves(null)
    getChildFoldersStub = sandbox.stub(Functions, 'GetChildFolders').resolves(undefined)
    getPicturesStub = sandbox.stub(Functions, 'GetPictures').resolves(undefined)
    getBookmarksStub = sandbox.stub(Functions, 'GetBookmarks').resolves(undefined)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call GetDirectionFolder twice', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getDirectionFolderStub.callCount).to.equal(2)
  })
  it('should call GetDirectionFolder for next unread with two arguments', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getDirectionFolderStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should call GetDirectionFolder for next unread with knex', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getDirectionFolderStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetDirectionFolder for next unread with expected options', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getDirectionFolderStub.firstCall.args[1]).to.deep.equal({
      path: '/foo/bar/',
      sortKey: 'bar>-<',
      direction: 'asc',
      type: 'unread',
    })
  })
  it('should call GetDirectionFolder for previous unread with two arguments', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getDirectionFolderStub.secondCall.args).to.have.lengthOf(2)
  })
  it('should call GetDirectionFolder for previous unread with knex', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getDirectionFolderStub.secondCall.args[0]).to.equal(knexFake)
  })
  it('should call GetDirectionFolder for previous unread with expected options', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getDirectionFolderStub.secondCall.args[1]).to.deep.equal({
      path: '/foo/bar/',
      sortKey: 'bar>-<',
      direction: 'desc',
      type: 'unread',
    })
  })
  it('should resolve folder name', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.name).to.equal('bar<=>')
  })
  it('should resolve folder path', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.path).to.equal('/fop/bat/')
  })
  it('should resolve folder parent', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.parent).to.equal('/foo/')
  })
  it('should resolve folder cover', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.cover).to.equal('/foo/bar/image.png')
  })
  it('should set next from GetNextFolder()', async () => {
    const data = { data: Math.random() }
    getFolderStub.resolves({})
    getNextFolderStub.resolves(data)
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.next).to.equal(data)
  })
  it('should set prev from GetPreviousFolder()', async () => {
    const data = { data: Math.random() }
    getFolderStub.resolves({})
    getPreviousFolderStub.resolves(data)
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.prev).to.equal(data)
  })
  it('should set children from GetChildFolders()', async () => {
    const data = { data: Math.random() }
    getFolderStub.resolves({})
    getChildFoldersStub.resolves(data)
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.children).to.equal(data)
  })
  it('should set pictures from GetPictures()', async () => {
    const data = { data: Math.random() }
    getFolderStub.resolves({})
    getPicturesStub.resolves(data)
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.pictures).to.equal(data)
  })
  it('should set bookmarks from GetBookmarks()', async () => {
    const data = { data: Math.random() }
    getFolderStub.resolves({})
    getBookmarksStub.resolves(data)
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.bookmarks).to.equal(data)
  })
  it('should set modcount', async () => {
    getFolderStub.resolves({})
    ModCount._modCount = 9090
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.modCount).to.equal(9090)
  })
})
