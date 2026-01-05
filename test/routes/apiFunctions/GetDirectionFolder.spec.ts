'use sanity'

import { expect } from 'chai'
import { Functions, type SiblingFolderSearch } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'
import assert from 'node:assert'

describe('routes/apiFunctions function GetDirectionFolder', () => {
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
  it('should select from folders twice for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexStub.callCount).to.equal(2)
    expect(knexStub.firstCall.args).to.have.lengthOf(1)
    expect(knexStub.firstCall.args[0]).to.equal('folders')
    expect(knexStub.secondCall.args).to.have.lengthOf(1)
    expect(knexStub.secondCall.args[0]).to.equal('folders')
  })
  it('should select from folders twice for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexStub.callCount).to.equal(2)
    expect(knexStub.firstCall.args).to.have.lengthOf(1)
    expect(knexStub.firstCall.args[0]).to.equal('folders')
    expect(knexStub.secondCall.args).to.have.lengthOf(1)
    expect(knexStub.secondCall.args[0]).to.equal('folders')
  })
  it('should select same colums both times for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.select.callCount).to.equal(1)
    expect(knexFirstCall.select.firstCall.args).to.have.lengthOf(3)
    expect(knexFirstCall.select.firstCall.args).to.include('path')
    expect(knexFirstCall.select.firstCall.args).to.include('current')
    expect(knexFirstCall.select.firstCall.args).to.include('firstPicture')
    expect(knexSecondCall.select.callCount).to.equal(1)
    expect(knexSecondCall.select.firstCall.args).to.have.lengthOf(3)
    expect(knexSecondCall.select.firstCall.args).to.include('path')
    expect(knexSecondCall.select.firstCall.args).to.include('current')
    expect(knexSecondCall.select.firstCall.args).to.include('firstPicture')
  })
  it('should select same colums both times for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.select.callCount).to.equal(1)
    expect(knexFirstCall.select.firstCall.args).to.have.lengthOf(3)
    expect(knexFirstCall.select.firstCall.args).to.include('path')
    expect(knexFirstCall.select.firstCall.args).to.include('current')
    expect(knexFirstCall.select.firstCall.args).to.include('firstPicture')
    expect(knexSecondCall.select.callCount).to.equal(1)
    expect(knexSecondCall.select.firstCall.args).to.have.lengthOf(3)
    expect(knexSecondCall.select.firstCall.args).to.include('path')
    expect(knexSecondCall.select.firstCall.args).to.include('current')
    expect(knexSecondCall.select.firstCall.args).to.include('firstPicture')
  })
  it('should filter for same sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).to.equal(1)
    expect(knexFirstCall.andWhere.callCount).to.equal(2)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('=')
    expect(sortKeyFilter[2]).to.equal('foo69420')
    const pathFilter = queries.find((arg) => arg[0] === 'path') as string[] | undefined
    assert(pathFilter !== undefined)
    expect(pathFilter).to.have.lengthOf(3)
    expect(pathFilter[0]).to.equal('path')
    expect(pathFilter[1]).to.equal('>')
    expect(pathFilter[2]).to.equal('/foo/bar')
  })
  it('should filter for same sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).to.equal(1)
    expect(knexFirstCall.andWhere.callCount).to.equal(2)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('=')
    expect(sortKeyFilter[2]).to.equal('foo69420')
    const pathFilter = queries.find((arg) => arg[0] === 'path') as string[] | undefined
    assert(pathFilter !== undefined)
    expect(pathFilter).to.have.lengthOf(3)
    expect(pathFilter[0]).to.equal('path')
    expect(pathFilter[1]).to.equal('<')
    expect(pathFilter[2]).to.equal('/foo/bar')
  })
  it('should filter for only unread on same sortkey for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).to.equal(1)
    expect(knexFirstCall.andWhere.callCount).to.equal(3)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
      knexFirstCall.andWhere.thirdCall.args,
    ]
    const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
    assert(filter !== undefined)
    expect(filter).to.have.lengthOf(3)
    expect(filter[0]).to.equal('totalCount')
    expect(filter[1]).to.equal('>')
    expect(filter[2]).to.equal(rawQuery)
    expect(rawStub.alwaysCalledWithExactly('"seenCount"')).to.equal(true)
  })
  it('should filter for different sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.where.callCount).to.equal(1)
    expect(knexSecondCall.andWhere.callCount).to.equal(1)
    const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('>')
    expect(sortKeyFilter[2]).to.equal('foo69420')
  })
  it('should filter for different sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.where.callCount).to.equal(1)
    expect(knexSecondCall.andWhere.callCount).to.equal(1)
    const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('<')
    expect(sortKeyFilter[2]).to.equal('foo69420')
  })
  it('should filter for only unread on same sortkey for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).to.equal(1)
    expect(knexFirstCall.andWhere.callCount).to.equal(3)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
      knexFirstCall.andWhere.thirdCall.args,
    ]
    const filter = queries.find((arg) => arg[0] === 'totalCount') as string[] | undefined
    assert(filter !== undefined)
    expect(filter).to.have.lengthOf(3)
    expect(filter[0]).to.equal('totalCount')
    expect(filter[1]).to.equal('>')
    expect(filter[2]).to.equal(rawQuery)
    expect(rawStub.alwaysCalledWithExactly('"seenCount"')).to.equal(true)
  })
  it('should order properly for same sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.orderBy.callCount).to.equal(1)
    expect(knexFirstCall.orderBy.firstCall.args).to.deep.equal(['path', 'asc'])
  })
  it('should order properly for same sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.orderBy.callCount).to.equal(1)
    expect(knexFirstCall.orderBy.firstCall.args).to.deep.equal(['path', 'desc'])
  })
  it('should order properly for different sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.orderBy.callCount).to.equal(1)
    expect(knexSecondCall.orderBy.firstCall.args).to.deep.equal(['sortKey', 'asc'])
  })
  it('should order properly for different sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.orderBy.callCount).to.equal(1)
    expect(knexSecondCall.orderBy.firstCall.args).to.deep.equal(['sortKey', 'desc'])
  })
  it('should limit same sort key query for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.limit.callCount).to.equal(1)
    expect(knexFirstCall.limit.firstCall.args).to.deep.equal([1])
  })
  it('should limit same sort key query for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexFirstCall.limit.callCount).to.equal(1)
    expect(knexFirstCall.limit.firstCall.args).to.deep.equal([1])
  })
  it('should limit different sort key query for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.limit.callCount).to.equal(1)
    expect(knexSecondCall.limit.firstCall.args).to.deep.equal([1])
  })
  it('should limit different sort key query for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await Functions.GetDirectionFolder(knexFake, spec)
    expect(knexSecondCall.limit.callCount).to.equal(1)
    expect(knexSecondCall.limit.firstCall.args).to.deep.equal([1])
  })
  it('should union same sortkey and different sort key queries for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    knexFirstCall.limit.resolves([{ path: '100' }])
    knexSecondCall.limit.resolves([{ path: '200' }])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result != null)
    expect(result.path).to.equal('100')
  })
  it('should union same sortkey and different sort key queries for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    knexFirstCall.limit.resolves([])
    knexSecondCall.limit.resolves([{ path: '200' }])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result != null)
    expect(result.path).to.equal('200')
  })
  it('should resolve null when query finds no results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    expect(result).to.equal(null)
  })
  it('should resolve parsed result when query finds results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexSecondCall.limit.resolves([
      {
        path: '/foo/abcde0',
        current: '/foo/abcde0/image.png',
        firstPicture: '/foo/abcde0/otherImage.png',
      },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(Object.keys(result)).to.have.lengthOf(3)
    expect(result.name).to.equal('abcde0')
    expect(result.path).to.equal('/foo/abcde0')
    expect(result.cover).to.equal('/foo/abcde0/image.png')
  })
  it('should resolve uri safe results when query finds results', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    knexFirstCall.limit.resolves([
      {
        path: '/foo/abcde<0>',
        current: '/foo/abcde<0>/image.png',
        firstPicture: '/foo/abcde<0>/otherImage.png',
      },
    ])
    const result = await Functions.GetDirectionFolder(knexFake, spec)
    assert(result !== null)
    expect(Object.keys(result)).to.have.lengthOf(3)
    expect(result.name).to.equal('abcde<0>')
    expect(result.path).to.equal('/foo/abcde%3C0%3E')
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
})
