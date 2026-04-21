'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

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
    innerJoin: Sinon.stub().returnsThis(),
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
      innerJoin: Sinon.stub().returnsThis(),
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
    chunkStub = sandbox.stub(Functions, 'Chunk').returns([])
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call querybuilder once for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilderStub.callCount).to.equal(1)
  })
  it('should select from querybuilder with no arguments for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilderStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should call with once when creating CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.with.callCount).to.equal(1)
  })
  it('should create CTE named firsts for inner select of primary sort keys', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.with.firstCall.args[0]).to.equal('firsts')
  })
  it('should call select once in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.select.callCount).to.equal(1)
  })
  it('should select folder name in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.select.firstCall.args[0]).to.equal('pictures.folder')
  })
  it('should call min once in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.min.callCount).to.equal(1)
  })
  it('should select minimum sortKey in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.min.firstCall.args[0]).to.equal('pictures.sortKey as sortKey')
  })
  it('should call from once in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.from.callCount).to.equal(1)
  })
  it('should select from pictures table in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.from.firstCall.args[0]).to.equal('pictures')
  })
  it('should call groupBy once in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.groupBy.callCount).to.equal(1)
  })
  it('should group by foldername in CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    Cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.groupBy.firstCall.args[0]).to.equal('pictures.folder')
  })
  it('should call select once for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.callCount).to.equal(1)
  })
  it('should select folder path for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.firstCall.args[0]).to.equal('pictures.folder as path')
  })
  it('should call min once for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.min.callCount).to.equal(1)
  })
  it('should select minimum picture path for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.min.firstCall.args[0]).to.equal('pictures.path as firstPicture')
  })
  it('should call from once for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.from.callCount).to.equal(1)
  })
  it('should select from firsts CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.from.firstCall.args[0]).to.equal('firsts')
  })
  it('should call join once when joining pictures table to CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.join.callCount).to.equal(1)
  })
  it('should join pictures table to CTE', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.join.firstCall.args).to.deep.equal([
      'pictures',
      { 'firsts.folder': 'pictures.folder', 'firsts.sortKey': 'pictures.sortKey' },
    ])
  })
  it('should call innerJoin once to restrict updates to existing folders', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.innerJoin.callCount).to.equal(1)
  })
  it('should innerJoin folders on path to prevent inserting rows with null folder/sortKey', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.innerJoin.firstCall.args).to.deep.equal(['folders', 'folders.path', 'pictures.folder'])
  })
  it('should call groupBy once for update', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.callCount).to.equal(1)
  })
  it('should group by foldername to prevent duplicates when first picture has non unique sortkey', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.firstCall.args[0]).to.equal('pictures.folder')
  })
  it('should call orderBy once', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.orderBy.callCount).to.equal(1)
  })
  it('should order by foldername', async () => {
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.orderBy.firstCall.args[0]).to.deep.equal([{ column: 'pictures.folder' }])
  })
  it('should call chunk once for batched update', async () => {
    const results = { toUpdate: Math.random() }
    queryBuilder.orderBy.resolves(results)
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(chunkStub.callCount).to.equal(1)
  })
  it('should chunk results for batched update', async () => {
    const results = { toUpdate: Math.random() }
    queryBuilder.orderBy.resolves(results)
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(chunkStub.firstCall.args[0]).to.equal(results)
  })
  it('should call knex once per chunk when updating folders', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it('should update folders table for each chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should call insert once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.insert.callCount).to.equal(1)
  })
  it('should insert chunk data when updating folders', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.insert.firstCall.args[0]).to.equal(chunk)
  })
  it('should call onConflict once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.onConflict.callCount).to.equal(1)
  })
  it('should resolve conflict on path column', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.onConflict.firstCall.args).to.deep.equal(['path'])
  })
  it('should call merge once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.merge.callCount).to.equal(1)
  })
  it('should merge with no arguments', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await Functions.SyncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.merge.firstCall.args).to.have.lengthOf(0)
  })
})
