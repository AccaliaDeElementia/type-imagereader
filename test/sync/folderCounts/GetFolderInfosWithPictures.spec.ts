'use sanity'

import { expect } from 'chai'
import { type FolderInfo, getFolderInfosWithPictures } from '#sync/folderCounts.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/TypeGuards.js'

const sandbox = Sinon.createSandbox()

describe('sync/folderCounts getFolderInfosWithPictures()', () => {
  let knexStub = {
    select: sandbox.stub().returnsThis(),
    count: sandbox.stub().returnsThis(),
    sum: sandbox.stub().returnsThis(),
    groupBy: sandbox.stub().resolves([]),
  }
  let knexFnStub: Sinon.SinonStub & { raw?: Sinon.SinonStub } = sandbox.stub().returns(knexStub)
  let knexFnFake = stubToKnex(knexFnStub)
  beforeEach(() => {
    knexStub = {
      select: sandbox.stub().returnsThis(),
      count: sandbox.stub().returnsThis(),
      sum: sandbox.stub().returnsThis(),
      groupBy: sandbox.stub().resolves([]),
    }
    knexFnStub = sandbox.stub().returns(knexStub)
    knexFnFake = stubToKnex(knexFnStub)
    knexFnStub.raw = sandbox.stub()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should handle empty results gracefully', async () => {
    const result = await getFolderInfosWithPictures(knexFnFake)
    expect(result).to.deep.equal([])
  })
  it('should resolve to exact result from knex', async () => {
    const expected: FolderInfo[] = []
    knexStub.groupBy.resolves(expected)
    const result = await getFolderInfosWithPictures(knexFnFake)
    expect(result).to.equal(expected)
  })
  it('should not alter totalCount of valid results', async () => {
    const expected: FolderInfo[] = [
      {
        path: 'foo',
        totalCount: 31415926,
        seenCount: 0,
      },
    ]
    knexStub.groupBy.resolves(expected)
    await getFolderInfosWithPictures(knexFnFake)
    expect(expected[0]?.totalCount).to.equal(31415926)
  })
  it('should correct totalCount to number for invalid results', async () => {
    const data = [
      cast<FolderInfo>({
        path: 'foo',
        totalCount: '31415926',
        seenCount: 0,
      }),
    ]
    knexStub.groupBy.resolves(data)
    await getFolderInfosWithPictures(knexFnFake)
    expect(data[0]?.totalCount).to.equal(31415926)
  })
  it('should not alter seenCount of valid results', async () => {
    const expected: FolderInfo[] = [
      {
        path: 'foo',
        seenCount: 31415926,
        totalCount: 0,
      },
    ]
    knexStub.groupBy.resolves(expected)
    await getFolderInfosWithPictures(knexFnFake)
    expect(expected[0]?.seenCount).to.equal(31415926)
  })
  it('should correct seenCount to number for invalid results', async () => {
    const data = [
      cast<FolderInfo>({
        path: 'foo',
        seenCount: '31415926',
        totalCount: 0,
      }),
    ]
    knexStub.groupBy.resolves(data)
    await getFolderInfosWithPictures(knexFnFake)
    expect(data[0]?.seenCount).to.equal(31415926)
  })
  it('should query knexFn', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it('should start knex query from pictures', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should call select query builder', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.select.callCount).to.equal(1)
  })
  it('should select folder with rename to path', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.select.firstCall.args).to.deep.equal(['folder as path'])
  })
  it('should call `count` query builder', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.count.callCount).to.equal(1)
  })
  it('should count splat as totalCount', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.count.firstCall.args).to.deep.equal(['* as totalCount'])
  })
  it('should embed raw query in query builder chain', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.returns(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.raw?.callCount).to.equal(1)
  })
  it('should use case when to count based on boolean field in raw subquery', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.returns(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.raw?.firstCall.args).to.deep.equal(['CASE WHEN seen THEN 1 ELSE 0 END'])
  })
  it('should use sum querybuilder in query chain', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.returns(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.sum.callCount).to.equal(1)
  })
  it('should sum seenCount from raw sub query', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.returns(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.sum.firstCall.args).to.deep.equal([{ seenCount: rawQuery }])
  })
  it('should group by as part of qery chain', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.returns(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.groupBy.callCount).to.equal(1)
  })
  it('should group by folders field', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.returns(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.groupBy.firstCall.args).to.deep.equal(['folder'])
  })
})
