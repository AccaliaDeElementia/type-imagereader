'use sanity'

import { Internals } from '#public/scripts/slideshow/sockets.js'
import { expect } from 'chai'
import { definitelyThrows } from '#testutils/errors.js'

describe('public/slideshow/sockets uninitialized sentinels', () => {
  it('should definitely throw for Internals.uninitializedLocationAssign()', () => {
    definitelyThrows(() => {
      Internals.uninitializedLocationAssign('')
    })
  })
  it('should throw expected error for Internals.uninitializedLocationAssign()', () => {
    const err = definitelyThrows(() => {
      Internals.uninitializedLocationAssign('')
    })
    expect(err.message).to.equal('locationAssign called before connect()')
  })
  it('should definitely throw for Internals.uninitializedLocationReload()', () => {
    definitelyThrows(() => {
      Internals.uninitializedLocationReload()
    })
  })
  it('should throw expected error for Internals.uninitializedLocationReload()', () => {
    const err = definitelyThrows(() => {
      Internals.uninitializedLocationReload()
    })
    expect(err.message).to.equal('locationReload called before connect()')
  })
})
