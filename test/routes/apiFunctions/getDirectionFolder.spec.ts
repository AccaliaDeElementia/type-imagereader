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
  const queryTableTests: Array<[string, 'asc' | 'desc', 'firstCall' | 'secondCall']> = [
    ['same-sortKey query (asc)', 'asc', 'firstCall'],
    ['different-sortKey query (asc)', 'asc', 'secondCall'],
    ['same-sortKey query (desc)', 'desc', 'firstCall'],
    ['different-sortKey query (desc)', 'desc', 'secondCall'],
  ]
  queryTableTests.forEach(([title, direction, call]) => {
    it(`should query folders table for ${title}`, async () => {
      const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction, type: 'all' }
      await getDirectionFolder(knexFake, spec)
      expect(knexStub[call].args[0]).toBe('folders')
    })
  })
  const selectTests = [
    ['same-sortKey query', () => knexFirstCall],
    ['different-sortKey query', () => knexSecondCall],
  ] as const
  const fields = ['path', 'current', 'firstPicture'] as const
  selectTests.forEach(([queryTitle, getQuery]) => {
    fields.forEach((field) => {
      it(`should select ${field} in ${queryTitle}`, async () => {
        const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
        await getDirectionFolder(knexFake, spec)
        expect(getQuery().select.firstCall.args).toContain(field)
      })
    })
  })
  it('should call where once for same sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).toBe(1)
  })
  it('should call andWhere twice for same sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    expect(knexFirstCall.andWhere.callCount).toBe(2)
  })
  it('should filter by folder for same sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).toEqual(['folder', '=', '/foo/'])
  })
  it('should filter by sortKey for same sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).toEqual(['sortKey', '=', 'foo69420'])
  })
  it('should filter by path for same sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const pathFilter = queries.find((arg) => arg[0] === 'path') as string[] | undefined
    assert(pathFilter !== undefined)
    expect(pathFilter).toEqual(['path', '>', '/foo/bar'])
  })
  it('should call where once for same sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).toBe(1)
  })
  it('should call andWhere twice for same sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    expect(knexFirstCall.andWhere.callCount).toBe(2)
  })
  it('should filter by folder for same sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).toEqual(['folder', '=', '/foo/'])
  })
  it('should filter by sortKey for same sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).toEqual(['sortKey', '=', 'foo69420'])
  })
  it('should filter by path for same sort key for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [
      knexFirstCall.where.firstCall.args,
      knexFirstCall.andWhere.firstCall.args,
      knexFirstCall.andWhere.secondCall.args,
    ]
    const pathFilter = queries.find((arg) => arg[0] === 'path') as string[] | undefined
    assert(pathFilter !== undefined)
    expect(pathFilter).toEqual(['path', '<', '/foo/bar'])
  })
  it('should call where once for same sortkey unread for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await getDirectionFolder(knexFake, spec)
    expect(knexFirstCall.where.callCount).toBe(1)
  })
  it('should call andWhere three times for same sortkey unread for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await getDirectionFolder(knexFake, spec)
    expect(knexFirstCall.andWhere.callCount).toBe(3)
  })
  it('should filter for totalCount greater than seenCount for same sortkey unread for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await getDirectionFolder(knexFake, spec)
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
  it('should call raw with seenCount for same sortkey unread for desc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'desc', type: 'unread' }
    const rawQuery = { raw: Math.random() }
    rawStub.returns(rawQuery)
    await getDirectionFolder(knexFake, spec)
    expect(rawStub.alwaysCalledWithExactly('"seenCount"')).toBe(true)
  })
  it('should call where once for different sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    expect(knexSecondCall.where.callCount).toBe(1)
  })
  it('should call andWhere once for different sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    expect(knexSecondCall.andWhere.callCount).toBe(1)
  })
  it('should filter by folder for different sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
    const folderFilter = queries.find((arg) => arg[0] === 'folder') as string[] | undefined
    assert(folderFilter !== undefined)
    expect(folderFilter).toEqual(['folder', '=', '/foo/'])
  })
  it('should filter by sortKey for different sort key for asc', async () => {
    const spec: SiblingFolderSearch = { path: '/foo/bar', sortKey: 'foo69420', direction: 'asc', type: 'all' }
    await getDirectionFolder(knexFake, spec)
    const queries = [knexSecondCall.where.firstCall.args, knexSecondCall.andWhere.firstCall.args]
    const sortKeyFilter = queries.find((arg) => arg[0] === 'sortKey') as string[] | undefined
    assert(sortKeyFilter !== undefined)
    expect(sortKeyFilter).toEqual(['sortKey', '>', 'foo69420'])
  })
})
