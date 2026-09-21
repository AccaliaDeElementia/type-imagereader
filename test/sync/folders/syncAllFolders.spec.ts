'use sanity'

import { syncAllFolders, Internals, Imports, LOG_PREFIX } from '#sync/folders.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { stubLoggerFactory } from '#testutils/debug.js'
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
    ;({ debugStub, loggerStub } = stubLoggerFactory(Imports))
    syncNewFoldersStub = vi.spyOn(Internals, 'syncNewFolders').mockResolvedValue(undefined)
    syncRemovedFoldersStub = vi.spyOn(Internals, 'syncRemovedFolders').mockResolvedValue(undefined)
    syncMissingAncestorFoldersStub = vi.spyOn(Internals, 'syncMissingAncestorFolders').mockResolvedValue(undefined)
    syncMissingCoverImagesStub = vi.spyOn(Internals, 'syncMissingCoverImages').mockResolvedValue(undefined)
    syncFolderFirstImagesStub = vi.spyOn(Internals, 'syncFolderFirstImages').mockResolvedValue(undefined)
    knexFake = stubToKnex({ id: Math.random() })
  })

  const pipeline: Array<[string, () => MockInstance]> = [
    ['syncNewFolders', () => syncNewFoldersStub],
    ['syncRemovedFolders', () => syncRemovedFoldersStub],
    ['syncMissingAncestorFolders', () => syncMissingAncestorFoldersStub],
    ['syncMissingCoverImages', () => syncMissingCoverImagesStub],
    ['syncFolderFirstImages', () => syncFolderFirstImagesStub],
  ]

  it('should construct the module logger exactly once', async () => {
    await syncAllFolders(knexFake)
    expect(debugStub.mock.calls).toEqual([[LOG_PREFIX]])
  })

  pipeline.forEach(([step, stub]: [string, () => MockInstance]): void => {
    it(`should run ${step} exactly once with the module logger and knex`, async () => {
      await syncAllFolders(knexFake)
      expect(stub().mock.calls).toEqual([[loggerStub, knexFake]])
    })
  })

  it('should run every sync step in declared pipeline order', async () => {
    await syncAllFolders(knexFake)
    const invoked = pipeline
      .map(([step, stub]: [string, () => MockInstance]) => ({
        step,
        order: stub().mock.invocationCallOrder[0] ?? 0,
      }))
      .sort((a, b) => a.order - b.order)
      .map(({ step }) => step)
    expect(invoked).toEqual(pipeline.map(([step]) => step))
  })
})
