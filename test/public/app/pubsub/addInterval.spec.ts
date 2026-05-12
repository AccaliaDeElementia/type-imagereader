'use sanity'

import Sinon from 'sinon'
import { PubSub, addInterval } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'

describe('public/app/pubsub addInterval()', () => {
  beforeEach(() => {
    PubSub.cycleTime = 10
    resetPubSub()
  })
  it('should add to intervals map', () => {
    const spy = Sinon.spy()
    addInterval('FOOBAR', spy, 0)
    expect(Object.keys(PubSub.intervals)).toContain('FOOBAR')
  })
  it('should store method to intervals map', () => {
    const spy = Sinon.spy()
    addInterval('FOOBAR', spy, 0)
    expect(PubSub.intervals.FOOBAR?.method).toBe(spy)
  })
  it('should replace interval method when adding already existing name', () => {
    const ival = {
      method: Sinon.spy(),
      intervalCycles: 9,
      delayCycles: 0,
    }
    PubSub.intervals.FOOBAR = ival
    addInterval('FOOBAR', Sinon.spy(), 0)
    expect(PubSub.intervals.FOOBAR).not.toBe(ival)
  })
  it('should add method with a zero delay cycles valuu', () => {
    const spy = Sinon.spy()
    addInterval('FOOBAR', spy, 65535)
    expect(PubSub.intervals.FOOBAR?.delayCycles).toBe(0)
  })
  const delayMaps: Array<[number, number]> = [
    [-100, 1],
    [-1, 1],
    [0, 1],
    [1, 1],
    [9, 1],
    [10, 1],
    [11, 2],
    [19, 2],
    [20, 2],
    [21, 3],
    [0.5, 1],
    [19.999999, 2],
    [31, 4],
  ]
  for (const [delay, mapped] of delayMaps) {
    it(`should convert an interval of ${delay}ms to ${mapped} interval cycles`, () => {
      addInterval('FOOBAR', Sinon.spy(), delay)
      expect(PubSub.intervals.FOOBAR?.intervalCycles).toBe(mapped)
    })
  }
  it('should invoke guardCallback with the operation when set', () => {
    const guard = Sinon.spy()
    PubSub.guardCallback = guard
    try {
      addInterval('FOOBAR', Sinon.spy(), 100)
    } finally {
      PubSub.guardCallback = undefined
    }
    expect(guard.firstCall.args[0]).toBe("addInterval 'FOOBAR'")
  })
  it('should propagate the throw from guardCallback before registering the interval', () => {
    PubSub.guardCallback = () => {
      throw new Error('guard tripped')
    }
    try {
      expect(() => {
        addInterval('FOOBAR', Sinon.spy(), 100)
      }).toThrow(/guard tripped/v)
      expect(PubSub.intervals.FOOBAR).toBe(undefined)
    } finally {
      PubSub.guardCallback = undefined
    }
  })
})
