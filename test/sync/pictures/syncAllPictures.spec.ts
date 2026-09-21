'use sanity'

import { syncAllPictures, Internals, Imports, LOG_PREFIX } from '#sync/pictures.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { stubLoggerFactory } from '#testutils/debug.js'
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
    ;({ debugStub, loggerStub } = stubLoggerFactory(Imports))
    syncNewPicturesStub = vi.spyOn(Internals, 'syncNewPictures').mockResolvedValue(undefined)
    syncRemovedPicturesStub = vi.spyOn(Internals, 'syncRemovedPictures').mockResolvedValue(undefined)
    syncRemovedBookmarksStub = vi.spyOn(Internals, 'syncRemovedBookmarks').mockResolvedValue(undefined)
  })

  const pipeline: Array<[string, () => MockInstance]> = [
    ['syncNewPictures', () => syncNewPicturesStub],
    ['syncRemovedPictures', () => syncRemovedPicturesStub],
    ['syncRemovedBookmarks', () => syncRemovedBookmarksStub],
  ]

  it('should construct the module logger exactly once', async () => {
    await syncAllPictures(knexFake)
    expect(debugStub.mock.calls).toEqual([[LOG_PREFIX]])
  })

  pipeline.forEach(([step, stub]: [string, () => MockInstance]): void => {
    it(`should run ${step} exactly once with the module logger and knex`, async () => {
      await syncAllPictures(knexFake)
      expect(stub().mock.calls).toEqual([[loggerStub, knexFake]])
    })
  })

  it('should run every sync step in declared pipeline order', async () => {
    await syncAllPictures(knexFake)
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
