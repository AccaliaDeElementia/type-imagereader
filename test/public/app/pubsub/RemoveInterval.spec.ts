'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import assert from 'node:assert'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pubsub function RemoveInterval()', () => {
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
    PubSub.RemoveInterval('FOOBAR')
    expect(PubSub.intervals).to.not.have.any.keys('FOOBAR')
  })
  it('should gracefully "remove" non-existing interval', () => {
    expect(() => {
      PubSub.RemoveInterval('ASDFMovie')
    }).to.not.throw()
  })
  it('should regenerate interval map', () => {
    const ivals = PubSub.intervals
    PubSub.RemoveInterval('FOOBAR')
    expect(PubSub.intervals).to.not.equal(ivals)
  })
  it('should not remove other intervals', () => {
    PubSub.RemoveInterval('FOOBAR')
    expect(PubSub.intervals).to.have.any.keys('BAZ')
    expect(PubSub.intervals).to.have.any.keys('QUUX')
  })
  it('should not call method on removing interval even if the interval is expired', () => {
    assert(PubSub.intervals.FOOBAR != null)
    PubSub.intervals.FOOBAR.delayCycles = -1
    const spy = Cast<Sinon.SinonSpy>(PubSub.intervals.FOOBAR.method)
    PubSub.RemoveInterval('FOOBAR')
    expect(spy.callCount).to.equal(0)
  })
})
