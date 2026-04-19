'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalUpdateFolders()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let picturesStub = {
    count: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    sum: Sinon.stub().resolves([]),
  }
  let foldersStub = {
    where: Sinon.stub().returnsThis(),
    andWhere: Sinon.stub().returnsThis(),
    whereNot: Sinon.stub().returnsThis(),
    update: Sinon.stub().resolves(),
    delete: Sinon.stub().resolves(0),
  }
  let knexFnStub = Sinon.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(Sinon.stub()))
    picturesStub = {
      count: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      sum: Sinon.stub().resolves([]),
    }
    foldersStub = {
      where: Sinon.stub().returnsThis(),
      andWhere: Sinon.stub().returnsThis(),
      whereNot: Sinon.stub().returnsThis(),
      update: Sinon.stub().resolves(),
      delete: Sinon.stub().resolves(0),
    }
    knexFnStub = Sinon.stub()
    knexFnStub.withArgs('pictures').returns(picturesStub)
    knexFnStub.withArgs('folders').returns(foldersStub)
    Cast<Record<string, unknown>>(knexFnStub).raw = Sinon.stub().returns('CASE WHEN seen THEN 1 ELSE 0 END')
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should query picture counts once per affected folder', async () => {
    const folders = new Set(['/comics/', '/photos/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.where.callCount).to.equal(2)
  })

  it('should query pictures with LIKE prefix for first affected folder', async () => {
    const folders = new Set(['/comics/', '/photos/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.where.firstCall.args).to.deep.equal(['folder', 'like', '/comics/%'])
  })

  it('should query pictures with LIKE prefix for second affected folder', async () => {
    const folders = new Set(['/comics/', '/photos/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.where.secondCall.args).to.deep.equal(['folder', 'like', '/photos/%'])
  })

  it('should count totalCount in aggregate rollup query', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.count.calledWith({ totalCount: '*' })).to.equal(true)
  })

  it('should sum seenCount in aggregate rollup query', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.sum.callCount).to.equal(1)
  })

  it('should call update once per affected folder', async () => {
    picturesStub.sum.resolves([{ totalCount: '5', seenCount: '3' }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.callCount).to.equal(1)
  })

  it('should pass parsed rollup counts to folder update', async () => {
    picturesStub.sum.resolves([{ totalCount: '5', seenCount: '3' }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.firstCall.args[0]).to.deep.equal({ totalCount: 5, seenCount: 3 })
  })

  it('should update the correct folder path', async () => {
    picturesStub.sum.resolves([{ totalCount: '5', seenCount: '3' }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.where.calledWith({ path: '/comics/' })).to.equal(true)
  })

  it('should parse string counts to integers', async () => {
    picturesStub.sum.resolves([{ totalCount: '42', seenCount: '17' }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.firstCall.args[0]).to.deep.equal({ totalCount: 42, seenCount: 17 })
  })

  it('should update with zero counts when folder has no pictures in subtree', async () => {
    picturesStub.sum.resolves([])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.firstCall.args[0]).to.deep.equal({ totalCount: 0, seenCount: 0 })
  })

  it('should update with zero counts when sum returns null', async () => {
    picturesStub.sum.resolves([{ totalCount: '0', seenCount: null }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.firstCall.args[0]).to.deep.equal({ totalCount: 0, seenCount: 0 })
  })

  it('should update folders once per affected folder even when empty', async () => {
    picturesStub.sum.resolves([])
    const folders = new Set(['/comics/', '/photos/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.callCount).to.equal(2)
  })

  it('should prune empty folders', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.delete.callCount).to.equal(1)
  })

  it('should filter prune to folders with totalCount zero', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.where.calledWith('totalCount', '=', 0)).to.equal(true)
  })

  it('should exclude root folder from prune delete', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.andWhere.calledWith('path', '<>', '/')).to.equal(true)
  })

  it('should log summary with folder count and pruned count', async () => {
    foldersStub.delete.resolves(2)
    const folders = new Set(['/comics/', '/photos/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(loggerStub.lastCall.args[0]).to.equal('Incremental folder update: 2 folders checked, 2 empty folders pruned')
  })
})
