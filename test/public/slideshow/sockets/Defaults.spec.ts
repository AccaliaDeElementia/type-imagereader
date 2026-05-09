'use sanity'

import { Internals } from '#public/scripts/slideshow/sockets.js'
import { expect } from 'chai'
import { DefinitelyThrows } from '#testutils/Errors.js'

describe('public/slideshow/sockets uninitialized sentinels', () => {
  it('should definitely throw for Internals.UninitializedLocationAssign()', () => {
    DefinitelyThrows(() => {
      Internals.UninitializedLocationAssign('')
    })
  })
  it('should throw expected error for Internals.UninitializedLocationAssign()', () => {
    const err = DefinitelyThrows(() => {
      Internals.UninitializedLocationAssign('')
    })
    expect(err.message).to.equal('LocationAssign called before Connect()')
  })
  it('should definitely throw for Internals.UninitializedLocationReload()', () => {
    DefinitelyThrows(() => {
      Internals.UninitializedLocationReload()
    })
  })
  it('should throw expected error for Internals.UninitializedLocationReload()', () => {
    const err = DefinitelyThrows(() => {
      Internals.UninitializedLocationReload()
    })
    expect(err.message).to.equal('LocationReload called before Connect()')
  })
})
