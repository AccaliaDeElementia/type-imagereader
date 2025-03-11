'use sanity'

import { describe, it } from 'mocha'
import { EventuallyRejects } from '../../../testutils/Errors'
import { defaultUpdateFn } from '../../../../public/scripts/slideshow/updater'
import { expect } from 'chai'

describe('public/slideshow/updater DefaultUpdateFn()', () => {
  it('should reject with expected Error', async () => {
    const err = await EventuallyRejects(defaultUpdateFn())
    expect(err.message).to.equal('Cyclic Updater Called with No Updater')
  })
})
