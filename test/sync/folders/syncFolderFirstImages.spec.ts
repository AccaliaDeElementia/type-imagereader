'use sanity'

import { syncFolderFirstImages, Imports } from '#sync/folders.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/folders syncFolderFirstImages()', () => {
  let { fake: loggerFake } = createLoggerFake(sandbox)
  let innerQueryBuilder = {
    select: sandbox.stub().returnsThis(),
    min: sandbox.stub().returnsThis(),
    from: sandbox.stub().returnsThis(),
    groupBy: sandbox.stub().returnsThis(),
  }
  let queryBuilder = {
    with: sandbox.stub().returnsThis(),
    select: sandbox.stub().returnsThis(),
    min: sandbox.stub().returnsThis(),
    from: sandbox.stub().returnsThis(),
    join: sandbox.stub().returnsThis(),
    innerJoin: sandbox.stub().returnsThis(),
    groupBy: sandbox.stub().returnsThis(),
    orderBy: sandbox.stub().resolves([]),
  }
  let queryBuilderStub = sandbox.stub().returns(queryBuilder)
  let knexInstanceStub = {
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    merge: sandbox.stub().resolves(0),
  }
  let knexFnStub = sandbox.stub().returns(knexInstanceStub)
  let knexFnFake = stubToKnex(knexFnStub)
  let chunkStub = sandbox.stub()
  beforeEach(() => {
    ;({ fake: loggerFake } = createLoggerFake(sandbox))
    innerQueryBuilder = {
      select: sandbox.stub().returnsThis(),
      min: sandbox.stub().returnsThis(),
      from: sandbox.stub().returnsThis(),
      groupBy: sandbox.stub().returnsThis(),
    }
    queryBuilder = {
      with: sandbox.stub().returnsThis(),
      select: sandbox.stub().returnsThis(),
      min: sandbox.stub().returnsThis(),
      from: sandbox.stub().returnsThis(),
      join: sandbox.stub().returnsThis(),
      innerJoin: sandbox.stub().returnsThis(),
      groupBy: sandbox.stub().returnsThis(),
      orderBy: sandbox.stub().resolves([]),
    }
    queryBuilderStub = sandbox.stub().returns(queryBuilder)
    knexInstanceStub = {
      insert: sandbox.stub().returnsThis(),
      onConflict: sandbox.stub().returnsThis(),
      merge: sandbox.stub().resolves(0),
    }
    knexFnStub = sandbox.stub().returns(knexInstanceStub)
    knexFnFake = stubToKnex(knexFnStub)
    chunkStub = sandbox.stub()
    knexFnFake.queryBuilder = queryBuilderStub
    chunkStub = sandbox.stub(Imports, 'chunk').returns([])
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call querybuilder once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilderStub.callCount).toBe(1)
  })
  it('should select from querybuilder with no arguments for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilderStub.firstCall.args).toHaveLength(0)
  })
  it('should call with once when creating CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.with.callCount).toBe(1)
  })
  it('should create CTE named firsts for inner select of primary sort keys', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.with.firstCall.args[0]).toBe('firsts')
  })
  it('should call select once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.select.callCount).toBe(1)
  })
  it('should select folder name in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.select.firstCall.args[0]).toBe('pictures.folder')
  })
  it('should call min once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.min.callCount).toBe(1)
  })
  it('should select minimum sortKey in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.min.firstCall.args[0]).toBe('pictures.sortKey as sortKey')
  })
  it('should call from once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.from.callCount).toBe(1)
  })
  it('should select from pictures table in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.from.firstCall.args[0]).toBe('pictures')
  })
  it('should call groupBy once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.groupBy.callCount).toBe(1)
  })
  it('should group by foldername in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.firstCall.args[1])(innerQueryBuilder)
    expect(innerQueryBuilder.groupBy.firstCall.args[0]).toBe('pictures.folder')
  })
  it('should call select once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.callCount).toBe(1)
  })
  it('should select folder path for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.firstCall.args).toContain('pictures.folder as path')
  })
  it('should also select folders.folder so the upsert satisfies NOT NULL on folder', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.firstCall.args).toContain('folders.folder as folder')
  })
  it('should also select folders.sortKey so the upsert satisfies NOT NULL on sortKey', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.firstCall.args).toContain('folders.sortKey as sortKey')
  })
  it('should call min once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.min.callCount).toBe(1)
  })
  it('should select minimum picture path for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.min.firstCall.args[0]).toBe('pictures.path as firstPicture')
  })
  it('should call from once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.from.callCount).toBe(1)
  })
  it('should select from firsts CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.from.firstCall.args[0]).toBe('firsts')
  })
  it('should call join once when joining pictures table to CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.join.callCount).toBe(1)
  })
  it('should join pictures table to CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.join.firstCall.args).toEqual([
      'pictures',
      { 'firsts.folder': 'pictures.folder', 'firsts.sortKey': 'pictures.sortKey' },
    ])
  })
  it('should call innerJoin once to restrict updates to existing folders', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.innerJoin.callCount).toBe(1)
  })
  it('should innerJoin folders on path to prevent inserting rows with null folder/sortKey', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.innerJoin.firstCall.args).toEqual(['folders', 'folders.path', 'pictures.folder'])
  })
  it('should call groupBy once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.callCount).toBe(1)
  })
  it('should group by foldername to prevent duplicates when first picture has non unique sortkey', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.firstCall.args).toContain('pictures.folder')
  })
  it('should also group by folders.folder so non-aggregated select column is permitted by Postgres', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.firstCall.args).toContain('folders.folder')
  })
  it('should also group by folders.sortKey so non-aggregated select column is permitted by Postgres', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.firstCall.args).toContain('folders.sortKey')
  })
  it('should call orderBy once', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.orderBy.callCount).toBe(1)
  })
  it('should order by foldername', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.orderBy.firstCall.args[0]).toEqual([{ column: 'pictures.folder' }])
  })
  it('should call chunk once for batched update', async () => {
    const results = { toUpdate: Math.random() }
    queryBuilder.orderBy.resolves(results)
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(chunkStub.callCount).toBe(1)
  })
  it('should chunk results for batched update', async () => {
    const results = { toUpdate: Math.random() }
    queryBuilder.orderBy.resolves(results)
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(chunkStub.firstCall.args[0]).toBe(results)
  })
  it('should call knex once per chunk when updating folders', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).toBe(1)
  })
  it('should update folders table for each chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexFnStub.firstCall.args).toEqual(['folders'])
  })
  it('should call insert once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.insert.callCount).toBe(1)
  })
  it('should insert chunk data when updating folders', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.insert.firstCall.args[0]).toBe(chunk)
  })
  it('should call onConflict once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.onConflict.callCount).toBe(1)
  })
  it('should resolve conflict on path column', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.onConflict.firstCall.args).toEqual(['path'])
  })
  it('should call merge once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.merge.callCount).toBe(1)
  })
  it('should merge only the firstPicture column on conflict', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.returns([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.merge.firstCall.args[0]).toEqual(['firstPicture'])
  })
})
