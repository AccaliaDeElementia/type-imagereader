'use sanity'

import { PubSub, subscribe } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { voidFn } from '#testutils/mocks.js'
describe('public/app/pubsub subscribe()', () => {
  let subscriber = vi.fn().mockResolvedValue(undefined)
  beforeEach(() => {
    resetPubSub()
    PubSub.cycleTime = 10
    subscriber = vi.fn().mockResolvedValue(undefined)
  })
  const topics = ['foobar:baz', 'Foobar:Baz', 'fOoBaR:bAz', 'FoOBaR:BaZ', 'FOOBAR:BAZ', 'foobar:BAZ', 'FOOBAR:baz']
  topics.forEach((topic) => {
    it(`should normalise ${topic} to FOOBAR:BAZ key`, () => {
      subscribe(topic, subscriber)
      expect(Object.keys(PubSub.subscribers)).toContain('FOOBAR:BAZ')
    })
    it(`should store subscriber under FOOBAR:BAZ when topic is ${topic}`, () => {
      subscribe(topic, subscriber)
      expect(PubSub.subscribers['FOOBAR:BAZ']).toEqual([subscriber])
    })
  })
  it('should grow subscriber list length to 11 when appending to 10 existing', () => {
    PubSub.subscribers['FOOBAR:BAZ'] = []
    for (let i = 0; i < 10; i += 1) {
      PubSub.subscribers['FOOBAR:BAZ'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscribe('Foobar:Baz', subscriber)
    expect(PubSub.subscribers['FOOBAR:BAZ']).toHaveLength(11)
  })
  it('should append subscriber as last element in subscriber list', () => {
    PubSub.subscribers['FOOBAR:BAZ'] = []
    for (let i = 0; i < 10; i += 1) {
      PubSub.subscribers['FOOBAR:BAZ'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscribe('Foobar:Baz', subscriber)
    expect(PubSub.subscribers['FOOBAR:BAZ'][10]).toBe(subscriber)
  })
  it('should invoke guardCallback with the operation when set', () => {
    const guard = voidFn()
    PubSub.guardCallback = guard
    try {
      subscribe('Foobar:Baz', subscriber)
    } finally {
      PubSub.guardCallback = undefined
    }
    expect(guard.mock.calls[0]?.[0]).toBe("subscribe to 'Foobar:Baz'")
  })
  it('should propagate the throw from guardCallback before registering the subscriber', () => {
    PubSub.guardCallback = () => {
      throw new Error('guard tripped')
    }
    try {
      expect(() => {
        subscribe('Foobar:Baz', subscriber)
      }).toThrow(/guard tripped/v)
      expect(PubSub.subscribers['FOOBAR:BAZ']).toBe(undefined)
    } finally {
      PubSub.guardCallback = undefined
    }
  })
})
