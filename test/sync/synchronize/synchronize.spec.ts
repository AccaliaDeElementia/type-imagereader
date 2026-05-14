'use sanity'

import { synchronize, Imports, LOG_PREFIX } from '#sync/synchronize.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { findStubCall } from '#testutils/sinon.js'
import type { MockInstance } from 'vitest'

const stepLog = /^[A-Za-z]+ completed in \d+\.\d+s$/v
const stepFailureLog = /^[A-Za-z]+ failed after \d+\.\d+s$/v
const completeLog = /^Folder Synchronization Complete after \d+\.\d+s$/v
const failedSummaryLog = /^Folder Synchronization Failed after \d+\.\d+s$/v

describe('sync/synchronize synchronize()', () => {
  let loggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
  let findSyncItemsStub: MockInstance = vi.fn()
  let syncAllPicturesStub: MockInstance = vi.fn()
  let syncAllFoldersStub: MockInstance = vi.fn()
  let updateFolderPictureCountsStub: MockInstance = vi.fn()
  let pruneEmptyFoldersStub: MockInstance = vi.fn()
  let emitSqliteSizeWarningStub: MockInstance = vi.fn()
  let persistenceInitializerStub: MockInstance = vi.fn()
  let knexFnStub = vi.fn().mockImplementation(function (this: object): unknown {
    return this
  })
  beforeEach(() => {
    knexFnStub = vi.fn().mockImplementation(function (this: object): unknown {
      return this
    })
    ;({ debugStub, loggerStub } = stubDebug(Imports))
    persistenceInitializerStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex(knexFnStub))
    findSyncItemsStub = vi.spyOn(Imports, 'findSyncItems').mockResolvedValue(1)
    syncAllPicturesStub = vi.spyOn(Imports, 'syncAllPictures').mockResolvedValue(undefined)
    syncAllFoldersStub = vi.spyOn(Imports, 'syncAllFolders').mockResolvedValue(undefined)
    updateFolderPictureCountsStub = vi.spyOn(Imports, 'updateFolderPictureCounts').mockResolvedValue(undefined)
    pruneEmptyFoldersStub = vi.spyOn(Imports, 'pruneEmptyFolders').mockResolvedValue(undefined)
    emitSqliteSizeWarningStub = vi
      .spyOn(Imports, 'emitSqliteSizeWarning')
      .mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call debug once at start of process', async () => {
    await synchronize()
    expect(debugStub.mock.calls.length).toBe(1)
  })
  it('should create logger at start of process', async () => {
    await synchronize()
    expect(debugStub.mock.calls[0]?.[0]).toBe(LOG_PREFIX)
  })
  it('should log more than once when processing', async () => {
    await synchronize()
    expect(loggerStub.mock.calls.length).toBeGreaterThan(1)
  })
  it('should log start of processing', async () => {
    await synchronize()
    expect(loggerStub.mock.calls[0]?.[0]).toBe('Folder Synchronization Begins')
  })
  it('should call initialize once', async () => {
    await synchronize()
    expect(persistenceInitializerStub.mock.calls.length).toBe(1)
  })
  it('should initialize the persistence layer with no arguments', async () => {
    await synchronize()
    expect(persistenceInitializerStub.mock.calls[0]).toEqual([])
  })
  it('should call findSyncItems once', async () => {
    await synchronize()
    expect(findSyncItemsStub.mock.calls.length).toBe(1)
  })
  it('should call findSyncItems with one argument', async () => {
    await synchronize()
    expect(findSyncItemsStub.mock.calls[0]).toHaveLength(1)
  })
  it('should find the sync items using the knex instance', async () => {
    await synchronize()
    expect(findSyncItemsStub.mock.calls[0]?.[0]).toBe(knexFnStub)
  })
  const stepNames = [
    'findSyncItems',
    'syncAllPictures',
    'syncAllFolders',
    'updateFolderPictureCounts',
    'pruneEmptyFolders',
  ]
  stepNames.forEach((step) => {
    it(`should log elapsed time for ${step} step`, async () => {
      await synchronize()
      const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith(`${step} `))
      expect(call?.[0]).toMatch(stepLog)
    })
  })
  it('should not call syncAllPictures when zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(0)
    await synchronize().catch(() => null)
    expect(syncAllPicturesStub.mock.calls.length).toBe(0)
  })
  it('should not call syncAllFolders when zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(0)
    await synchronize().catch(() => null)
    expect(syncAllFoldersStub.mock.calls.length).toBe(0)
  })
  it('should not call updateFolderPictureCounts when zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(0)
    await synchronize().catch(() => null)
    expect(updateFolderPictureCountsStub.mock.calls.length).toBe(0)
  })
  it('should not call pruneEmptyFolders when zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(0)
    await synchronize().catch(() => null)
    expect(pruneEmptyFoldersStub.mock.calls.length).toBe(0)
  })
  it('should log error with two arguments when aborting', async () => {
    findSyncItemsStub.mockResolvedValue(-1)
    await synchronize().catch(() => null)
    const call = findStubCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    expect(call).toHaveLength(2)
  })
  it('should log error label when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(-1)
    await synchronize().catch(() => null)
    const call = findStubCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    expect(call?.[0]).toBe('Folder Synchronization Failed')
  })
  it('should log an Error instance when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(-1)
    await synchronize().catch(() => null)
    const call = findStubCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    const error = cast(call?.[1], (e) => e instanceof Error)
    expect(error).toBeInstanceOf(Error)
  })
  it('should log error message when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(-1)
    await synchronize().catch(() => null)
    const call = findStubCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    const error = cast(call?.[1], (e) => e instanceof Error)
    expect(error.message).toBe('Found Zero images, refusing to process empty base folder')
  })
  it('should log success message at end of successful processing', async () => {
    findSyncItemsStub.mockResolvedValue(45)
    await synchronize()
    expect(loggerStub.mock.lastCall).toHaveLength(1)
  })
  it('should log elapsed total time in seconds at end of processing with success', async () => {
    findSyncItemsStub.mockResolvedValue(45)
    await synchronize()
    expect(loggerStub.mock.lastCall?.[0]).toMatch(completeLog)
  })
  it('should log success message at end of failed processing', async () => {
    findSyncItemsStub.mockResolvedValue(-1)
    await synchronize().catch(() => null)
    expect(loggerStub.mock.lastCall).toHaveLength(1)
  })
  it('should log elapsed total time in seconds at end of processing with error', async () => {
    findSyncItemsStub.mockResolvedValue(-1)
    await synchronize().catch(() => null)
    expect(loggerStub.mock.lastCall?.[0]).toMatch(failedSummaryLog)
  })
  it('should log a per-step failure when a step rejects', async () => {
    syncAllPicturesStub.mockRejectedValue(new Error('boom'))
    await synchronize().catch(() => null)
    const call = findStubCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].startsWith('syncAllPictures failed'),
    )
    expect(call).not.toBe(undefined)
  })
  it('should include elapsed time in per-step failure log', async () => {
    syncAllPicturesStub.mockRejectedValue(new Error('boom'))
    await synchronize().catch(() => null)
    const call = findStubCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].startsWith('syncAllPictures failed'),
    )
    expect(call?.[0]).toMatch(stepFailureLog)
  })
  it('should pass the rejected error to the per-step failure log', async () => {
    const err = new Error('boom')
    syncAllPicturesStub.mockRejectedValue(err)
    await synchronize().catch(() => null)
    const call = findStubCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].startsWith('syncAllPictures failed'),
    )
    expect(call?.[1]).toBe(err)
  })
  it('should reject with the original error when a step throws', async () => {
    const err = new Error('boom')
    syncAllPicturesStub.mockRejectedValue(err)
    let caught: unknown = null
    try {
      await synchronize()
    } catch (e) {
      caught = e
    }
    expect(caught).toBe(err)
  })
  it('should reject when zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(0)
    let rejected = false
    try {
      await synchronize()
    } catch {
      rejected = true
    }
    expect(rejected).toBe(true)
  })

  it('should call emitSqliteSizeWarning once on a successful sync', async () => {
    findSyncItemsStub.mockResolvedValue(45)
    await synchronize()
    expect(emitSqliteSizeWarningStub.mock.calls.length).toBe(1)
  })

  it('should pass the logger as the first argument to emitSqliteSizeWarning', async () => {
    findSyncItemsStub.mockResolvedValue(45)
    await synchronize()
    expect(emitSqliteSizeWarningStub.mock.calls[0]?.[0]).toBe(loggerStub)
  })

  it('should pass the knex instance as the second argument to emitSqliteSizeWarning', async () => {
    findSyncItemsStub.mockResolvedValue(45)
    await synchronize()
    expect(emitSqliteSizeWarningStub.mock.calls[0]?.[1]).toBe(knexFnStub)
  })

  it('should pass the picture count from findSyncItems as the third argument to emitSqliteSizeWarning', async () => {
    findSyncItemsStub.mockResolvedValue(12345)
    await synchronize()
    expect(emitSqliteSizeWarningStub.mock.calls[0]?.[2]).toBe(12345)
  })

  it('should not call emitSqliteSizeWarning when zero images found', async () => {
    findSyncItemsStub.mockResolvedValue(0)
    await synchronize().catch(() => null)
    expect(emitSqliteSizeWarningStub.mock.calls.length).toBe(0)
  })

  it('should not call emitSqliteSizeWarning when a step rejects', async () => {
    findSyncItemsStub.mockResolvedValue(45)
    syncAllPicturesStub.mockRejectedValue(new Error('boom'))
    await synchronize().catch(() => null)
    expect(emitSqliteSizeWarningStub.mock.calls.length).toBe(0)
  })
})
