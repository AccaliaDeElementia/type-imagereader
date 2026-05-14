'use sanity'

import { incrementalUpdateFirstImages, Imports } from '#sync/incrementalsync.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/incrementalsync incrementalUpdateFirstImages()', () => {
  let { fake: loggerFake } = createLoggerFake()
  let syncFolderFirstImagesStub: MockInstance = vi.fn()
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ fake: loggerFake } = createLoggerFake())
    syncFolderFirstImagesStub = vi.spyOn(Imports, 'syncFolderFirstImages').mockResolvedValue(undefined)
    knexFnStub = vi.fn()
    knexFnFake = stubToKnex(knexFnStub)
  })

  it('should delegate to syncFolderFirstImages', async () => {
    await incrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.mock.calls.length).toBe(1)
  })

  it('should pass logger to syncFolderFirstImages', async () => {
    await incrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.mock.calls[0]?.[0]).toBe(loggerFake)
  })

  it('should pass knex to syncFolderFirstImages', async () => {
    await incrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.mock.calls[0]?.[1]).toBe(knexFnFake)
  })
})
