'use sanity'

import assert from 'node:assert'
import { PubSub, forward } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'

describe('public/app/pubsub forward()', () => {
  beforeEach(() => {
    resetPubSub()
    PubSub.cycleTime = 10
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should register a subscriber under the source topic', () => {
    forward('Foo:Bar', 'Baz:Qux')
    expect(Object.keys(PubSub.subscribers)).toContain('FOO:BAR')
  })
  it('should register exactly one subscriber on the source topic', () => {
    forward('Foo:Bar', 'Baz:Qux')
    expect(PubSub.subscribers['FOO:BAR']).toHaveLength(1)
  })
  it('should publish to the target topic when the source-topic subscriber fires', async () => {
    forward('Foo:Bar', 'Baz:Qux')
    const targetSpy = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['BAZ:QUX'] = [targetSpy]
    const handler = PubSub.subscribers['FOO:BAR']?.[0]
    assert(handler !== undefined)
    await handler(undefined)
    expect(targetSpy.mock.calls.length).toBe(1)
  })
  it('should not invoke the target subscriber before the source fires', () => {
    const targetSpy = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['BAZ:QUX'] = [targetSpy]
    forward('Foo:Bar', 'Baz:Qux')
    expect(targetSpy.mock.calls.length).toBe(0)
  })
  it('should append rather than replace when a subscriber already exists on the source topic', () => {
    const existing = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['FOO:BAR'] = [existing]
    forward('Foo:Bar', 'Baz:Qux')
    expect(PubSub.subscribers['FOO:BAR']).toHaveLength(2)
  })
  it('should invoke guardCallback with the operation when set', () => {
    const guard = vi.fn()
    PubSub.guardCallback = guard
    try {
      forward('Foo:Bar', 'Baz:Qux')
    } finally {
      PubSub.guardCallback = undefined
    }
    expect(guard.mock.calls[0]?.[0]).toBe("forward 'Foo:Bar' -> 'Baz:Qux'")
  })
  it('should propagate the throw from guardCallback before registering the inner subscriber', () => {
    PubSub.guardCallback = () => {
      throw new Error('guard tripped')
    }
    try {
      expect(() => {
        forward('Foo:Bar', 'Baz:Qux')
      }).toThrow(/guard tripped/v)
      expect(PubSub.subscribers['FOO:BAR']).toBe(undefined)
    } finally {
      PubSub.guardCallback = undefined
    }
  })
})
