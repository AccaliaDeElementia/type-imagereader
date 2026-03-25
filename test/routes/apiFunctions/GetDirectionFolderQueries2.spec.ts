'use sanity'

import { expect } from 'chai'
import { Functions, type SiblingFolderSearch } from '#routes/apiFunctions'
import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards'
import assert from 'node:assert'

describe('routes/apiFunctions function GetDirectionFolder queries part 2', () => {
  let knexFirstCall = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    andWhere: Sinon.stub().returnsThis(),
    orderBy: Sinon.stub().returnsThis(),
    limit: Sinon.stub().returns([]),
  }
  let knexSecondCall = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    andWhere: Sinon.stub().returnsThis(),
    orderBy: Sinon.stub().returnsThis(),
    limit: Sinon.stub().returns([]),
  }
  let knexStub = Sinon.stub().onFirstCall().returns(knexFirstCall).onSecondCall().returns(knexSecondCall)
  let knexFake = StubToKnex(knexStub)
  const rawStub = Sinon.stub()
  beforeEach(() => {
    knexFirstCall = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      andWhere: Sinon.stub().returnsThis(),
      orderBy: Sinon.stub().returnsThis(),
      limit: Sinon.stub().returns([]),
    }
    knexSecondCall = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      andWhere: Sinon.stub().returnsThis(),
      orderBy: Sinon.stub().returnsThis(),
      limit: Sinon.stub().returns([]),
    }
    knexStub = Sinon.stub().onFirstCall().returns(knexFirstCall).onSecondCall().returns(knexSecondCall)
    knexFake = StubToKnex(knexStub)
    knexFake.raw = rawStub
  })
  it('should call where once for different sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.where.callCount).to.equal(1)
  })
  it('should call andWhere once for different sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.andWhere.callCount).to.equal(1)
  })
  it('should filter by folder for different sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).to.deep.equal(['folder', '=', '/foo/'])
  })
  it('should filter by sortKey for different sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).to.deep.equal(['sortKey', '<', 'foo69420'])
  })
  it('should call where once for same sortkey unread for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).to.equal(1)
  })
  it('should call andWhere three times for same sortkey unread for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.andWhere.callCount).to.equal(3)
  })
  it('should filter for totalCount greater than seenCount for same sortkey unread for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
      knexFirstCall.andWhere.thirdCall.args,
    ]
    const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
    assert(filter !== undefined)
    expect(filter).to.deep.equal(['totalCount', '>', rawQuery])
  })
  it('should call raw with seenCount for same sortkey unread for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(rawStub.alwaysCalledWithExactly('"seenCount"')).to.equal(true)
  })
  it('should call andWhere twice for different sortkey unread for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.andWhere.callCount).to.equal(2)
  })
  it('should filter for totalCount greater than seenCount for different sortkey unread for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    const queries = [knexSecondCall.andWhere.firstCall.args, knexSecondCall.andWhere.secondCall.args]
    const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
    assert(filter !== undefined)
    expect(filter).to.deep.equal(['totalCount', '>', rawQuery])
  })
  it('should call andWhere twice for different sortkey unread for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.andWhere.callCount).to.equal(2)
  })
  it('should filter for totalCount greater than seenCount for different sortkey unread for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    const queries = [knexSecondCall.andWhere.firstCall.args, knexSecondCall.andWhere.secondCall.args]
    const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
    assert(filter !== undefined)
    expect(filter).to.deep.equal(['totalCount', '>', rawQuery])
  })
  const orderByTests: Array<[string, 'asc' | 'desc', () => typeof knexFirstCall, string[]]> = [
    ['same sort key for asc', 'asc', () => knexFirstCall, ['path', 'asc']],
    ['same sort key for desc', 'desc', () => knexFirstCall, ['path', 'desc']],
    ['different sort key for asc', 'asc', () => knexSecondCall, ['sortKey', 'asc']],
    ['different sort key for desc', 'desc', () => knexSecondCall, ['sortKey', 'desc']],
  ]
  orderByTests.forEach(([title, direction, getQuery, expected]) => {
    it(`should call orderBy once for ${title}`, async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
      await Functions.GetDirectionFolder(knexFake, spec)
      expect(getQuery().orderBy.callCount).to.equal(1)
    })
    it(`should order properly for ${title}`, async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
      await Functions.GetDirectionFolder(knexFake, spec)
      expect(getQuery().orderBy.firstCall.args).to.deep.equal(expected)
    })
  })
  const limitTests: Array<[string, 'asc' | 'desc', () => typeof knexFirstCall]> = [
    ['same sort key query for asc', 'asc', () => knexFirstCall],
    ['same sort key query for desc', 'desc', () => knexFirstCall],
    ['different sort key query for asc', 'asc', () => knexSecondCall],
    ['different sort key query for desc', 'desc', () => knexSecondCall],
  ]
  limitTests.forEach(([title, direction, getQuery]) => {
    it(`should call limit once for ${title}`, async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
      await Functions.GetDirectionFolder(knexFake, spec)
      expect(getQuery().limit.callCount).to.equal(1)
    })
    it(`should limit ${title}`, async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
      await Functions.GetDirectionFolder(knexFake, spec)
      expect(getQuery().limit.firstCall.args).to.deep.equal([1])
    })
  })
  it('should union same sortkey and different sort key queries for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    knexFirstCall.limit.resolves([{ path: '100' }])
    knexSecondCall.limit.resolves([{ path: '200' }])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.path).to.equal('100')
  })
  it('should union same sortkey and different sort key queries for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    knexFirstCall.limit.resolves([])
    knexSecondCall.limit.resolves([{ path: '200' }])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.path).to.equal('200')
  })
  it('should resolve null when query finds no results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    expect(result).to.equal(null)
  })
  it('should resolve name from path segment when query finds results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexSecondCall.limit.resolves([
      { path: '/foo/abcde0', current: '/foo/abcde0/image.png', firstPicture: '/foo/abcde0/otherImage.png' },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.name).to.equal('abcde0')
  })
  it('should resolve path when query finds results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexSecondCall.limit.resolves([
      { path: '/foo/abcde0', current: '/foo/abcde0/image.png', firstPicture: '/foo/abcde0/otherImage.png' },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.path).to.equal('/foo/abcde0')
  })
  it('should resolve cover from current image when query finds results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexSecondCall.limit.resolves([
      { path: '/foo/abcde0', current: '/foo/abcde0/image.png', firstPicture: '/foo/abcde0/otherImage.png' },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.cover).to.equal('/foo/abcde0/image.png')
  })
  it('should resolve exactly three properties when query finds results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexSecondCall.limit.resolves([
      { path: '/foo/abcde0', current: '/foo/abcde0/image.png', firstPicture: '/foo/abcde0/otherImage.png' },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(Object.keys(result)).to.have.lengthOf(3)
  })
  it('should preserve raw name with special characters in result', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexFirstCall.limit.resolves([
      { path: '/foo/abcde<0>', current: '/foo/abcde<0>/image.png', firstPicture: '/foo/abcde<0>/otherImage.png' },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.name).to.equal('abcde<0>')
  })
  it('should uri-encode path when path contains special characters', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexFirstCall.limit.resolves([
      { path: '/foo/abcde<0>', current: '/foo/abcde<0>/image.png', firstPicture: '/foo/abcde<0>/otherImage.png' },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.path).to.equal('/foo/abcde%3C0%3E')
  })
  it('should uri-encode cover when path contains special characters', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexFirstCall.limit.resolves([
      { path: '/foo/abcde<0>', current: '/foo/abcde<0>/image.png', firstPicture: '/foo/abcde<0>/otherImage.png' },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.cover).to.equal('/foo/abcde%3C0%3E/image.png')
  })
  it('should resolve with current image as cover when set', async () => {
    const spec: SiblingFolderSearch = { path: '', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexSecondCall.limit.resolves([
      {
        path: '/foo/abcde0',
        current: '/foo/abcde0/image.png',
        firstPicture: '/foo/abcde0/otherImage.png',
      },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.cover).to.equal('/foo/abcde0/image.png')
  })
  it('should resolve with firstPicture as cover when current image not set', async () => {
    const spec: SiblingFolderSearch = { path: '', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexFirstCall.limit.resolves([
      {
        path: '/foo/abcde0',
        current: null,
        firstPicture: '/foo/abcde0/otherImage.png',
      },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.cover).to.equal('/foo/abcde0/otherImage.png')
  })
  it('should resolve with null cover when both current and firstPicture are null', async () => {
    const spec: SiblingFolderSearch = { path: '', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexFirstCall.limit.resolves([
      {
        path: '/foo/abcde0',
        current: null,
        firstPicture: null,
      },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(result.cover).to.equal(null)
  })
})
