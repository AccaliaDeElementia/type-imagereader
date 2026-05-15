'use sanity'

import { Internals } from '#public/scripts/slideshow/sockets.js'

describe('public/slideshow/sockets uninitialized sentinels', () => {
  it('should definitely throw for Internals.uninitializedLocationAssign()', () => {
    expect(() => {
      Internals.uninitializedLocationAssign('')
    }).toThrow()
  })
  it('should throw expected error for Internals.uninitializedLocationAssign()', () => {
    expect(() => {
      Internals.uninitializedLocationAssign('')
    }).toThrow('locationAssign called before connect()')
  })
  it('should definitely throw for Internals.uninitializedLocationReload()', () => {
    expect(() => {
      Internals.uninitializedLocationReload()
    }).toThrow()
  })
  it('should throw expected error for Internals.uninitializedLocationReload()', () => {
    expect(() => {
      Internals.uninitializedLocationReload()
    }).toThrow('locationReload called before connect()')
  })
})
