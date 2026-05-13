'use sanity'

import { getDirectionFolder, type SiblingFolderSearch } from '#routes/apiFunctions.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import assert from 'node:assert'

describe('routes/apiFunctions getDirectionFolder', () => {
  let knexFirstCall = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    where: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    andWhere: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    orderBy: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    limit: vi.fn().mockReturnValue([]),
  }
  let knexSecondCall = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    where: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    andWhere: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    orderBy: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    limit: vi.fn().mockReturnValue([]),
  }
  let knexStub = vi.fn().mockReturnValueOnce(knexFirstCall).mockReturnValueOnce(knexSecondCall)
  let knexFake = stubToKnex(knexStub)
  const rawStub = vi.fn()
  beforeEach(() => {
    knexFirstCall = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      where: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      andWhere: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      orderBy: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      limit: vi.fn().mockReturnValue([]),
    }
    knexSecondCall = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      where: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      andWhere: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      orderBy: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      limit: vi.fn().mockReturnValue([]),
    }
    knexStub = vi.fn().mockReturnValueOnce(knexFirstCall).mockReturnValueOnce(knexSecondCall)
    knexFake = stubToKnex(knexStub)
    knexFake.raw = rawStub
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('queries the folders table', () => {
    const queryCases: Array<[string, 'asc' | 'desc', 0 | 1]> = [
      ['same-sortKey query (asc)', 'asc', 0],
      ['different-sortKey query (asc)', 'asc', 1],
      ['same-sortKey query (desc)', 'desc', 0],
      ['different-sortKey query (desc)', 'desc', 1],
    ]
    queryCases.forEach(([label, direction, callIdx]) => {
      it(`should query folders table for ${label}`, async () => {
        const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
        await getDirectionFolder(knexFake, spec)
        expect(knexStub.mock.calls[callIdx]?.[0]).toBe('folders')
      })
    })
  })

  describe('selects expected fields', () => {
    const selectCases: Array<[string, 'path' | 'current' | 'firstPicture', boolean]> = [
      ['path in same-sortKey query', 'path', true],
      ['current in same-sortKey query', 'current', true],
      ['firstPicture in same-sortKey query', 'firstPicture', true],
      ['path in different-sortKey query', 'path', false],
      ['current in different-sortKey query', 'current', false],
      ['firstPicture in different-sortKey query', 'firstPicture', false],
    ]
    selectCases.forEach(([label, field, isFirstQuery]) => {
      it(`should select ${label}`, async () => {
        const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
        await getDirectionFolder(knexFake, spec)
        const query = isFirstQuery ? knexFirstCall : knexSecondCall
        expect(query.select.mock.calls[0]).toContain(field)
      })
    })
  })

  describe('with direction=asc, type=all', () => {
    beforeEach(async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
      await getDirectionFolder(knexFake, spec)
    })
    describe('first query (same sortkey)', () => {
      it('should call where once', () => {
        expect(knexFirstCall.where.mock.calls.length).toBe(1)
      })
      it('should call andWhere twice', () => {
        expect(knexFirstCall.andWhere.mock.calls.length).toBe(2)
      })
      it('should filter by folder', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
        ]
        const folderFilter = queries.find((arg) => arg?.[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
        ]
        const sortKeyFilter = queries.find((arg) => arg?.[0] === 'sortKey') as string[] | undefined
        assert(sortKeyFilter !== undefined)
        expect(sortKeyFilter).toEqual(['sortKey', '=', 'foo69420'])
      })
      it('should filter by path with > operator', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
        ]
        const pathFilter = queries.find((arg) => arg?.[0] === 'path') as string[] | undefined
        assert(pathFilter !== undefined)
        expect(pathFilter).toEqual(['path', '>', '/foo/bar'])
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call where once', () => {
        expect(knexSecondCall.where.mock.calls.length).toBe(1)
      })
      it('should call andWhere once', () => {
        expect(knexSecondCall.andWhere.mock.calls.length).toBe(1)
      })
      it('should filter by folder', () => {
        const queries = [knexSecondCall.where.mock.calls[0], knexSecondCall.andWhere.mock.calls[0]]
        const folderFilter = queries.find((arg) => arg?.[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey with > operator', () => {
        const queries = [knexSecondCall.where.mock.calls[0], knexSecondCall.andWhere.mock.calls[0]]
        const sortKeyFilter = queries.find((arg) => arg?.[0] === 'sortKey') as string[] | undefined
        assert(sortKeyFilter !== undefined)
        expect(sortKeyFilter).toEqual(['sortKey', '>', 'foo69420'])
      })
    })
  })

  describe('with direction=desc, type=all', () => {
    beforeEach(async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
      await getDirectionFolder(knexFake, spec)
    })
    describe('first query (same sortkey)', () => {
      it('should call where once', () => {
        expect(knexFirstCall.where.mock.calls.length).toBe(1)
      })
      it('should call andWhere twice', () => {
        expect(knexFirstCall.andWhere.mock.calls.length).toBe(2)
      })
      it('should filter by folder', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
        ]
        const folderFilter = queries.find((arg) => arg?.[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
        ]
        const sortKeyFilter = queries.find((arg) => arg?.[0] === 'sortKey') as string[] | undefined
        assert(sortKeyFilter !== undefined)
        expect(sortKeyFilter).toEqual(['sortKey', '=', 'foo69420'])
      })
      it('should filter by path with < operator', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
        ]
        const pathFilter = queries.find((arg) => arg?.[0] === 'path') as string[] | undefined
        assert(pathFilter !== undefined)
        expect(pathFilter).toEqual(['path', '<', '/foo/bar'])
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call where once', () => {
        expect(knexSecondCall.where.mock.calls.length).toBe(1)
      })
      it('should call andWhere once', () => {
        expect(knexSecondCall.andWhere.mock.calls.length).toBe(1)
      })
      it('should filter by folder', () => {
        const queries = [knexSecondCall.where.mock.calls[0], knexSecondCall.andWhere.mock.calls[0]]
        const folderFilter = queries.find((arg) => arg?.[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey with < operator', () => {
        const queries = [knexSecondCall.where.mock.calls[0], knexSecondCall.andWhere.mock.calls[0]]
        const sortKeyFilter = queries.find((arg) => arg?.[0] === 'sortKey') as string[] | undefined
        assert(sortKeyFilter !== undefined)
        expect(sortKeyFilter).toEqual(['sortKey', '<', 'foo69420'])
      })
    })
  })

  describe('with direction=asc, type=unread', () => {
    let rawQuery = { raw: 0 }
    beforeEach(async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
      rawQuery = { raw: Math.random() }
      rawStub.mockReturnValue(rawQuery)
      await getDirectionFolder(knexFake, spec)
    })
    describe('first query (same sortkey)', () => {
      it('should call where once', () => {
        expect(knexFirstCall.where.mock.calls.length).toBe(1)
      })
      it('should call andWhere three times', () => {
        expect(knexFirstCall.andWhere.mock.calls.length).toBe(3)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
          knexFirstCall.andWhere.mock.calls[2],
        ]
        const filter = queries.find((arg) => arg?.[0] === 'totalCount') as string[] | undefined
        assert(filter !== undefined)
        expect(filter).toEqual(['totalCount', '>', rawQuery])
      })
      it('should call raw with seenCount', () => {
        expect(rawStub.mock.calls.every((c) => c[0] === '"seenCount"')).toBe(true)
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call andWhere twice', () => {
        expect(knexSecondCall.andWhere.mock.calls.length).toBe(2)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [knexSecondCall.andWhere.mock.calls[0], knexSecondCall.andWhere.mock.calls[1]]
        const filter = queries.find((arg) => arg?.[0] === 'totalCount') as string[] | undefined
        assert(filter !== undefined)
        expect(filter).toEqual(['totalCount', '>', rawQuery])
      })
    })
  })

  describe('with direction=desc, type=unread', () => {
    let rawQuery = { raw: 0 }
    beforeEach(async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
      rawQuery = { raw: Math.random() }
      rawStub.mockReturnValue(rawQuery)
      await getDirectionFolder(knexFake, spec)
    })
    describe('first query (same sortkey)', () => {
      it('should call where once', () => {
        expect(knexFirstCall.where.mock.calls.length).toBe(1)
      })
      it('should call andWhere three times', () => {
        expect(knexFirstCall.andWhere.mock.calls.length).toBe(3)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [
          knexFirstCall.where.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[0],
          knexFirstCall.andWhere.mock.calls[1],
          knexFirstCall.andWhere.mock.calls[2],
        ]
        const filter = queries.find((arg) => arg?.[0] === 'totalCount') as string[] | undefined
        assert(filter !== undefined)
        expect(filter).toEqual(['totalCount', '>', rawQuery])
      })
      it('should call raw with seenCount', () => {
        expect(rawStub.mock.calls.every((c) => c[0] === '"seenCount"')).toBe(true)
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call andWhere twice', () => {
        expect(knexSecondCall.andWhere.mock.calls.length).toBe(2)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [knexSecondCall.andWhere.mock.calls[0], knexSecondCall.andWhere.mock.calls[1]]
        const filter = queries.find((arg) => arg?.[0] === 'totalCount') as string[] | undefined
        assert(filter !== undefined)
        expect(filter).toEqual(['totalCount', '>', rawQuery])
      })
    })
  })

  describe('orderBy clause', () => {
    const orderByCases: Array<[string, 'asc' | 'desc', boolean]> = [
      ['same sort key for asc', 'asc', true],
      ['same sort key for desc', 'desc', true],
      ['different sort key for asc', 'asc', false],
      ['different sort key for desc', 'desc', false],
    ]
    orderByCases.forEach(([label, direction, isFirstQuery]) => {
      describe(label, () => {
        beforeEach(async () => {
          const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
          await getDirectionFolder(knexFake, spec)
        })
        it('should call orderBy once', () => {
          const query = isFirstQuery ? knexFirstCall : knexSecondCall
          expect(query.orderBy.mock.calls.length).toBe(1)
        })
        it('should order properly', () => {
          const query = isFirstQuery ? knexFirstCall : knexSecondCall
          const column = isFirstQuery ? 'path' : 'sortKey'
          expect(query.orderBy.mock.calls[0]).toEqual([column, direction])
        })
      })
    })
  })

  describe('limit clause', () => {
    const limitCases: Array<[string, 'asc' | 'desc', boolean]> = [
      ['same sort key query for asc', 'asc', true],
      ['same sort key query for desc', 'desc', true],
      ['different sort key query for asc', 'asc', false],
      ['different sort key query for desc', 'desc', false],
    ]
    limitCases.forEach(([label, direction, isFirstQuery]) => {
      describe(label, () => {
        beforeEach(async () => {
          const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
          await getDirectionFolder(knexFake, spec)
        })
        it('should call limit once', () => {
          const query = isFirstQuery ? knexFirstCall : knexSecondCall
          expect(query.limit.mock.calls.length).toBe(1)
        })
        it('should limit to 1', () => {
          const query = isFirstQuery ? knexFirstCall : knexSecondCall
          expect(query.limit.mock.calls[0]).toEqual([1])
        })
      })
    })
  })

  describe('union behavior', () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    it('should prefer first query result when both queries return records', async () => {
      knexFirstCall.limit.mockResolvedValue([{ path: '100' }])
      knexSecondCall.limit.mockResolvedValue([{ path: '200' }])
      const result = await getDirectionFolder(knexFake, spec)
      assert(result !== null)
      expect(result.path).toBe('100')
    })
    it('should fall back to second query result when first query returns empty', async () => {
      knexFirstCall.limit.mockResolvedValue([])
      knexSecondCall.limit.mockResolvedValue([{ path: '200' }])
      const result = await getDirectionFolder(knexFake, spec)
      assert(result !== null)
      expect(result.path).toBe('200')
    })
  })

  describe('result shape', () => {
    it('should resolve null when query finds no results', async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
      const result = await getDirectionFolder(knexFake, spec)
      expect(result).toBe(null)
    })

    describe('when second query returns a record', () => {
      let result: { path: string; name: string; cover: string | null } | null = null
      beforeEach(async () => {
        const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
        knexSecondCall.limit.mockResolvedValue([
          { path: '/foo/abcde0', current: '/foo/abcde0/image.png', firstPicture: '/foo/abcde0/otherImage.png' },
        ])
        result = await getDirectionFolder(knexFake, spec)
      })
      it('should resolve name from path segment', () => {
        assert(result !== null)
        expect(result.name).toBe('abcde0')
      })
      it('should resolve path', () => {
        assert(result !== null)
        expect(result.path).toBe('/foo/abcde0')
      })
      it('should resolve cover from current image', () => {
        assert(result !== null)
        expect(result.cover).toBe('/foo/abcde0/image.png')
      })
      it('should resolve exactly three properties', () => {
        assert(result !== null)
        expect(Object.keys(result)).toHaveLength(3)
      })
    })

    describe('when first query returns a record with special characters', () => {
      let result: { path: string; name: string; cover: string | null } | null = null
      beforeEach(async () => {
        const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
        knexFirstCall.limit.mockResolvedValue([
          { path: '/foo/abcde<0>', current: '/foo/abcde<0>/image.png', firstPicture: '/foo/abcde<0>/otherImage.png' },
        ])
        result = await getDirectionFolder(knexFake, spec)
      })
      it('should preserve raw name with special characters', () => {
        assert(result !== null)
        expect(result.name).toBe('abcde<0>')
      })
      it('should uri-encode path', () => {
        assert(result !== null)
        expect(result.path).toBe('/foo/abcde%3C0%3E')
      })
      it('should uri-encode cover', () => {
        assert(result !== null)
        expect(result.cover).toBe('/foo/abcde%3C0%3E/image.png')
      })
    })

    describe('with path empty (root folder)', () => {
      const spec: SiblingFolderSearch = { path: '', sortKey: 'foo69420', direction: 'asc', type: 'all' }
      it('should resolve cover from current image when set', async () => {
        knexSecondCall.limit.mockResolvedValue([
          { path: '/foo/abcde0', current: '/foo/abcde0/image.png', firstPicture: '/foo/abcde0/otherImage.png' },
        ])
        const result = await getDirectionFolder(knexFake, spec)
        assert(result !== null)
        expect(result.cover).toBe('/foo/abcde0/image.png')
      })
      it('should resolve with firstPicture as cover when current image not set', async () => {
        knexFirstCall.limit.mockResolvedValue([
          { path: '/foo/abcde0', current: null, firstPicture: '/foo/abcde0/otherImage.png' },
        ])
        const result = await getDirectionFolder(knexFake, spec)
        assert(result !== null)
        expect(result.cover).toBe('/foo/abcde0/otherImage.png')
      })
      it('should resolve with null cover when both current and firstPicture are null', async () => {
        knexFirstCall.limit.mockResolvedValue([{ path: '/foo/abcde0', current: null, firstPicture: null }])
        const result = await getDirectionFolder(knexFake, spec)
        assert(result !== null)
        expect(result.cover).toBe(null)
      })
    })
  })
})
