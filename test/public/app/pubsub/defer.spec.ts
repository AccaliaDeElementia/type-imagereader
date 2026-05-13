'use sanity'

import { PubSub, defer } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'

describe('public/app/pubsub defer()', () => {
  beforeEach(() => {
    resetPubSub()
    PubSub.cycleTime = 10
  })
  it('should add exactly one item to deferred list', () => {
    const spy = vi.fn()
    defer(spy, 0)
    expect(PubSub.deferred).toHaveLength(1)
  })
  it('should store provided method in deferred list', () => {
    const spy = vi.fn()
    defer(spy, 0)
    expect(PubSub.deferred.pop()?.method).toBe(spy)
  })
  it('deferred method does not immediately fire', () => {
    const spy = vi.fn()
    defer(spy, 0)
    expect(spy.mock.calls.length).toBe(0)
  })
  it('should grow deferred list to 11 items when appending', () => {
    PubSub.deferred.push(
      ...Array.from({ length: 10 }).map(() => ({
        method: vi.fn(),
        delayCycles: 1,
      })),
    )
    defer(vi.fn(), 0)
    expect(PubSub.deferred).toHaveLength(11)
  })
  it('should append method as last deferred item', () => {
    PubSub.deferred.push(
      ...Array.from({ length: 10 }).map(() => ({
        method: vi.fn(),
        delayCycles: 1,
      })),
    )
    const spy = vi.fn()
    defer(spy, 0)
    expect(PubSub.deferred.pop()?.method).toBe(spy)
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
    it(`should convert a delay of ${delay}ms to ${mapped} delay cycles`, () => {
      defer(vi.fn(), delay)
      expect(PubSub.deferred.pop()?.delayCycles).toBe(mapped)
    })
  }
  it('should invoke guardCallback with the operation when set', () => {
    const guard = vi.fn()
    PubSub.guardCallback = guard
    try {
      defer(vi.fn(), 0)
    } finally {
      PubSub.guardCallback = undefined
    }
    expect(guard.mock.calls[0]?.[0]).toBe('defer')
  })
  it('should propagate the throw from guardCallback before queueing the deferred', () => {
    PubSub.guardCallback = () => {
      throw new Error('guard tripped')
    }
    try {
      expect(() => {
        defer(vi.fn(), 0)
      }).toThrow(/guard tripped/v)
      expect(PubSub.deferred).toHaveLength(0)
    } finally {
      PubSub.guardCallback = undefined
    }
  })
})
