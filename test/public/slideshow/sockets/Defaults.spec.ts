'use sanity'

import { UninitializedLocationAssign, UninitializedLocationReload } from '#public/scripts/slideshow/sockets'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import { DefinitelyThrows } from '#testutils/Errors'

describe('public/slideshow/sockets uninitialized sentinels', () => {
  it('should definitely throw for UninitializedLocationAssign()', () => {
    DefinitelyThrows(() => {
      UninitializedLocationAssign('')
    })
  })
  it('should throw expected error for UninitializedLocationAssign()', () => {
    const err = DefinitelyThrows(() => {
      UninitializedLocationAssign('')
    })
    expect(err.message).to.equal('LocationAssign called before Connect()')
  })
  it('should definitely throw for UninitializedLocationReload()', () => {
    DefinitelyThrows(() => {
      UninitializedLocationReload()
    })
  })
  it('should throw expected error for UninitializedLocationReload()', () => {
    const err = DefinitelyThrows(() => {
      UninitializedLocationReload()
    })
    expect(err.message).to.equal('LocationReload called before Connect()')
  })
})
