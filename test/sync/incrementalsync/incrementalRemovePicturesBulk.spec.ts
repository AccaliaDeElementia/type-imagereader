'use sanity'

import { incrementalRemovePicturesBulk } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

describe('sync/incrementalsync incrementalRemovePicturesBulk()', () => {
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
  let knexFnFake = stubToKnex(knexFnStub)

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
    knexFnFake = stubToKnex(knexFnStub)
  }

  beforeEach(() => {
    setup()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('when given an empty list of paths', () => {
    it('should not call pictures.delete', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, [])
      expect(pictureDeleteCount).toBe(0)
    })
    it('should not call bookmarks.delete', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, [])
      expect(bookmarkDeleteCount).toBe(0)
    })
  })

  describe('when given a single path', () => {
    it('should issue exactly one pictures.delete call', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureDeleteCount).toBe(1)
    })
    it('should issue exactly one bookmarks.delete call', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(bookmarkDeleteCount).toBe(1)
    })
    it('should pass the path to pictures.whereIn', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureWhereInCalls.flat()).toEqual(['/comics/page.jpg'])
    })
    it('should pass the path to bookmarks.whereIn', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(bookmarkWhereInCalls.flat()).toEqual(['/comics/page.jpg'])
    })
  })

  describe('when given many paths in a single chunk', () => {
    it('should issue exactly one pictures.delete call (single chunk)', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/a.jpg', '/b.jpg', '/c.jpg'])
      expect(pictureDeleteCount).toBe(1)
    })
    it('should pass all paths in one whereIn for pictures', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/a.jpg', '/b.jpg', '/c.jpg'])
      expect(pictureWhereInCalls).toHaveLength(1)
    })
    it('should call whereIn on the path column for pictures', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/a.jpg'])
      expect(picturesQuery.whereIn.firstCall.args[0]).toBe('path')
    })
    it('should call whereIn on the path column for bookmarks', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/a.jpg'])
      expect(bookmarksQuery.whereIn.firstCall.args[0]).toBe('path')
    })
  })
})
