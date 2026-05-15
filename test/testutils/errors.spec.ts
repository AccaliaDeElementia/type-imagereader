'use sanity'

import { eventuallyFulfills } from '#testutils/errors.js'

describe('testutils eventuallyFulfills()', () => {
  it('should resolve when the promise fulfills', async () => {
    await eventuallyFulfills(Promise.resolve())
  })
})
