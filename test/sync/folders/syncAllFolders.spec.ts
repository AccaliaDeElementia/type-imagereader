'use sanity'

import { syncAllFolders, Internals, Imports, LOG_PREFIX } from '#sync/folders.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/folders syncAllFolders()', () => {
  let syncNewFoldersStub: MockInstance = vi.fn()
  let syncRemovedFoldersStub: MockInstance = vi.fn()
  let syncMissingAncestorFoldersStub: MockInstance = vi.fn()
  let syncMissingCoverImagesStub: MockInstance = vi.fn()
  let syncFolderFirstImagesStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
  let knexFake = stubToKnex({ id: Math.random() })
  beforeEach(() => {
    ;({ debugStub, loggerStub } = stubDebug(Imports))
    syncNewFoldersStub = vi.spyOn(Internals, 'syncNewFolders').mockResolvedValue(undefined)
    syncRemovedFoldersStub = vi.spyOn(Internals, 'syncRemovedFolders').mockResolvedValue(undefined)
    syncMissingAncestorFoldersStub = vi.spyOn(Internals, 'syncMissingAncestorFolders').mockResolvedValue(undefined)
    syncMissingCoverImagesStub = vi.spyOn(Internals, 'syncMissingCoverImages').mockResolvedValue(undefined)
    syncFolderFirstImagesStub = vi.spyOn(Internals, 'syncFolderFirstImages').mockResolvedValue(undefined)
    knexFake = stubToKnex({ id: Math.random() })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call debug once when constructing logger', async () => {
    await syncAllFolders(knexFake)
    expect(debugStub.mock.calls.length).toBe(1)
  })
  it('should construct logger with the module prefix', async () => {
    await syncAllFolders(knexFake)
    expect(debugStub.mock.calls[0]?.[0]).toBe(LOG_PREFIX)
  })
  it('should call syncNewFolders once', async () => {
    await syncAllFolders(knexFake)
    expect(syncNewFoldersStub.mock.calls.length).toBe(1)
  })
  it('should call syncNewFolders with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncNewFoldersStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
  it('should call syncRemovedFolders once', async () => {
    await syncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.mock.calls.length).toBe(1)
  })
  it('should call syncRemovedFolders with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
  it('should call syncMissingAncestorFolders once', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.mock.calls.length).toBe(1)
  })
  it('should call syncMissingAncestorFolders with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
  it('should call syncMissingAncestorFolders after syncRemovedFolders', async () => {
    await syncAllFolders(knexFake)
    expect(
      (syncMissingAncestorFoldersStub.mock.invocationCallOrder[0] ?? 0) >
        (syncRemovedFoldersStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })
  it('should call syncMissingAncestorFolders before syncFolderFirstImages', async () => {
    await syncAllFolders(knexFake)
    expect(
      (syncMissingAncestorFoldersStub.mock.invocationCallOrder[0] ?? 0) <
        (syncFolderFirstImagesStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })
  it('should call syncMissingCoverImages once', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.mock.calls.length).toBe(1)
  })
  it('should call syncMissingCoverImages with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
  it('should call syncFolderFirstImages once', async () => {
    await syncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.mock.calls.length).toBe(1)
  })
  it('should call syncFolderFirstImages with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
})
