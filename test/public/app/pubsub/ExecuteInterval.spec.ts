'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'

import { PubSub } from '../../../../public/scripts/app/pubsub'

describe('public/app/pubsub function RemoveInterval()', () => {
  const testInterval = {
    method: Sinon.stub(),
    delayCycles: 10,
    intervalCycles: 10,
  }
  const testDefer = {
    method: Sinon.stub(),
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
  after(() => {
    Sinon.restore()
  })
  it('should decrement delayCycle count for pending defer', () => {
    PubSub.ExecuteInterval()
    expect(testDefer.delayCycles).to.equal(9)
    PubSub.ExecuteInterval()
    expect(testDefer.delayCycles).to.equal(8)
  })
  it('should decrement delayCycle count for interval', () => {
    PubSub.ExecuteInterval()
    expect(testInterval.delayCycles).to.equal(9)
    PubSub.ExecuteInterval()
    expect(testInterval.delayCycles).to.equal(8)
  })
  it('should not execute defered task that has not expired', () => {
    testDefer.delayCycles = 10
    PubSub.ExecuteInterval()
    expect(testDefer.method.callCount).to.equal(0)
  })
  it('should not execute interval task that has not expired', () => {
    testInterval.delayCycles = 10
    PubSub.ExecuteInterval()
    expect(testInterval.method.callCount).to.equal(0)
  })
  it('should execute defered task that has expired', () => {
    testDefer.delayCycles = 0
    PubSub.ExecuteInterval()
    expect(testDefer.method.callCount).to.equal(1)
  })
  it('should execute interval task that has expired', () => {
    testInterval.delayCycles = 0
    PubSub.ExecuteInterval()
    expect(testInterval.method.callCount).to.equal(1)
  })
  it('should execute defered task that is overdue', () => {
    testDefer.delayCycles = -100
    PubSub.ExecuteInterval()
    expect(testDefer.method.callCount).to.equal(1)
  })
  it('should execute interval task that is overdue', () => {
    testInterval.delayCycles = -1001
    PubSub.ExecuteInterval()
    expect(testInterval.method.callCount).to.equal(1)
  })
  it('should remove expired delay method after executing', () => {
    testDefer.delayCycles = 0
    PubSub.ExecuteInterval()
    expect(PubSub.deferred).to.not.contain(testDefer)
  })
  it('should reset interval delay time when interval fires', () => {
    testInterval.delayCycles = 0
    testInterval.intervalCycles = 7
    PubSub.ExecuteInterval()
    expect(testInterval.delayCycles).to.equal(7)
  })
  it('should tolerate deferred method throwing', () => {
    testDefer.delayCycles = 0
    testDefer.method.throws('BAD ERROR')
    expect(() => {
      PubSub.ExecuteInterval()
    }).to.not.throw()
  })
  it('should tolerate interval throwing', () => {
    testInterval.delayCycles = 0
    testInterval.method.throws('BAD ERROR')
    expect(() => {
      PubSub.ExecuteInterval()
    }).to.not.throw()
  })
})
