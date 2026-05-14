'use sanity'

import { syncAllPictures, Internals, Imports, LOG_PREFIX } from '#sync/pictures.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/pictures syncAllPictures()', () => {
  let syncNewPicturesStub: MockInstance = vi.fn()
  let syncRemovedPicturesStub: MockInstance = vi.fn()
  let syncRemovedBookmarksStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
  let knexFake = stubToKnex({ id: Math.random() })
  beforeEach(() => {
    knexFake = stubToKnex({ id: Math.random() })
    ;({ debugStub, loggerStub } = stubDebug(Imports))
    syncNewPicturesStub = vi.spyOn(Internals, 'syncNewPictures').mockResolvedValue(undefined)
    syncRemovedPicturesStub = vi.spyOn(Internals, 'syncRemovedPictures').mockResolvedValue(undefined)
    syncRemovedBookmarksStub = vi.spyOn(Internals, 'syncRemovedBookmarks').mockResolvedValue(undefined)
  })
  it('should call debug once when constructing logger', async () => {
    await syncAllPictures(knexFake)
    expect(debugStub.mock.calls.length).toBe(1)
  })
  it('should construct logger with the module prefix', async () => {
    await syncAllPictures(knexFake)
    expect(debugStub.mock.calls[0]?.[0]).toBe(LOG_PREFIX)
  })
  it('should call syncNewPictures once', async () => {
    await syncAllPictures(knexFake)
    expect(syncNewPicturesStub.mock.calls.length).toBe(1)
  })
  it('should call syncNewPictures with expected args', async () => {
    await syncAllPictures(knexFake)
    expect(syncNewPicturesStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
  it('should call syncRemovedPictures once', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.mock.calls.length).toBe(1)
  })
  it('should call syncRemovedPictures with expected args', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
  it('should call syncRemovedBookmarks once', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.mock.calls.length).toBe(1)
  })
  it('should call syncRemovedBookmarks with expected args', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.mock.calls[0]).toEqual([loggerStub, knexFake])
  })
})
