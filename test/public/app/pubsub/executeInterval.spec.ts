'use sanity'

import Sinon from 'sinon'
import { PubSub, Internals } from '#public/scripts/app/pubsub.js'

const sandbox = Sinon.createSandbox()
describe('public/app/pubsub executeInterval()', () => {
  const testInterval = {
    method: sandbox.stub(),
    delayCycles: 10,
    intervalCycles: 10,
  }
  const testDefer = {
    method: sandbox.stub(),
    delayCycles: 10,
  }
  beforeEach(() => {
    PubSub.cycleTime = 10
    PubSub.intervals = {
      FOOBAR: testInterval,
    }
    PubSub.deferred = [testDefer]
    testInterval.delayCycles = 10
    testInterval.intervalCycles = 10
    testInterval.method.reset()
    testDefer.delayCycles = 10
    testDefer.method.reset()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should decrement delayCycle count once for pending defer', () => {
    Internals.executeInterval()
    expect(testDefer.delayCycles).toBe(9)
  })
  it('should decrement delayCycle count on successive call for pending defer', () => {
    Internals.executeInterval()
    Internals.executeInterval()
    expect(testDefer.delayCycles).toBe(8)
  })
  it('should decrement delayCycle count once for interval', () => {
    Internals.executeInterval()
    expect(testInterval.delayCycles).toBe(9)
  })
  it('should decrement delayCycle count on successive call for interval', () => {
    Internals.executeInterval()
    Internals.executeInterval()
    expect(testInterval.delayCycles).toBe(8)
  })
  it('should not execute defered task that has not expired', () => {
    testDefer.delayCycles = 10
    Internals.executeInterval()
    expect(testDefer.method.callCount).toBe(0)
  })
  it('should not execute interval task that has not expired', () => {
    testInterval.delayCycles = 10
    Internals.executeInterval()
    expect(testInterval.method.callCount).toBe(0)
  })
  it('should execute defered task that has expired', () => {
    testDefer.delayCycles = 0
    Internals.executeInterval()
    expect(testDefer.method.callCount).toBe(1)
  })
  it('should execute interval task that has expired', () => {
    testInterval.delayCycles = 0
    Internals.executeInterval()
    expect(testInterval.method.callCount).toBe(1)
  })
  it('should execute defered task that is overdue', () => {
    testDefer.delayCycles = -100
    Internals.executeInterval()
    expect(testDefer.method.callCount).toBe(1)
  })
  it('should execute interval task that is overdue', () => {
    testInterval.delayCycles = -1001
    Internals.executeInterval()
    expect(testInterval.method.callCount).toBe(1)
  })
  it('should remove expired delay method after executing', () => {
    testDefer.delayCycles = 0
    Internals.executeInterval()
    expect(PubSub.deferred).not.toContain(testDefer)
  })
  it('should reset interval delay time when interval fires', () => {
    testInterval.delayCycles = 0
    testInterval.intervalCycles = 7
    Internals.executeInterval()
    expect(testInterval.delayCycles).toBe(7)
  })
  it('should tolerate deferred method throwing', () => {
    testDefer.delayCycles = 0
    testDefer.method.throws('BAD ERROR')
    expect(() => {
      Internals.executeInterval()
    }).not.toThrow()
  })
  it('should tolerate interval throwing', () => {
    testInterval.delayCycles = 0
    testInterval.method.throws('BAD ERROR')
    expect(() => {
      Internals.executeInterval()
    }).not.toThrow()
  })
})
