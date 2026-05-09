'use sanity'

import { expect } from 'chai'
import { GetListing, Internals, Imports, ModCount, type ModCountInternals } from '#routes/apiFunctions.js'
import { cast } from '#testutils/TypeGuards.js'
import { createKnexChainFake } from '#testutils/Knex.js'
import Sinon from 'sinon'

const modCountInternals = cast<ModCountInternals>(ModCount)
const sandbox = Sinon.createSandbox()

const folderFixture = {
  name: 'bar<=>',
  path: '/foo/bar/',
  folder: '/foo/',
  cover: '/foo/bar/image.png',
  sortKey: 'bar>-<',
}
// Variant where the resolved folder's `path` differs from the GetListing arg —
// used to verify a downstream call uses the GetListing arg rather than the
// resolved folder's path.
const folderFixtureDifferentPath = { ...folderFixture, path: '/fop/bat/' }

describe('routes/apiFunctions GetListing', () => {
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
    getFolderStub = sandbox.stub(Internals, 'GetFolder').resolves(null)
    sandbox.stub(Internals, 'GetDirectionFolder').resolves(null)
    getNextFolderStub = sandbox.stub(Internals, 'GetNextFolder').resolves(null)
    getPreviousFolderStub = sandbox.stub(Internals, 'GetPreviousFolder').resolves(null)
    getChildFoldersStub = sandbox.stub(Internals, 'GetChildFolders').resolves(undefined)
    getPicturesStub = sandbox.stub(Internals, 'GetPictures').resolves(undefined)
    getBookmarksStub = sandbox.stub(Internals, 'GetBookmarks').resolves(undefined)
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('GetFolder() interface', () => {
    it('should call GetFolder() once', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getFolderStub.callCount).to.equal(1)
    })
    it('should call GetFolder() with two arguments', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getFolderStub.firstCall.args).to.have.lengthOf(2)
    })
    it('should call GetFolder() with knex', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getFolderStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should call GetFolder() with path', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
  })

  describe('when GetFolder() resolves to null', () => {
    it('should return null', async () => {
      const result = await GetListing(knexFake, '/foo/bar/')
      expect(result).to.equal(null)
    })
    it('should not call GetNextFolder', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.callCount).to.equal(0)
    })
    it('should not call GetPreviousFolder', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.callCount).to.equal(0)
    })
    it('should not call GetChildFolders', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.callCount).to.equal(0)
    })
    it('should not call GetPictures', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.callCount).to.equal(0)
    })
    it('should not call GetBookmarks', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.callCount).to.equal(0)
    })
    it('should not log GetListing timing', async () => {
      await GetListing(knexFake, '/foo/bar/')
      const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GetListing'))
      expect(matched).to.equal(false)
    })
  })

  describe('when GetFolder() resolves to a folder', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })

    it('should call GetNextFolder', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.callCount).to.equal(1)
    })
    it('should call GetPreviousFolder', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.callCount).to.equal(1)
    })
    it('should call GetChildFolders', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.callCount).to.equal(1)
    })
    it('should call GetPictures', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.callCount).to.equal(1)
    })
    it('should call GetBookmarks', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.callCount).to.equal(1)
    })
    it('should log GetListing timing', async () => {
      await GetListing(knexFake, '/foo/bar/')
      const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GetListing'))
      expect(matched).to.equal(true)
    })
  })

  describe('GetNextFolder() invocation', () => {
    // Different path on the fixture verifies the call uses GetListing's arg,
    // not the resolved folder's path.
    beforeEach(() => {
      getFolderStub.resolves(folderFixtureDifferentPath)
    })
    it('should be called with three arguments', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args).to.have.lengthOf(3)
    })
    it('should be called with knex', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
    it('should be called with sortKey', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args[2]).to.equal('bar>-<')
    })
  })

  describe('GetPreviousFolder() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with three arguments', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args).to.have.lengthOf(3)
    })
    it('should be called with knex', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
    it('should be called with sortKey', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args[2]).to.equal('bar>-<')
    })
  })

  describe('GetChildFolders() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with two arguments', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.firstCall.args).to.have.lengthOf(2)
    })
    it('should be called with knex', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
  })

  describe('GetPictures() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with two arguments', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.firstCall.args).to.have.lengthOf(2)
    })
    it('should be called with knex', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
  })

  describe('GetBookmarks() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with one argument', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.firstCall.args).to.have.lengthOf(1)
    })
    it('should be called with knex', async () => {
      await GetListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.firstCall.args[0]).to.equal(knexFake)
    })
  })
})
