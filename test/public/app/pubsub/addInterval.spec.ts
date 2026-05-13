'use sanity'

import { PubSub, addInterval } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'

describe('public/app/pubsub addInterval()', () => {
  beforeEach(() => {
    PubSub.cycleTime = 10
    resetPubSub()
  })
  it('should add to intervals map', () => {
    const spy = vi.fn()
    addInterval('FOOBAR', spy, 0)
    expect(Object.keys(PubSub.intervals)).toContain('FOOBAR')
  })
  it('should store method to intervals map', () => {
    const spy = vi.fn()
    addInterval('FOOBAR', spy, 0)
    expect(PubSub.intervals.FOOBAR?.method).toBe(spy)
  })
  it('should replace interval method when adding already existing name', () => {
    const ival = {
      method: vi.fn(),
      intervalCycles: 9,
      delayCycles: 0,
    }
    PubSub.intervals.FOOBAR = ival
    addInterval('FOOBAR', vi.fn(), 0)
    expect(PubSub.intervals.FOOBAR).not.toBe(ival)
  })
  it('should add method with a zero delay cycles valuu', () => {
    const spy = vi.fn()
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
      addInterval('FOOBAR', vi.fn(), delay)
      expect(PubSub.intervals.FOOBAR?.intervalCycles).toBe(mapped)
    })
  }
  it('should invoke guardCallback with the operation when set', () => {
    const guard = vi.fn()
    PubSub.guardCallback = guard
    try {
      addInterval('FOOBAR', vi.fn(), 100)
    } finally {
      PubSub.guardCallback = undefined
    }
    expect(guard.mock.calls[0]?.[0]).toBe("addInterval 'FOOBAR'")
  })
  it('should propagate the throw from guardCallback before registering the interval', () => {
    PubSub.guardCallback = () => {
      throw new Error('guard tripped')
    }
    try {
      expect(() => {
        addInterval('FOOBAR', vi.fn(), 100)
      }).toThrow(/guard tripped/v)
      expect(PubSub.intervals.FOOBAR).toBe(undefined)
    } finally {
      PubSub.guardCallback = undefined
    }
  })
})
