'use sanity'

import { PubSub, removeInterval } from '#public/scripts/app/pubsub.js'
import assert from 'node:assert'
import { cast } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import type { MockInstance } from 'vitest'

describe('public/app/pubsub removeInterval()', () => {
  beforeEach(() => {
    PubSub.cycleTime = 10
    PubSub.intervals = {
      FOOBAR: {
        method: voidFn(),
        delayCycles: 0,
        intervalCycles: 10,
      },
      BAZ: {
        method: voidFn(),
        delayCycles: 0,
        intervalCycles: 10,
      },
      QUUX: {
        method: voidFn(),
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
    const spy = cast<MockInstance>(PubSub.intervals.FOOBAR.method)
    removeInterval('FOOBAR')
    expect(spy.mock.calls.length).toBe(0)
  })
  it('should invoke guardCallback with the operation when set', () => {
    const guard = voidFn()
    PubSub.guardCallback = guard
    try {
      removeInterval('FOOBAR')
    } finally {
      PubSub.guardCallback = undefined
    }
    expect(guard.mock.calls[0]?.[0]).toBe("removeInterval 'FOOBAR'")
  })
  it('should propagate the throw from guardCallback before regenerating the interval map', () => {
    const ivals = PubSub.intervals
    PubSub.guardCallback = () => {
      throw new Error('guard tripped')
    }
    try {
      expect(() => {
        removeInterval('FOOBAR')
      }).toThrow(/guard tripped/v)
      expect(PubSub.intervals).toBe(ivals)
    } finally {
      PubSub.guardCallback = undefined
    }
  })
})
