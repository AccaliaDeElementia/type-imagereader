'use sanity'

import { EventuallyRejects } from '#testutils/Errors.js'
import { defaultUpdateFn } from '#public/scripts/slideshow/updater.js'
import { expect } from 'chai'

describe('public/slideshow/updater DefaultUpdateFn()', () => {
  it('should reject with expected Error', async () => {
    const err = await EventuallyRejects(defaultUpdateFn())
    expect(err.message).to.equal('CyclicUpdater fired before an updateFn was provided to the constructor')
  })
})
