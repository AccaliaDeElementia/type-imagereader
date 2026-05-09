'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'

import { PubSub, RemoveInterval } from '#public/scripts/app/pubsub.js'
import assert from 'node:assert'
import { cast } from '#testutils/TypeGuards.js'

describe('public/app/pubsub RemoveInterval()', () => {
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
    RemoveInterval('FOOBAR')
    expect(PubSub.intervals).to.not.have.any.keys('FOOBAR')
  })
  it('should gracefully "remove" non-existing interval', () => {
    expect(() => {
      RemoveInterval('ASDFMovie')
    }).to.not.throw()
  })
  it('should regenerate interval map', () => {
    const ivals = PubSub.intervals
    RemoveInterval('FOOBAR')
    expect(PubSub.intervals).to.not.equal(ivals)
  })
  it('should not remove BAZ interval', () => {
    RemoveInterval('FOOBAR')
    expect(PubSub.intervals).to.have.any.keys('BAZ')
  })
  it('should not remove QUUX interval', () => {
    RemoveInterval('FOOBAR')
    expect(PubSub.intervals).to.have.any.keys('QUUX')
  })
  it('should not call method on removing interval even if the interval is expired', () => {
    assert(PubSub.intervals.FOOBAR !== undefined)
    PubSub.intervals.FOOBAR.delayCycles = -1
    const spy = cast<Sinon.SinonSpy>(PubSub.intervals.FOOBAR.method)
    RemoveInterval('FOOBAR')
    expect(spy.callCount).to.equal(0)
  })
})
