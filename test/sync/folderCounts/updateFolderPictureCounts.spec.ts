'use sanity'

import { updateFolderPictureCounts, Internals, Imports, LOG_PREFIX } from '#sync/folderCounts.js'
import { cast } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import { stubDebug } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/folderCounts updateFolderPictureCounts()', () => {
  let getFolderInfosWithPicturesStub: MockInstance = vi.fn()
  let getAllFolderInfosStub: MockInstance = vi.fn()
  let calculateFolderInfosStub: MockInstance = vi.fn()
  let chunkStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
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
    ;({ debugStub, loggerStub } = stubDebug(Imports))
    getFolderInfosWithPicturesStub = vi.spyOn(Internals, 'getFolderInfosWithPictures').mockResolvedValue([])
    getAllFolderInfosStub = vi.spyOn(Internals, 'getAllFolderInfos').mockResolvedValue({})
    calculateFolderInfosStub = vi.spyOn(Internals, 'calculateFolderInfos').mockReturnValue([])
    chunkStub = vi.spyOn(Imports, 'chunk').mockReturnValue([])
  })
  it('should call debug once when constructing logger', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(debugStub.mock.calls.length).toBe(1)
  })
  it('should construct prefixed logger', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(debugStub.mock.calls[0]?.[0]).toSatisfy(
      (msg: unknown): msg is string =>
        typeof msg === 'string' && msg.startsWith(`${LOG_PREFIX}:`) && msg.endsWith(':updateSeen'),
    )
  })
  it('should call getFolderInfosWithPictures once', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.mock.calls.length).toBe(1)
  })
  it('should call getFolderInfosWithPictures with one argument', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.mock.calls[0]).toHaveLength(1)
  })
  it('should use knex to get folders with pictures counts', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.mock.calls[0]?.[0]).toBe(knexFnFake)
  })
  it('should call getAllFolderInfos once', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.mock.calls.length).toBe(1)
  })
  it('should call getAllFolderInfos with one argument', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.mock.calls[0]).toHaveLength(1)
  })
  it('should use knex to all folders in the db', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.mock.calls[0]?.[0]).toBe(knexFnFake)
  })
  it('should call calculateFolderInfos once', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.mockResolvedValue(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.mock.calls.length).toBe(1)
  })
  it('should call calculateFolderInfos with two arguments', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.mockResolvedValue(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.mock.calls[0]).toHaveLength(2)
  })
  it('should call calculateFolderInfos with all folders as first argument', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.mockResolvedValue(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.mock.calls[0]?.[0]).toBe(allFolders)
  })
  it('should calculate folder infos using results from both', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.mockResolvedValue(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.mock.calls[0]?.[1]).toBe(pictureFolders)
  })
  it('should call chunk once', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.mockResolvedValue({ 'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 } })
    calculateFolderInfosStub.mockReturnValue(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.mock.calls.length).toBe(1)
  })
  it('should call chunk with the dialect-aware chunk size', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.mockResolvedValue({ 'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 } })
    calculateFolderInfosStub.mockReturnValue(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.mock.calls[0]?.[1]).toBeTypeOf('number')
  })
  it('should chunk the filtered results of calculation', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    getAllFolderInfosStub.mockResolvedValue({
      'SOME PATH': { path: 'SOME PATH', folder: '/', sortKey: 'some', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.mockReturnValue(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.mock.calls[0]?.[0]).toEqual([
      { path: 'SOME PATH', folder: '/', sortKey: 'some', totalCount: 0, seenCount: 0 },
    ])
  })
  it('should drop calculated folders whose path is not in the folders table', async () => {
    getAllFolderInfosStub.mockResolvedValue({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.mockReturnValue([
      { path: '/existing/', totalCount: 1, seenCount: 0 },
      { path: '/orphan/', totalCount: 1, seenCount: 0 },
    ])
    await updateFolderPictureCounts(knexFnFake)
    const chunked = cast<Array<{ path: string }>>(chunkStub.mock.calls[0]?.[0])
    expect(chunked.map((r) => r.path)).toEqual(['/existing/'])
  })
  it('should drop every calculated folder when none exist in the folders table', async () => {
    getAllFolderInfosStub.mockResolvedValue({})
    calculateFolderInfosStub.mockReturnValue([{ path: '/orphan/', totalCount: 1, seenCount: 0 }])
    await updateFolderPictureCounts(knexFnFake)
    expect(chunkStub.mock.calls[0]?.[0]).toEqual([])
  })
  it('should enrich the upsert payload with folder column from the existing row', async () => {
    getAllFolderInfosStub.mockResolvedValue({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.mockReturnValue([{ path: '/existing/', totalCount: 1, seenCount: 0 }])
    await updateFolderPictureCounts(knexFnFake)
    const chunked = cast<Array<{ folder: string }>>(chunkStub.mock.calls[0]?.[0])
    expect(chunked[0]?.folder).toBe('/')
  })
  it('should enrich the upsert payload with sortKey column from the existing row', async () => {
    getAllFolderInfosStub.mockResolvedValue({
      '/existing/': { path: '/existing/', folder: '/', sortKey: 'existing', totalCount: 0, seenCount: 0 },
    })
    calculateFolderInfosStub.mockReturnValue([{ path: '/existing/', totalCount: 1, seenCount: 0 }])
    await updateFolderPictureCounts(knexFnFake)
    const chunked = cast<Array<{ sortKey: string }>>(chunkStub.mock.calls[0]?.[0])
    expect(chunked[0]?.sortKey).toBe('existing')
  })
  it('should call knex with folders table when inserting', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexFnStub.mock.calls[0]).toEqual(['folders'])
  })
  it('should call insert once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.mock.calls.length).toBe(1)
  })
  it('should insert results with correct record', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.mock.calls[0]?.[0]).toBe(records[0])
  })
  it('should call onConflict once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.onConflict.mock.calls.length).toBe(1)
  })
  it('should insert results with conflict on path', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.onConflict.mock.calls[0]?.[0]).toBe('path')
  })
  it('should call merge once when inserting results', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.merge.mock.calls.length).toBe(1)
  })
  it('should merge only totalCount and seenCount on conflict', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.merge.mock.calls[0]?.[0]).toEqual(['totalCount', 'seenCount'])
  })
  it('should insert results for each chunk', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.mock.calls.length).toBe(3)
  })
  it('should insert first chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.mock.calls[0]?.[0]).toBe(records[0])
  })
  it('should insert second chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.mock.calls[1]?.[0]).toBe(records[1])
  })
  it('should insert third chunk for each loop iteration', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.mockReturnValue(records)
    await updateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.mock.calls[2]?.[0]).toBe(records[2])
  })
  it('should log status five times', async () => {
    const pictureFolders = [
      { path: 'Test Path', totalCount: 0, seenCount: 0 },
      { path: 'Path under test', totalCount: 0, seenCount: 0 },
    ]
    getFolderInfosWithPicturesStub.mockResolvedValue(pictureFolders)
    const allFolders = {
      'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      'OTHER PATH': { path: 'OTHER PATH', totalCount: 0, seenCount: 0 },
      'LAST PATH': { path: 'LAST PATH', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 },
    ]
    calculateFolderInfosStub.mockReturnValue(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(5)
  })
  it('should log start status', async () => {
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.mock.calls[0]).toEqual(['Updating Seen Counts'])
  })
  it('should log picture folder count', async () => {
    const pictureFolders = [
      { path: 'Test Path', totalCount: 0, seenCount: 0 },
      { path: 'Path under test', totalCount: 0, seenCount: 0 },
    ]
    getFolderInfosWithPicturesStub.mockResolvedValue(pictureFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.mock.calls[1]).toEqual(['Found 2 Folders to Update'])
  })
  it('should log db folder count', async () => {
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.mock.calls[2]).toEqual(['Found 1 Folders in the DB'])
  })
  it('should log calculated folder count', async () => {
    const allFolders = {
      'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      'OTHER PATH': { path: 'OTHER PATH', totalCount: 0, seenCount: 0 },
      'LAST PATH': { path: 'LAST PATH', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 },
    ]
    calculateFolderInfosStub.mockReturnValue(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.mock.calls[3]).toEqual(['Calculated 3 Folders Seen Counts'])
  })
  it('should log updated folder count', async () => {
    const allFolders = {
      'SOME PATH': { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      'OTHER PATH': { path: 'OTHER PATH', totalCount: 0, seenCount: 0 },
      'LAST PATH': { path: 'LAST PATH', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.mockResolvedValue(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 },
    ]
    calculateFolderInfosStub.mockReturnValue(results)
    await updateFolderPictureCounts(knexFnFake)
    expect(loggerStub.mock.calls[4]).toEqual(['Updated 3 Folders Seen Counts'])
  })
})
