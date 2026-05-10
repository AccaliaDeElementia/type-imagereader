'use sanity'

import { updateFolderPictureCounts, Internals, Imports, LOG_PREFIX } from '#sync/folderCounts.js'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import { stubDebug } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/folderCounts updateFolderPictureCounts()', () => {
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
    ;({ debugStub, loggerStub } = stubDebug(sandbox, Imports))
    getFolderInfosWithPicturesStub = sandbox.stub(Internals, 'getFolderInfosWithPictures').resolves([])
    getAllFolderInfosStub = sandbox.stub(Internals, 'getAllFolderInfos').resolves({})
    calculateFolderInfosStub = sandbox.stub(Internals, 'calculateFolderInfos').returns([])
    chunkStub = sandbox.stub(Imports, 'chunk').returns([])
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(debugStub.callCount).toBe(1)
  })
  it('should construct prefixed logger', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(debugStub.firstCall.args[0]).toSatisfy(
      (msg: unknown): msg is string =>
        typeof msg === 'string' && msg.startsWith(`${LOG_PREFIX}:`) && msg.endsWith(':updateSeen'),
    )
  })
  it('should call getFolderInfosWithPictures once', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.callCount).toBe(1)
  })
  it('should call getFolderInfosWithPictures with one argument', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.firstCall.args).toHaveLength(1)
  })
  it('should use knex to get folders with pictures counts', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.firstCall.args[0]).toBe(knexFnFake)
  })
  it('should call getAllFolderInfos once', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.callCount).toBe(1)
  })
  it('should call getAllFolderInfos with one argument', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.firstCall.args).toHaveLength(1)
  })
  it('should use knex to all folders in the db', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.firstCall.args[0]).toBe(knexFnFake)
  })
  it('should call calculateFolderInfos once', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.callCount).toBe(1)
  })
  it('should call calculateFolderInfos with two arguments', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.firstCall.args).toHaveLength(2)
  })
  it('should call calculateFolderInfos with all folders as first argument', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.firstCall.args[0]).toBe(allFolders)
  })
  it('should calculate folder infos using results from both', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.firstCall.args[1]).toBe(pictureFolders)
  })
  it('should call chunk once', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.resolves({ 'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 } })
    calculateFolderInfosStub.returns(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.callCount).toBe(1)
  })
  it('should call chunk with the dialect-aware chunk size', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.resolves({ 'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 } })
    calculateFolderInfosStub.returns(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.firstCall.args[1]).toBeTypeOf('number')
  })
  it('should chunk the filtered results of calculation', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.resolves({
      'SOME PATH': { path: 'SOME PATH', folder: '/', sortKey: 'some', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.returns(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.firstCall.args[0]).toEqual([
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
    await updateFolderPictureCounts(knexFnFake)
    const chunked = cast<Array<{ path: string }>>(chunkStub.firstCall.args[0])
    expect(chunked.map((r) => r.path)).toEqual(['/existing/'])
  })
  it('should drop every calculated folder when none exist in the folders table', async () => {
    getAllFolderInfosStub.resolves({})
    calculateFolderInfosStub.returns([{ path: '/orphan/', totalCount: 1, seenCount: 0 }])
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.firstCall.args[0]).toEqual([])
  })
  it('should enrich the upsert payload with folder column from the existing row', async () => {
    getAllFolderInfosStub.resolves({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.returns([{ path: '/existing/', totalCount: 1, seenCount: 0 }])
    await updateFolderPictureCounts(knexFnFake)
    const chunked = cast<Array<{ folder: string }>>(chunkStub.firstCall.args[0])
    expect(chunked[0]?.folder).toBe('/')
  })
  it('should enrich the upsert payload with sortKey column from the existing row', async () => {
    getAllFolderInfosStub.resolves({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.returns([{ path: '/existing/', totalCount: 1, seenCount: 0 }])
    await updateFolderPictureCounts(knexFnFake)
    const chunked = cast<Array<{ sortKey: string }>>(chunkStub.firstCall.args[0])
    expect(chunked[0]?.sortKey).toBe('existing')
  })
  it('should call knex with folders table when inserting', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexFnStub.firstCall.args).toEqual(['folders'])
  })
  it('should call insert once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.callCount).toBe(1)
  })
  it('should insert results with correct record', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.firstCall.args[0]).toBe(records[0])
  })
  it('should call onConflict once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.onConflict.callCount).toBe(1)
  })
  it('should insert results with conflict on path', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.onConflict.firstCall.args[0]).toBe('path')
  })
  it('should call merge once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.merge.callCount).toBe(1)
  })
  it('should merge only totalCount and seenCount on conflict', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.merge.firstCall.args[0]).toEqual(['totalCount', 'seenCount'])
  })
  it('should insert results for each chunk', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.callCount).toBe(3)
  })
  it('should insert first chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.firstCall.args[0]).toBe(records[0])
  })
  it('should insert second chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.secondCall.args[0]).toBe(records[1])
  })
  it('should insert third chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.thirdCall.args[0]).toBe(records[2])
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
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.callCount).toBe(5)
  })
  it('should log start status', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(0).args).toEqual(['Updating Seen Counts'])
  })
  it('should log picture folder count', async () => {
    const pictureFolders = [
      { path: 'Test Path', totalCount: 0, seenCount: 0 },
      { path: 'Path under test', totalCount: 0, seenCount: 0 },
    ]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(1).args).toEqual(['Found 2 Folders to Update'])
  })
  it('should log db folder count', async () => {
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(2).args).toEqual(['Found 1 Folders in the DB'])
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
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(3).args).toEqual(['Calculated 3 Folders Seen Counts'])
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
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.getCall(4).args).toEqual(['Updated 3 Folders Seen Counts'])
  })
})
