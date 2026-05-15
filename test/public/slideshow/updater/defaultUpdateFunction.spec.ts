'use sanity'

import { Internals } from '#public/scripts/slideshow/updater.js'
describe('public/slideshow/updater DefaultUpdateFn()', () => {
  it('should reject with expected Error', async () => {
    await expect(Internals.defaultUpdateFn()).rejects.toThrow(
      new Error('CyclicUpdater fired before an updateFn was provided to the constructor'),
    )
  })
})
