'use sanity'

import { Debouncer } from '../../../utils/debounce'
import { expect } from 'chai'
import { Cast } from '../../testutils/TypeGuards'

describe('utils/debounce static function remove()', () => {
  const bouncer = new Debouncer()
  beforeEach(() => {
    Debouncer._debouncers = [bouncer]
  })
  afterEach(() => {
    Debouncer._debouncers = []
  })
  it('should gracefully handle removing unknown Debouncer', () => {
    Debouncer.remove(Cast<Debouncer>({}))
    expect(Debouncer._debouncers).to.deep.equal([bouncer])
  })
  it('should recreate debouncers list', () => {
    const orig = Debouncer._debouncers
    Debouncer.remove(Cast<Debouncer>({}))
    expect(Debouncer._debouncers).to.not.equal(orig)
  })
  it('should remove existing bouncer', () => {
    Debouncer.remove(bouncer)
    expect(Debouncer._debouncers).to.deep.equal([])
  })
})
