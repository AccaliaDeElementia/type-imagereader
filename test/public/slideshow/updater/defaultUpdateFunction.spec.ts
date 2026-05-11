'use sanity'

import { eventuallyRejects } from '#testutils/errors.js'
import { Internals } from '#public/scripts/slideshow/updater.js'
describe('public/slideshow/updater DefaultUpdateFn()', () => {
  it('should reject with expected Error', async () => {
    const err = await eventuallyRejects(Internals.defaultUpdateFn())
    expect(err.message).toBe('CyclicUpdater fired before an updateFn was provided to the constructor')
  })
})
