'use sanity'

import { getDirectionFolder, type SiblingFolderSearch } from '#routes/apiFunctions.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/typeGuards.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions getDirectionFolder', () => {
  let knexFirstCall = {
    select: sandbox.stub().returnsThis(),
    where: sandbox.stub().returnsThis(),
    andWhere: sandbox.stub().returnsThis(),
    orderBy: sandbox.stub().returnsThis(),
    limit: sandbox.stub().returns([]),
  }
  let knexSecondCall = {
    select: sandbox.stub().returnsThis(),
    where: sandbox.stub().returnsThis(),
    andWhere: sandbox.stub().returnsThis(),
    orderBy: sandbox.stub().returnsThis(),
    limit: sandbox.stub().returns([]),
  }
  let knexStub = sandbox.stub().onFirstCall().returns(knexFirstCall).onSecondCall().returns(knexSecondCall)
  let knexFake = stubToKnex(knexStub)
  const rawStub = sandbox.stub()
  beforeEach(() => {
    knexFirstCall = {
      select: sandbox.stub().returnsThis(),
      where: sandbox.stub().returnsThis(),
      andWhere: sandbox.stub().returnsThis(),
      orderBy: sandbox.stub().returnsThis(),
      limit: sandbox.stub().returns([]),
    }
    knexSecondCall = {
      select: sandbox.stub().returnsThis(),
      where: sandbox.stub().returnsThis(),
      andWhere: sandbox.stub().returnsThis(),
      orderBy: sandbox.stub().returnsThis(),
      limit: sandbox.stub().returns([]),
    }
    knexStub = sandbox.stub().onFirstCall().returns(knexFirstCall).onSecondCall().returns(knexSecondCall)
    knexFake = stubToKnex(knexStub)
    knexFake.raw = rawStub
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('queries the folders table', () => {
    const queryCases: Array<[string, 'asc' | 'desc', 'firstCall' | 'secondCall']> = [
      ['same-sortKey query (asc)', 'asc', 'firstCall'],
      ['different-sortKey query (asc)', 'asc', 'secondCall'],
      ['same-sortKey query (desc)', 'desc', 'firstCall'],
      ['different-sortKey query (desc)', 'desc', 'secondCall'],
    ]
    queryCases.forEach(([label, direction, call]) => {
      it(`should query folders table for ${label}`, async () => {
        const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
        await getDirectionFolder(knexFake, spec)
        expect(knexStub[call].args[0]).toBe('folders')
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
        expect(query.select.firstCall.args).toContain(field)
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
        expect(knexFirstCall.where.callCount).toBe(1)
      })
      it('should call andWhere twice', () => {
        expect(knexFirstCall.andWhere.callCount).toBe(2)
      })
      it('should filter by folder', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
        ]
        const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
        ]
        const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
        assert(sortKeyFilter !== undefined)
        expect(sortKeyFilter).toEqual(['sortKey', '=', 'foo69420'])
      })
      it('should filter by path with > operator', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
        ]
        const pathFilter = queries.find((arg) => arg[0] === 'path') as string[] | undefined
        assert(pathFilter !== undefined)
        expect(pathFilter).toEqual(['path', '>', '/foo/bar'])
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call where once', () => {
        expect(knexSecondCall.where.callCount).toBe(1)
      })
      it('should call andWhere once', () => {
        expect(knexSecondCall.andWhere.callCount).toBe(1)
      })
      it('should filter by folder', () => {
        const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
        const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey with > operator', () => {
        const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
        const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
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
        expect(knexFirstCall.where.callCount).toBe(1)
      })
      it('should call andWhere twice', () => {
        expect(knexFirstCall.andWhere.callCount).toBe(2)
      })
      it('should filter by folder', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
        ]
        const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
        ]
        const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
        assert(sortKeyFilter !== undefined)
        expect(sortKeyFilter).toEqual(['sortKey', '=', 'foo69420'])
      })
      it('should filter by path with < operator', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
        ]
        const pathFilter = queries.find((arg) => arg[0] === 'path') as string[] | undefined
        assert(pathFilter !== undefined)
        expect(pathFilter).toEqual(['path', '<', '/foo/bar'])
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call where once', () => {
        expect(knexSecondCall.where.callCount).toBe(1)
      })
      it('should call andWhere once', () => {
        expect(knexSecondCall.andWhere.callCount).toBe(1)
      })
      it('should filter by folder', () => {
        const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
        const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
        assert(folderFilter !== undefined)
        expect(folderFilter).toEqual(['folder', '=', '/foo/'])
      })
      it('should filter by sortKey with < operator', () => {
        const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
        const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
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
      rawStub.returns(rawQuery)
      await getDirectionFolder(knexFake, spec)
    })
    describe('first query (same sortkey)', () => {
      it('should call where once', () => {
        expect(knexFirstCall.where.callCount).toBe(1)
      })
      it('should call andWhere three times', () => {
        expect(knexFirstCall.andWhere.callCount).toBe(3)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
          knexFirstCall.andWhere.thirdCall.args,
        ]
        const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
        assert(filter !== undefined)
        expect(filter).toEqual(['totalCount', '>', rawQuery])
      })
      it('should call raw with seenCount', () => {
        expect(rawStub.alwaysCalledWithExactly('"seenCount"')).toBe(true)
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call andWhere twice', () => {
        expect(knexSecondCall.andWhere.callCount).toBe(2)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [knexSecondCall.andWhere.firstCall.args, knexSecondCall.andWhere.secondCall.args]
        const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
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
      rawStub.returns(rawQuery)
      await getDirectionFolder(knexFake, spec)
    })
    describe('first query (same sortkey)', () => {
      it('should call where once', () => {
        expect(knexFirstCall.where.callCount).toBe(1)
      })
      it('should call andWhere three times', () => {
        expect(knexFirstCall.andWhere.callCount).toBe(3)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [
          knexFirstCall.where.firstCall.args,
          knexFirstCall.andWhere.firstCall.args,
          knexFirstCall.andWhere.secondCall.args,
          knexFirstCall.andWhere.thirdCall.args,
        ]
        const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
        assert(filter !== undefined)
        expect(filter).toEqual(['totalCount', '>', rawQuery])
      })
      it('should call raw with seenCount', () => {
        expect(rawStub.alwaysCalledWithExactly('"seenCount"')).toBe(true)
      })
    })
    describe('second query (different sortkey)', () => {
      it('should call andWhere twice', () => {
        expect(knexSecondCall.andWhere.callCount).toBe(2)
      })
      it('should filter totalCount greater than seenCount', () => {
        const queries = [knexSecondCall.andWhere.firstCall.args, knexSecondCall.andWhere.secondCall.args]
        const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
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
          expect(query.orderBy.callCount).toBe(1)
        })
        it('should order properly', () => {
          const query = isFirstQuery ? knexFirstCall : knexSecondCall
          const column = isFirstQuery ? 'path' : 'sortKey'
          expect(query.orderBy.firstCall.args).toEqual([column, direction])
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
          expect(query.limit.callCount).toBe(1)
        })
        it('should limit to 1', () => {
          const query = isFirstQuery ? knexFirstCall : knexSecondCall
          expect(query.limit.firstCall.args).toEqual([1])
        })
      })
    })
  })

  describe('union behavior', () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    it('should prefer first query result when both queries return records', async () => {
      knexFirstCall.limit.resolves([{ path: '100' }])
      knexSecondCall.limit.resolves([{ path: '200' }])
      const result = await getDirectionFolder(knexFake, spec)
      assert(result !== null)
      expect(result.path).toBe('100')
    })
    it('should fall back to second query result when first query returns empty', async () => {
      knexFirstCall.limit.resolves([])
      knexSecondCall.limit.resolves([{ path: '200' }])
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
        knexSecondCall.limit.resolves([
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
        knexFirstCall.limit.resolves([
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
        knexSecondCall.limit.resolves([
          { path: '/foo/abcde0', current: '/foo/abcde0/image.png', firstPicture: '/foo/abcde0/otherImage.png' },
        ])
        const result = await getDirectionFolder(knexFake, spec)
        assert(result !== null)
        expect(result.cover).toBe('/foo/abcde0/image.png')
      })
      it('should resolve with firstPicture as cover when current image not set', async () => {
        knexFirstCall.limit.resolves([
          { path: '/foo/abcde0', current: null, firstPicture: '/foo/abcde0/otherImage.png' },
        ])
        const result = await getDirectionFolder(knexFake, spec)
        assert(result !== null)
        expect(result.cover).toBe('/foo/abcde0/otherImage.png')
      })
      it('should resolve with null cover when both current and firstPicture are null', async () => {
        knexFirstCall.limit.resolves([{ path: '/foo/abcde0', current: null, firstPicture: null }])
        const result = await getDirectionFolder(knexFake, spec)
        assert(result !== null)
        expect(result.cover).toBe(null)
      })
    })
  })
})
