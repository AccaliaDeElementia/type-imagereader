'use sanity'

import { expect } from 'chai'
import { getListing, Internals, Imports, ModCount, type ModCountInternals } from '#routes/apiFunctions.js'
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
// Variant where the resolved folder's `path` differs from the getListing arg —
// used to verify a downstream call uses the getListing arg rather than the
// resolved folder's path.
const folderFixtureDifferentPath = { ...folderFixture, path: '/fop/bat/' }

describe('routes/apiFunctions getListing', () => {
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
    getFolderStub = sandbox.stub(Internals, 'getFolder').resolves(null)
    sandbox.stub(Internals, 'getDirectionFolder').resolves(null)
    getNextFolderStub = sandbox.stub(Internals, 'getNextFolder').resolves(null)
    getPreviousFolderStub = sandbox.stub(Internals, 'getPreviousFolder').resolves(null)
    getChildFoldersStub = sandbox.stub(Internals, 'getChildFolders').resolves(undefined)
    getPicturesStub = sandbox.stub(Internals, 'getPictures').resolves(undefined)
    getBookmarksStub = sandbox.stub(Internals, 'getBookmarks').resolves(undefined)
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('getFolder() interface', () => {
    it('should call getFolder() once', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.callCount).to.equal(1)
    })
    it('should call getFolder() with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.firstCall.args).to.have.lengthOf(2)
    })
    it('should call getFolder() with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should call getFolder() with path', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
  })

  describe('when getFolder() resolves to null', () => {
    it('should return null', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      expect(result).to.equal(null)
    })
    it('should not call getNextFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.callCount).to.equal(0)
    })
    it('should not call getPreviousFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.callCount).to.equal(0)
    })
    it('should not call getChildFolders', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.callCount).to.equal(0)
    })
    it('should not call getPictures', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.callCount).to.equal(0)
    })
    it('should not call getBookmarks', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.callCount).to.equal(0)
    })
    it('should not log getListing timing', async () => {
      await getListing(knexFake, '/foo/bar/')
      const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('getListing'))
      expect(matched).to.equal(false)
    })
  })

  describe('when getFolder() resolves to a folder', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })

    it('should call getNextFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.callCount).to.equal(1)
    })
    it('should call getPreviousFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.callCount).to.equal(1)
    })
    it('should call getChildFolders', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.callCount).to.equal(1)
    })
    it('should call getPictures', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.callCount).to.equal(1)
    })
    it('should call getBookmarks', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.callCount).to.equal(1)
    })
    it('should log getListing timing', async () => {
      await getListing(knexFake, '/foo/bar/')
      const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('getListing'))
      expect(matched).to.equal(true)
    })
  })

  describe('getNextFolder() invocation', () => {
    // Different path on the fixture verifies the call uses getListing's arg,
    // not the resolved folder's path.
    beforeEach(() => {
      getFolderStub.resolves(folderFixtureDifferentPath)
    })
    it('should be called with three arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args).to.have.lengthOf(3)
    })
    it('should be called with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
    it('should be called with sortKey', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.firstCall.args[2]).to.equal('bar>-<')
    })
  })

  describe('getPreviousFolder() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with three arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args).to.have.lengthOf(3)
    })
    it('should be called with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
    it('should be called with sortKey', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.firstCall.args[2]).to.equal('bar>-<')
    })
  })

  describe('getChildFolders() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.firstCall.args).to.have.lengthOf(2)
    })
    it('should be called with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
  })

  describe('getPictures() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.firstCall.args).to.have.lengthOf(2)
    })
    it('should be called with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should be called with path', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.firstCall.args[1]).to.equal('/foo/bar/')
    })
  })

  describe('getBookmarks() invocation', () => {
    beforeEach(() => {
      getFolderStub.resolves(folderFixture)
    })
    it('should be called with one argument', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.firstCall.args).to.have.lengthOf(1)
    })
    it('should be called with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.firstCall.args[0]).to.equal(knexFake)
    })
  })
})
