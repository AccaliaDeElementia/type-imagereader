'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync.js'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/incrementalsync function IncrementalRemovePicturesBulk()', () => {
  let pictureWhereInCalls: unknown[][] = []
  let bookmarkWhereInCalls: unknown[][] = []
  let pictureDeleteCount = 0
  let bookmarkDeleteCount = 0

  let picturesQuery = {
    whereIn: sandbox.stub().returnsThis(),
    delete: sandbox.stub().resolves(0),
  }
  let bookmarksQuery = {
    whereIn: sandbox.stub().returnsThis(),
    delete: sandbox.stub().resolves(0),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  const setup = (): void => {
    pictureWhereInCalls = []
    bookmarkWhereInCalls = []
    pictureDeleteCount = 0
    bookmarkDeleteCount = 0
    picturesQuery = {
      whereIn: sandbox.stub().callsFake((_col: string, values: unknown[]) => {
        pictureWhereInCalls.push(values)
        return picturesQuery
      }),
      delete: sandbox.stub().callsFake(async () => {
        pictureDeleteCount += 1
        await Promise.resolve()
        return 0
      }),
    }
    bookmarksQuery = {
      whereIn: sandbox.stub().callsFake((_col: string, values: unknown[]) => {
        bookmarkWhereInCalls.push(values)
        return bookmarksQuery
      }),
      delete: sandbox.stub().callsFake(async () => {
        bookmarkDeleteCount += 1
        await Promise.resolve()
        return 0
      }),
    }
    knexFnStub = sandbox.stub().callsFake((table: string) => {
      if (table === 'pictures') return picturesQuery
      if (table === 'bookmarks') return bookmarksQuery
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = StubToKnex(knexFnStub)
  }

  beforeEach(() => {
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(sandbox.stub()))
    setup()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('when given an empty list of paths', () => {
    it('should not call pictures.delete', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, [])
      expect(pictureDeleteCount).to.equal(0)
    })
    it('should not call bookmarks.delete', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, [])
      expect(bookmarkDeleteCount).to.equal(0)
    })
  })

  describe('when given a single path', () => {
    it('should issue exactly one pictures.delete call', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureDeleteCount).to.equal(1)
    })
    it('should issue exactly one bookmarks.delete call', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(bookmarkDeleteCount).to.equal(1)
    })
    it('should pass the path to pictures.whereIn', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureWhereInCalls.flat()).to.deep.equal(['/comics/page.jpg'])
    })
    it('should pass the path to bookmarks.whereIn', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(bookmarkWhereInCalls.flat()).to.deep.equal(['/comics/page.jpg'])
    })
  })

  describe('when given many paths in a single chunk', () => {
    it('should issue exactly one pictures.delete call (single chunk)', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/a.jpg', '/b.jpg', '/c.jpg'])
      expect(pictureDeleteCount).to.equal(1)
    })
    it('should pass all paths in one whereIn for pictures', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/a.jpg', '/b.jpg', '/c.jpg'])
      expect(pictureWhereInCalls).to.have.lengthOf(1)
    })
    it('should call whereIn on the path column for pictures', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/a.jpg'])
      expect(picturesQuery.whereIn.firstCall.args[0]).to.equal('path')
    })
    it('should call whereIn on the path column for bookmarks', async () => {
      await Functions.IncrementalRemovePicturesBulk(knexFnFake, ['/a.jpg'])
      expect(bookmarksQuery.whereIn.firstCall.args[0]).to.equal('path')
    })
  })
})
