'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function SyncFolderFirstImages()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let innerQueryBuilder = {
    select: Sinon.stub().returnsThis(),
    min: Sinon.stub().returnsThis(),
    from: Sinon.stub().returnsThis(),
    groupBy: Sinon.stub().returnsThis(),
  }
  let queryBuilder = {
    with: Sinon.stub().returnsThis(),
    select: Sinon.stub().returnsThis(),
    min: Sinon.stub().returnsThis(),
    from: Sinon.stub().returnsThis(),
    join: Sinon.stub().returnsThis(),
    groupBy: Sinon.stub().returnsThis(),
    orderBy: Sinon.stub().resolves([]),
  }
  let queryBuilderStub = Sinon.stub().returns(queryBuilder)
  let knexInstanceStub = {
    insert: Sinon.stub().returnsThis(),
    onConflict: Sinon.stub().returnsThis(),
    merge: Sinon.stub().resolves(0),
  }
  let knexFnStub = Sinon.stub().returns(knexInstanceStub)
  let knexFnFake = StubToKnex(knexFnStub)
  let chunkStub = Sinon.stub()
  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    innerQueryBuilder = {
      select: Sinon.stub().returnsThis(),
      min: Sinon.stub().returnsThis(),
      from: Sinon.stub().returnsThis(),
      groupBy: Sinon.stub().returnsThis(),
    }
    queryBuilder = {
      with: Sinon.stub().returnsThis(),
      select: Sinon.stub().returnsThis(),
      min: Sinon.stub().returnsThis(),
      from: Sinon.stub().returnsThis(),
      join: Sinon.stub().returnsThis(),
      groupBy: Sinon.stub().returnsThis(),
      orderBy: Sinon.stub().resolves([]),
    }
    queryBuilderStub = Sinon.stub().returns(queryBuilder)
    knexInstanceStub = {
      insert: Sinon.stub().returnsThis(),
      onConflict: Sinon.stub().returnsThis(),
      merge: Sinon.stub().resolves(0),
    }
    knexFnStub = Sinon.stub().returns(knexInstanceStub)
    knexFnFake = StubToKnex(knexFnStub)
    chunkStub = Sinon.stub()
    knexFnFake.queryBuilder = queryBuilderStub
    chunkStub = Sinon.stub(Functions, 'Chunk').returns([])
  })
  afterEach(() => {
    chunkStub.restore()
  })
  it('should select from querybuilder for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilderStub.callCount).to.equal(1)
    expect(queryBuilderStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should create CTE for inner select of primary sort keys', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.with.callCount).to.equal(1)
    expect(queryBuilder.with.firstCall.args).to.have.lengthOf(2)
    expect(queryBuilder.with.firstCall.args[0]).to.equal('firsts')
  })
  it('should select folder name in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.select.callCount).to.equal(1)
    expect(innerQueryBuilder.select.firstCall.args).to.have.lengthOf(1)
    expect(innerQueryBuilder.select.firstCall.args[0]).to.equal('pictures.folder')
  })
  it('should select minimum sortKey in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.min.callCount).to.equal(1)
    expect(innerQueryBuilder.min.firstCall.args).to.have.lengthOf(1)
    expect(innerQueryBuilder.min.firstCall.args[0]).to.equal('pictures.sortKey as sortKey')
  })
  it('should select from pictures table in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.from.callCount).to.equal(1)
    expect(innerQueryBuilder.from.firstCall.args).to.have.lengthOf(1)
    expect(innerQueryBuilder.from.firstCall.args[0]).to.equal('pictures')
  })
  it('should group by foldername in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.groupBy.callCount).to.equal(1)
    expect(innerQueryBuilder.groupBy.firstCall.args).to.have.lengthOf(1)
    expect(innerQueryBuilder.groupBy.firstCall.args[0]).to.equal('pictures.folder')
  })
  it('should select folder path for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.callCount).to.equal(1)
    expect(queryBuilder.select.firstCall.args).to.have.lengthOf(1)
    expect(queryBuilder.select.firstCall.args[0]).to.equal('pictures.folder as path')
  })
  it('should minimum picture path for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.min.callCount).to.equal(1)
    expect(queryBuilder.min.firstCall.args).to.have.lengthOf(1)
    expect(queryBuilder.min.firstCall.args[0]).to.equal('pictures.path as firstPicture')
  })
  it('should select from firsts CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.from.callCount).to.equal(1)
    expect(queryBuilder.from.firstCall.args).to.have.lengthOf(1)
    expect(queryBuilder.from.firstCall.args[0]).to.equal('firsts')
  })
  it('should join pictures table to CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.join.callCount).to.equal(1)
    expect(queryBuilder.join.firstCall.args).to.have.lengthOf(2)
    expect(queryBuilder.join.firstCall.args[0]).to.equal('pictures')
    expect(queryBuilder.join.firstCall.args[1]).to.deep.equal({
      'firsts.folder': 'pictures.folder',
      'firsts.sortKey': 'pictures.sortKey',
    })
  })
  it('should group by foldername to prevent duplicates when first picture has non unique sortkey', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.callCount).to.equal(1)
    expect(queryBuilder.groupBy.firstCall.args).to.have.lengthOf(1)
    expect(queryBuilder.groupBy.firstCall.args[0]).to.equal('pictures.folder')
  })
  it('should order by foldername and full path', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.orderBy.callCount).to.equal(1)
    expect(queryBuilder.orderBy.firstCall.args).to.have.lengthOf(2)
    expect(queryBuilder.orderBy.firstCall.args[0]).to.equal('pictures.folder')
    expect(queryBuilder.orderBy.firstCall.args[1]).to.equal('pictures.path')
  })
  it('should chunk results for batched update', async () => {
    const results = { toUpdate: Math.random() }
    queryBuilder.orderBy.resolves(results)
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(chunkStub.callCount).to.equal(1)
    expect(chunkStub.firstCall.args).to.have.lengthOf(1)
    expect(chunkStub.firstCall.args[0]).to.equal(results)
  })
  it('should update folders for each chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
    expect(knexInstanceStub.insert.callCount).to.equal(1)
    expect(knexInstanceStub.insert.firstCall.args).to.have.lengthOf(1)
    expect(knexInstanceStub.insert.firstCall.args[0]).to.equal(chunk)
    expect(knexInstanceStub.onConflict.callCount).to.equal(1)
    expect(knexInstanceStub.onConflict.firstCall.args).to.deep.equal(['path'])
    expect(knexInstanceStub.merge.callCount).to.equal(1)
    expect(knexInstanceStub.merge.firstCall.args).to.have.lengthOf(0)
  })
})
