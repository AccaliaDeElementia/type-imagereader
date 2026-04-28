'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'
import { createKnexChainFake } from '#testutils/Knex'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function UpdateFolderPictureCounts()', () => {
  let getFolderInfosWithPicturesStub = sandbox.stub()
  let getAllFolderInfosStub = sandbox.stub()
  let calculateFolderInfosStub = sandbox.stub()
  let chunkStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let {
    instance: knexStub,
    stub: knexFnStub,
    fake: knexFnFake,
  } = createKnexChainFake(['insert', 'onConflict'] as const, ['merge'] as const, undefined)
  beforeEach(() => {
    ;({
      instance: knexStub,
      stub: knexFnStub,
      fake: knexFnFake,
    } = createKnexChainFake(['insert', 'onConflict'] as const, ['merge'] as const, undefined))
    loggerStub = sandbox.stub()
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    getFolderInfosWithPicturesStub = sandbox.stub(Functions, 'GetFolderInfosWithPictures').resolves([])
    getAllFolderInfosStub = sandbox.stub(Functions, 'GetAllFolderInfos').resolves({})
    calculateFolderInfosStub = sandbox.stub(Functions, 'CalculateFolderInfos').returns([])
    chunkStub = sandbox.stub(Functions, 'Chunk').returns([])
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should construct prefixed logger', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(`${Imports.logPrefix}:`), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':updateSeen'), 'Logger should be suffixed with `updateSeen`')
  })
  it('should call GetFolderInfosWithPictures once', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.callCount).to.equal(1)
  })
  it('should call GetFolderInfosWithPictures with one argument', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should use knex to get folders with pictures counts', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.firstCall.args[0]).to.equal(knexFnFake)
  })
  it('should call GetAllFolderInfos once', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.callCount).to.equal(1)
  })
  it('should call GetAllFolderInfos with one argument', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should use knex to all folders in the db', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.firstCall.args[0]).to.equal(knexFnFake)
  })
  it('should call CalculateFolderInfos once', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.callCount).to.equal(1)
  })
  it('should call CalculateFolderInfos with two arguments', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should call CalculateFolderInfos with all folders as first argument', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.firstCall.args[0]).to.equal(allFolders)
  })
  it('should calculate folder infos using results from both', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.firstCall.args[1]).to.equal(pictureFolders)
  })
  it('should call Chunk once', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.resolves({ 'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 } })
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(chunkStub.callCount).to.equal(1)
  })
  it('should call Chunk with one argument', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.resolves({ 'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 } })
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(chunkStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should chunk the filtered results of calculation', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.resolves({
      'SOME PATH': { path: 'SOME PATH', folder: '/', sortKey: 'some', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(chunkStub.firstCall.args[0]).to.deep.equal([
      { path: 'SOME PATH', folder: '/', sortKey: 'some', totalCount: 0, seenCount: 0 },
    ])
  })
  it('should drop calculated folders whose path is not in the folders table', async () => {
    getAllFolderInfosStub.resolves({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.returns([
      { path: '/existing/', totalCount: 1, seenCount: 0 },
      { path: '/orphan/', totalCount: 1, seenCount: 0 },
    ])
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    const chunked = Cast<Array<{ path: string }>>(chunkStub.firstCall.args[0])
    expect(chunked.map((r) => r.path)).to.deep.equal(['/existing/'])
  })
  it('should drop every calculated folder when none exist in the folders table', async () => {
    getAllFolderInfosStub.resolves({})
    calculateFolderInfosStub.returns([{ path: '/orphan/', totalCount: 1, seenCount: 0 }])
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(chunkStub.firstCall.args[0]).to.deep.equal([])
  })
  it('should enrich the upsert payload with folder column from the existing row', async () => {
    getAllFolderInfosStub.resolves({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.returns([{ path: '/existing/', totalCount: 1, seenCount: 0 }])
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    const chunked = Cast<Array<{ folder: string }>>(chunkStub.firstCall.args[0])
    expect(chunked[0]?.folder).to.equal('/')
  })
  it('should enrich the upsert payload with sortKey column from the existing row', async () => {
    getAllFolderInfosStub.resolves({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.returns([{ path: '/existing/', totalCount: 1, seenCount: 0 }])
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    const chunked = Cast<Array<{ sortKey: string }>>(chunkStub.firstCall.args[0])
    expect(chunked[0]?.sortKey).to.equal('existing')
  })
  it('should call knex with folders table when inserting', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should call insert once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.callCount).to.equal(1)
  })
  it('should insert results with correct record', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.firstCall.args[0]).to.equal(records[0])
  })
  it('should call onConflict once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.onConflict.callCount).to.equal(1)
  })
  it('should insert results with conflict on path', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.onConflict.firstCall.args[0]).to.equal('path')
  })
  it('should call merge once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.merge.callCount).to.equal(1)
  })
  it('should merge only totalCount and seenCount on conflict', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.merge.firstCall.args[0]).to.deep.equal(['totalCount', 'seenCount'])
  })
  it('should insert results for each chunk', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.callCount).to.equal(3)
  })
  it('should insert first chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.firstCall.args[0]).to.equal(records[0])
  })
  it('should insert second chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.secondCall.args[0]).to.equal(records[1])
  })
  it('should insert third chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.thirdCall.args[0]).to.equal(records[2])
  })
  it('should log status five times', async () => {
    const pictureFolders = [
      { path: 'Test Path', totalCount: 0, seenCount: 0 },
      { path: 'Path under test', totalCount: 0, seenCount: 0 },
    ]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      'OTHER PATH': { path: 'OTHER PATH', totalCount: 0, seenCount: 0 },
      'LAST PATH': { path: 'LAST PATH', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 },
    ]
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(loggerStub.callCount).to.equal(5)
  })
  it('should log start status', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(0).args).to.deep.equal(['Updating Seen Counts'])
  })
  it('should log picture folder count', async () => {
    const pictureFolders = [
      { path: 'Test Path', totalCount: 0, seenCount: 0 },
      { path: 'Path under test', totalCount: 0, seenCount: 0 },
    ]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(1).args).to.deep.equal(['Found 2 Folders to Update'])
  })
  it('should log db folder count', async () => {
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(2).args).to.deep.equal(['Found 1 Folders in the DB'])
  })
  it('should log calculated folder count', async () => {
    const allFolders = {
      'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      'OTHER PATH': { path: 'OTHER PATH', totalCount: 0, seenCount: 0 },
      'LAST PATH': { path: 'LAST PATH', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 },
    ]
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(3).args).to.deep.equal(['Calculated 3 Folders Seen Counts'])
  })
  it('should log updated folder count', async () => {
    const allFolders = {
      'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      'OTHER PATH': { path: 'OTHER PATH', totalCount: 0, seenCount: 0 },
      'LAST PATH': { path: 'LAST PATH', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 },
    ]
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(4).args).to.deep.equal(['Updated 3 Folders Seen Counts'])
  })
})
