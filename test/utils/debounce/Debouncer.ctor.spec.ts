'use sanity'

import { Debouncer } from '../../../utils/debounce'
import { expect } from 'chai'

describe('utils/debounce new Debouncer()', () => {
  beforeEach(() => {
    Debouncer._debouncers = []
    Debouncer._timer = undefined
    Debouncer._interval = 100
  })
  const tests: Array<[number, number, number]> = [
    [100, 100, 1],
    [100, 50, 1],
    [100, 150, 2],
    [10, 150, 15],
    [100, 200, 2],
    [100, -100, 1],
    [100, 1000, 10],
  ]
  tests.forEach(([interval, timeout, cycles]) => {
    it(`should set cycle count of ${cycles} for timeout of ${timeout} and interval of ${interval}`, () => {
      Debouncer._interval = interval
      const d = new Debouncer(timeout)
      expect(d._cycleCount).to.equal(cycles)
    })
  })
  it('should add newly created debouncer to static list of debounders', () => {
    const bouncer = new Debouncer(100)
    expect(Debouncer._debouncers).to.have.lengthOf(1)
    expect(Debouncer._debouncers).to.deep.equal([bouncer])
  })
})
