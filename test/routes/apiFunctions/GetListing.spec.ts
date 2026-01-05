'use sanity'

import { expect } from 'chai'
import { Functions, ModCount } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'
import assert from 'node:assert'

describe('routes/apiFunctions function GetListing', () => {
  let getFolderStub = Sinon.stub()
  let getDirectionFolderStub = Sinon.stub()
  let getNextFolderStub = Sinon.stub()
  let getPreviousFolderStub = Sinon.stub()
  let getChildFoldersStub = Sinon.stub()
  let getPicturesStub = Sinon.stub()
  let getBookmarksStub = Sinon.stub()
  let knexFake = StubToKnex({ Knex: Math.random() })
  beforeEach(() => {
    ModCount._modCount = 32_768
    knexFake = StubToKnex({ Knex: Math.random() })
    getFolderStub = Sinon.stub(Functions, 'GetFolder').resolves()
    getDirectionFolderStub = Sinon.stub(Functions, 'GetDirectionFolder').resolves()
    getNextFolderStub = Sinon.stub(Functions, 'GetNextFolder').resolves()
    getPreviousFolderStub = Sinon.stub(Functions, 'GetPreviousFolder').resolves()
    getChildFoldersStub = Sinon.stub(Functions, 'GetChildFolders').resolves()
    getPicturesStub = Sinon.stub(Functions, 'GetPictures').resolves()
    getBookmarksStub = Sinon.stub(Functions, 'GetBookmarks').resolves()
  })
  afterEach(() => {
    getFolderStub.restore()
    getDirectionFolderStub.restore()
    getNextFolderStub.restore()
    getPreviousFolderStub.restore()
    getChildFoldersStub.restore()
    getPicturesStub.restore()
    getBookmarksStub.restore()
  })
  it('should call GetFolder()', async () => {
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getFolderStub.callCount).to.equal(1)
    expect(getFolderStub.firstCall.args).to.have.lengthOf(2)
    expect(getFolderStub.firstCall.args[0]).to.equal(knexFake)
    expect(getFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should return null when GetFolder() does not resolve to a folder', async () => {
    getFolderStub.resolves(null)
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    expect(result).to.equal(null)
  })
  it('should abort early when GetFolder() does not resolve to a folder', async () => {
    getFolderStub.resolves(null)
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.callCount).to.equal(0)
    expect(getPreviousFolderStub.callCount).to.equal(0)
    expect(getChildFoldersStub.callCount).to.equal(0)
    expect(getPicturesStub.callCount).to.equal(0)
    expect(getBookmarksStub.callCount).to.equal(0)
  })
  it('should continue when GetFolder() resolves to a folder', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.callCount).to.equal(1)
    expect(getPreviousFolderStub.callCount).to.equal(1)
    expect(getChildFoldersStub.callCount).to.equal(1)
    expect(getPicturesStub.callCount).to.equal(1)
    expect(getBookmarksStub.callCount).to.equal(1)
  })
  it('should call GetNextFolder()', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.callCount).to.equal(1)
    expect(getNextFolderStub.firstCall.args).to.have.lengthOf(3)
    expect(getNextFolderStub.firstCall.args[0]).to.equal(knexFake)
    expect(getNextFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    expect(getNextFolderStub.firstCall.args[2]).to.equal('bar>-<')
  })
  it('should call GetPreviousFolder()', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.callCount).to.equal(1)
    expect(getPreviousFolderStub.firstCall.args).to.have.lengthOf(3)
    expect(getPreviousFolderStub.firstCall.args[0]).to.equal(knexFake)
    expect(getPreviousFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    expect(getPreviousFolderStub.firstCall.args[2]).to.equal('bar>-<')
  })
  it('should call GetChildFolders()', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getChildFoldersStub.callCount).to.equal(1)
    expect(getChildFoldersStub.firstCall.args).to.have.lengthOf(2)
    expect(getChildFoldersStub.firstCall.args[0]).to.equal(knexFake)
    expect(getChildFoldersStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should call GetPictures()', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPicturesStub.callCount).to.equal(1)
    expect(getPicturesStub.firstCall.args).to.have.lengthOf(2)
    expect(getPicturesStub.firstCall.args[0]).to.equal(knexFake)
    expect(getPicturesStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should call GetBookmarks()', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getBookmarksStub.callCount).to.equal(1)
    expect(getBookmarksStub.firstCall.args).to.have.lengthOf(1)
    expect(getBookmarksStub.firstCall.args[0]).to.equal(knexFake)
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
  it('should call GetDirectionFolder for next unread', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    const call = getDirectionFolderStub.firstCall
    expect(call.args).to.have.lengthOf(2)
    expect(call.args[0]).to.equal(knexFake)
    expect(call.args[1]).to.deep.equal({ path: '/foo/bar/', sortKey: 'bar>-<', direction: 'asc', type: 'unread' })
  })
  it('should call GetDirectionFolder for previous unread', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    const call = getDirectionFolderStub.secondCall
    expect(call.args).to.have.lengthOf(2)
    expect(call.args[0]).to.equal(knexFake)
    expect(call.args[1]).to.deep.equal({ path: '/foo/bar/', sortKey: 'bar>-<', direction: 'desc', type: 'unread' })
  })
  it('should resolve folder data', async () => {
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
    expect(result.path).to.equal('/fop/bat/')
    expect(result.parent).to.equal('/foo/')
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
  it('should set next from GetPictures()', async () => {
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
