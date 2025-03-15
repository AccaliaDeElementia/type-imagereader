'use sanity'

import { DefaultLocationAssign, DefaultLocationReload } from '../../../../public/scripts/slideshow/sockets'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import { DefinitelyThrows } from '../../../testutils/Errors'

describe('public/slideshow/sockets defaults()', () => {
  it('should definitely throw for DefaultLocationAssign()', () => {
    DefinitelyThrows(() => {
      DefaultLocationAssign('')
    })
  })
  it('should definitely throw expected error DefaultLocationAssign()', () => {
    const err = DefinitelyThrows(() => {
      DefaultLocationAssign('')
    })
    expect(err.message).to.equal('Should not call default value!')
  })
  it('should definitely throw for DefaultLocationReload()', () => {
    DefinitelyThrows(() => {
      DefaultLocationReload()
    })
  })
  it('should definitely throw expected error DefaultLocationReload()', () => {
    const err = DefinitelyThrows(() => {
      DefaultLocationReload()
    })
    expect(err.message).to.equal('Should not call default value!')
  })
})
