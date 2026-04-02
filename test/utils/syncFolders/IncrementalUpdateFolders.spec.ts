'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/syncfolders'
import type { FolderInfo } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalUpdateFolders()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let picturesStub = {
    select: Sinon.stub().returnsThis(),
    count: Sinon.stub().returnsThis(),
    sum: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    groupBy: Sinon.stub().resolves([]),
  }
  let foldersStub = {
    where: Sinon.stub().returnsThis(),
    update: Sinon.stub().resolves(),
    insert: Sinon.stub().returnsThis(),
    onConflict: Sinon.stub().returnsThis(),
    merge: Sinon.stub().resolves(),
    delete: Sinon.stub().resolves(0),
  }
  let knexFnStub = Sinon.stub()
  let knexFnFake = StubToKnex(knexFnStub)
  let getAllFolderInfosStub = Sinon.stub()
  let getFolderInfosWithPicturesStub = Sinon.stub()
  let calculateFolderInfosStub = Sinon.stub()
  let execChunksSynchronouslyStub = Sinon.stub()
  let chunkStub = Sinon.stub()

  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(Sinon.stub()))
    picturesStub = {
      select: Sinon.stub().returnsThis(),
      count: Sinon.stub().returnsThis(),
      sum: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      groupBy: Sinon.stub().resolves([]),
    }
    foldersStub = {
      where: Sinon.stub().returnsThis(),
      update: Sinon.stub().resolves(),
      insert: Sinon.stub().returnsThis(),
      onConflict: Sinon.stub().returnsThis(),
      merge: Sinon.stub().resolves(),
      delete: Sinon.stub().resolves(0),
    }
    knexFnStub = Sinon.stub()
    knexFnStub.withArgs('pictures').returns(picturesStub)
    knexFnStub.withArgs('folders').returns(foldersStub)
    Cast<Record<string, unknown>>(knexFnStub).raw = Sinon.stub().returns('CASE WHEN seen THEN 1 ELSE 0 END')
    knexFnFake = StubToKnex(knexFnStub)
    getAllFolderInfosStub = sandbox.stub(Functions, 'GetAllFolderInfos').resolves({})
    getFolderInfosWithPicturesStub = sandbox.stub(Functions, 'GetFolderInfosWithPictures').resolves([])
    calculateFolderInfosStub = sandbox.stub(Functions, 'CalculateFolderInfos').returns([])
    chunkStub = sandbox.stub(Functions, 'Chunk').returns([])
    execChunksSynchronouslyStub = sandbox.stub(Functions, 'ExecChunksSynchronously').resolves()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should query picture counts for each affected folder', async () => {
    const folders = new Set(['/comics/', '/photos/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.where.callCount).to.equal(2)
    expect(picturesStub.where.firstCall.args).to.deep.equal(['folder', '/comics/'])
    expect(picturesStub.where.secondCall.args).to.deep.equal(['folder', '/photos/'])
  })

  it('should select folder as path in aggregate query', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.select.calledWith('folder as path')).to.equal(true)
  })

  it('should count totalCount in aggregate query', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.count.calledWith('* as totalCount')).to.equal(true)
  })

  it('should group by folder in aggregate query', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(picturesStub.groupBy.calledWith('folder')).to.equal(true)
  })

  it('should update folder counts when pictures exist', async () => {
    picturesStub.groupBy.resolves([{ path: '/comics/', totalCount: '5', seenCount: '3' }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.callCount).to.equal(1)
    expect(foldersStub.update.firstCall.args[0]).to.deep.equal({ totalCount: 5, seenCount: 3 })
  })

  it('should update correct folder path', async () => {
    picturesStub.groupBy.resolves([{ path: '/comics/', totalCount: '5', seenCount: '3' }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.where.calledWith({ path: '/comics/' })).to.equal(true)
  })

  it('should parse string counts to integers', async () => {
    picturesStub.groupBy.resolves([{ path: '/comics/', totalCount: '42', seenCount: '17' }])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.firstCall.args[0]).to.deep.equal({ totalCount: 42, seenCount: 17 })
  })

  it('should skip update when folder has no pictures', async () => {
    picturesStub.groupBy.resolves([])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.update.callCount).to.equal(0)
  })

  it('should call GetAllFolderInfos to propagate counts', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(getAllFolderInfosStub.callCount).to.equal(1)
  })

  it('should call GetFolderInfosWithPictures to propagate counts', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(getFolderInfosWithPicturesStub.callCount).to.equal(1)
  })

  it('should call CalculateFolderInfos with folder data', async () => {
    const allFolders = { '/': { path: '/', totalCount: 0, seenCount: 0 } }
    const folderInfos: FolderInfo[] = [{ path: '/comics/', totalCount: 5, seenCount: 3 }]
    getAllFolderInfosStub.resolves(allFolders)
    getFolderInfosWithPicturesStub.resolves(folderInfos)
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(calculateFolderInfosStub.calledWith(allFolders, folderInfos)).to.equal(true)
  })

  it('should chunk and execute folder updates', async () => {
    calculateFolderInfosStub.returns([{ path: '/', totalCount: 5, seenCount: 3 }])
    chunkStub.returns([[{ path: '/', totalCount: 5, seenCount: 3 }]])
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(execChunksSynchronouslyStub.callCount).to.equal(1)
  })

  it('should insert folder chunks with onConflict merge', async () => {
    const chunk = [{ path: '/', totalCount: 5, seenCount: 3 }]
    calculateFolderInfosStub.returns(chunk)
    chunkStub.returns([chunk])
    execChunksSynchronouslyStub.restore()
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.insert.calledWith(chunk)).to.equal(true)
    expect(foldersStub.onConflict.calledWith('path')).to.equal(true)
    expect(foldersStub.merge.callCount).to.equal(1)
  })

  it('should prune empty folders', async () => {
    const folders = new Set(['/comics/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(foldersStub.delete.callCount).to.equal(1)
  })

  it('should log summary with folder count and pruned count', async () => {
    foldersStub.delete.resolves(2)
    const folders = new Set(['/comics/', '/photos/'])
    await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, folders)
    expect(loggerStub.lastCall.args[0]).to.equal('Incremental folder update: 2 folders checked, 2 empty folders pruned')
  })
})
