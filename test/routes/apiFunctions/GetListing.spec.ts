'use sanity'

import { expect } from 'chai'
import { Functions, Imports, ModCount, type ModCountInternals } from '#routes/apiFunctions'
import { Cast } from '#testutils/TypeGuards'
import { createKnexChainFake } from '#testutils/Knex'
import Sinon from 'sinon'

const modCountInternals = Cast<ModCountInternals>(ModCount)
const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions function GetListing', () => {
  let getFolderStub = sandbox.stub()
  let getNextFolderStub = sandbox.stub()
  let getPreviousFolderStub = sandbox.stub()
  let getChildFoldersStub = sandbox.stub()
  let getPicturesStub = sandbox.stub()
  let getBookmarksStub = sandbox.stub()
  let loggerStub: Sinon.SinonStub = sandbox.stub()
  let { fake: knexFake } = createKnexChainFake([] as const, [] as const)
  beforeEach(() => {
    modCountInternals.modCount = 32_768
    ;({ fake: knexFake } = createKnexChainFake([] as const, [] as const))
    getFolderStub = sandbox.stub(Functions, 'GetFolder').resolves(null)
    sandbox.stub(Functions, 'GetDirectionFolder').resolves(null)
    getNextFolderStub = sandbox.stub(Functions, 'GetNextFolder').resolves(null)
    getPreviousFolderStub = sandbox.stub(Functions, 'GetPreviousFolder').resolves(null)
    getChildFoldersStub = sandbox.stub(Functions, 'GetChildFolders').resolves(undefined)
    getPicturesStub = sandbox.stub(Functions, 'GetPictures').resolves(undefined)
    getBookmarksStub = sandbox.stub(Functions, 'GetBookmarks').resolves(undefined)
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call GetFolder() once', async () => {
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getFolderStub.callCount).to.equal(1)
  })
  it('should call GetFolder() with two arguments', async () => {
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getFolderStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should call GetFolder() with knex', async () => {
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getFolderStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetFolder() with path', async () => {
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should return null when GetFolder() does not resolve to a folder', async () => {
    getFolderStub.resolves(null)
    const result = await Functions.GetListing(knexFake, '/foo/bar/')
    expect(result).to.equal(null)
  })
  it('should not call GetNextFolder when GetFolder returns null', async () => {
    getFolderStub.resolves(null)
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.callCount).to.equal(0)
  })
  it('should not call GetPreviousFolder when GetFolder returns null', async () => {
    getFolderStub.resolves(null)
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.callCount).to.equal(0)
  })
  it('should not call GetChildFolders when GetFolder returns null', async () => {
    getFolderStub.resolves(null)
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getChildFoldersStub.callCount).to.equal(0)
  })
  it('should not call GetPictures when GetFolder returns null', async () => {
    getFolderStub.resolves(null)
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPicturesStub.callCount).to.equal(0)
  })
  it('should not call GetBookmarks when GetFolder returns null', async () => {
    getFolderStub.resolves(null)
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getBookmarksStub.callCount).to.equal(0)
  })
  it('should call GetNextFolder when GetFolder returns a folder', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.callCount).to.equal(1)
  })
  it('should call GetPreviousFolder when GetFolder returns a folder', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.callCount).to.equal(1)
  })
  it('should call GetChildFolders when GetFolder returns a folder', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getChildFoldersStub.callCount).to.equal(1)
  })
  it('should call GetPictures when GetFolder returns a folder', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPicturesStub.callCount).to.equal(1)
  })
  it('should call GetBookmarks when GetFolder returns a folder', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getBookmarksStub.callCount).to.equal(1)
  })
  it('should call GetNextFolder() once', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.callCount).to.equal(1)
  })
  it('should call GetNextFolder() with three arguments', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.firstCall.args).to.have.lengthOf(3)
  })
  it('should call GetNextFolder() with knex', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetNextFolder() with path', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should call GetNextFolder() with sortKey', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getNextFolderStub.firstCall.args[2]).to.equal('bar>-<')
  })
  it('should call GetPreviousFolder() once', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.callCount).to.equal(1)
  })
  it('should call GetPreviousFolder() with three arguments', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.firstCall.args).to.have.lengthOf(3)
  })
  it('should call GetPreviousFolder() with knex', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetPreviousFolder() with path', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should call GetPreviousFolder() with sortKey', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPreviousFolderStub.firstCall.args[2]).to.equal('bar>-<')
  })
  it('should call GetChildFolders() once', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getChildFoldersStub.callCount).to.equal(1)
  })
  it('should call GetChildFolders() with two arguments', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getChildFoldersStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should call GetChildFolders() with knex', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getChildFoldersStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetChildFolders() with path', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getChildFoldersStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should call GetPictures() once', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPicturesStub.callCount).to.equal(1)
  })
  it('should call GetPictures() with two arguments', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPicturesStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should call GetPictures() with knex', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPicturesStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetPictures() with path', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getPicturesStub.firstCall.args[1]).to.equal('/foo/bar/')
  })
  it('should call GetBookmarks() once', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getBookmarksStub.callCount).to.equal(1)
  })
  it('should call GetBookmarks() with one argument', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getBookmarksStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should call GetBookmarks() with knex', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    expect(getBookmarksStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should log GetListing timing on success path', async () => {
    getFolderStub.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<',
    })
    await Functions.GetListing(knexFake, '/foo/bar/')
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GetListing'))
    expect(matched).to.equal(true)
  })
  it('should not log GetListing timing when folder is not found', async () => {
    getFolderStub.resolves(null)
    await Functions.GetListing(knexFake, '/foo/bar/')
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GetListing'))
    expect(matched).to.equal(false)
  })
})
