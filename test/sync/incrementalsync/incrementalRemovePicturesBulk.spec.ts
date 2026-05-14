'use sanity'

import { incrementalRemovePicturesBulk } from '#sync/incrementalsync.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('sync/incrementalsync incrementalRemovePicturesBulk()', () => {
  let pictureWhereInCalls: unknown[][] = []
  let bookmarkWhereInCalls: unknown[][] = []
  let pictureDeleteCount = 0
  let bookmarkDeleteCount = 0

  let picturesQuery = {
    whereIn: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    delete: vi.fn().mockResolvedValue(0),
  }
  let bookmarksQuery = {
    whereIn: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    delete: vi.fn().mockResolvedValue(0),
  }
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  const setup = (): void => {
    pictureWhereInCalls = []
    bookmarkWhereInCalls = []
    pictureDeleteCount = 0
    bookmarkDeleteCount = 0
    picturesQuery = {
      whereIn: vi.fn().mockImplementation((_col: string, values: unknown[]) => {
        pictureWhereInCalls.push(values)
        return picturesQuery
      }),
      delete: vi.fn().mockImplementation(async () => {
        pictureDeleteCount += 1
        await Promise.resolve()
        return 0
      }),
    }
    bookmarksQuery = {
      whereIn: vi.fn().mockImplementation((_col: string, values: unknown[]) => {
        bookmarkWhereInCalls.push(values)
        return bookmarksQuery
      }),
      delete: vi.fn().mockImplementation(async () => {
        bookmarkDeleteCount += 1
        await Promise.resolve()
        return 0
      }),
    }
    knexFnStub = vi.fn().mockImplementation((table: string) => {
      if (table === 'pictures') return picturesQuery
      if (table === 'bookmarks') return bookmarksQuery
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = stubToKnex(knexFnStub)
  }

  beforeEach(() => {
    setup()
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
      expect(picturesQuery.whereIn.mock.calls[0]?.[0]).toBe('path')
    })
    it('should call whereIn on the path column for bookmarks', async () => {
      await incrementalRemovePicturesBulk(knexFnFake, ['/a.jpg'])
      expect(bookmarksQuery.whereIn.mock.calls[0]?.[0]).toBe('path')
    })
  })
})
