'use sanity'

import { getListing, Internals, ModCount, type ModCountInternals } from '#routes/apiFunctions.js'
import { cast } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import assert from 'node:assert'
import Sinon from 'sinon'

const modCountInternals = cast<ModCountInternals>(ModCount)

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions getListing direction and result', () => {
  let getFolderStub = sandbox.stub()
  let getDirectionFolderStub = sandbox.stub()
  let getNextFolderStub = sandbox.stub()
  let getPreviousFolderStub = sandbox.stub()
  let getChildFoldersStub = sandbox.stub()
  let getPicturesStub = sandbox.stub()
  let getBookmarksStub = sandbox.stub()
  let { fake: knexFake } = createKnexChainFake([] as const, [] as const)
  beforeEach(() => {
    modCountInternals.modCount = 32_768
    ;({ fake: knexFake } = createKnexChainFake([] as const, [] as const))
    getFolderStub = sandbox.stub(Internals, 'getFolder').resolves(null)
    getDirectionFolderStub = sandbox.stub(Internals, 'getDirectionFolder').resolves(null)
    getNextFolderStub = sandbox.stub(Internals, 'getNextFolder').resolves(null)
    getPreviousFolderStub = sandbox.stub(Internals, 'getPreviousFolder').resolves(null)
    getChildFoldersStub = sandbox.stub(Internals, 'getChildFolders').resolves(undefined)
    getPicturesStub = sandbox.stub(Internals, 'getPictures').resolves(undefined)
    getBookmarksStub = sandbox.stub(Internals, 'getBookmarks').resolves(undefined)
  })
  afterEach(() => {
    sandbox.restore()
  })
  describe('getDirectionFolder calls', () => {
    beforeEach(() => {
      getFolderStub.resolves({
        name: 'bar<=>',
        path: '/foo/bar/',
        folder: '/foo/',
        cover: '/foo/bar/image.png',
        sortKey: 'bar>-<',
      })
    })
    it('should call getDirectionFolder twice', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.callCount).toBe(2)
    })
    it('should call getDirectionFolder for next unread with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.firstCall.args).toHaveLength(2)
    })
    it('should call getDirectionFolder for next unread with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should call getDirectionFolder for next unread with expected options', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.firstCall.args[1]).toEqual({
        path: '/foo/bar/',
        sortKey: 'bar>-<',
        direction: 'asc',
        type: 'unread',
      })
    })
    it('should call getDirectionFolder for previous unread with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.secondCall.args).toHaveLength(2)
    })
    it('should call getDirectionFolder for previous unread with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.secondCall.args[0]).toBe(knexFake)
    })
    it('should call getDirectionFolder for previous unread with expected options', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.secondCall.args[1]).toEqual({
        path: '/foo/bar/',
        sortKey: 'bar>-<',
        direction: 'desc',
        type: 'unread',
      })
    })
  })

  describe('resolved folder properties', () => {
    beforeEach(() => {
      getFolderStub.resolves({
        name: 'bar<=>',
        path: '/fop/bat/',
        folder: '/foo/',
        cover: '/foo/bar/image.png',
        sortKey: 'bar>-<',
      })
    })
    it('should resolve folder name', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.name).toBe('bar<=>')
    })
    it('should resolve folder path', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.path).toBe('/fop/bat/')
    })
    it('should resolve folder parent', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.parent).toBe('/foo/')
    })
    it('should resolve folder cover', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.cover).toBe('/foo/bar/image.png')
    })
  })

  describe('downstream helper resolution', () => {
    beforeEach(() => {
      getFolderStub.resolves({})
    })
    it('should set next from getNextFolder()', async () => {
      const data = { data: Math.random() }
      getNextFolderStub.resolves(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.next).toBe(data)
    })
    it('should set prev from getPreviousFolder()', async () => {
      const data = { data: Math.random() }
      getPreviousFolderStub.resolves(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.prev).toBe(data)
    })
    it('should set children from getChildFolders()', async () => {
      const data = { data: Math.random() }
      getChildFoldersStub.resolves(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.children).toBe(data)
    })
    it('should set pictures from getPictures()', async () => {
      const data = { data: Math.random() }
      getPicturesStub.resolves(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.pictures).toBe(data)
    })
    it('should set bookmarks from getBookmarks()', async () => {
      const data = { data: Math.random() }
      getBookmarksStub.resolves(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.bookmarks).toBe(data)
    })
  })
  it('should set modcount', async () => {
    getFolderStub.resolves({})
    modCountInternals.modCount = 9090
    const result = await getListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.modCount).toBe(9090)
  })
})
