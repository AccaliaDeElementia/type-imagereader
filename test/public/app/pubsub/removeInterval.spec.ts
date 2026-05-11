'use sanity'

import Sinon from 'sinon'
import { PubSub, removeInterval } from '#public/scripts/app/pubsub.js'
import assert from 'node:assert'
import { cast } from '#testutils/typeGuards.js'

describe('public/app/pubsub removeInterval()', () => {
  beforeEach(() => {
    PubSub.cycleTime = 10
    PubSub.intervals = {
      FOOBAR: {
        method: Sinon.spy(),
        delayCycles: 0,
        intervalCycles: 10,
      },
      BAZ: {
        method: Sinon.spy(),
        delayCycles: 0,
        intervalCycles: 10,
      },
      QUUX: {
        method: Sinon.spy(),
        delayCycles: 0,
        intervalCycles: 10,
      },
    }
  })
  it('should remove existing interval', () => {
    removeInterval('FOOBAR')
    expect(Object.keys(PubSub.intervals)).not.toContain('FOOBAR')
  })
  it('should gracefully "remove" non-existing interval', () => {
    expect(() => {
      removeInterval('ASDFMovie')
    }).not.toThrow()
  })
  it('should regenerate interval map', () => {
    const ivals = PubSub.intervals
    removeInterval('FOOBAR')
    expect(PubSub.intervals).not.toBe(ivals)
  })
  it('should not remove BAZ interval', () => {
    removeInterval('FOOBAR')
    expect(Object.keys(PubSub.intervals)).toContain('BAZ')
  })
  it('should not remove QUUX interval', () => {
    removeInterval('FOOBAR')
    expect(Object.keys(PubSub.intervals)).toContain('QUUX')
  })
  it('should not call method on removing interval even if the interval is expired', () => {
    assert(PubSub.intervals.FOOBAR !== undefined)
    PubSub.intervals.FOOBAR.delayCycles = -1
    const spy = cast<Sinon.SinonSpy>(PubSub.intervals.FOOBAR.method)
    removeInterval('FOOBAR')
    expect(spy.callCount).toBe(0)
  })
})
