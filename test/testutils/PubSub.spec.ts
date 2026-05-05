'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

describe('testutils/PubSub resetPubSub()', () => {
  afterEach(() => {
    sandbox.restore()
    resetPubSub()
  })
  it('should clear subscribers', () => {
    PubSub.subscribers = { 'TEST:TOPIC': [] }
    resetPubSub()
    expect(PubSub.subscribers).to.deep.equal({})
  })
  it('should clear deferred', () => {
    PubSub.deferred = [{ method: sandbox.stub(), delayCycles: 1 }]
    resetPubSub()
    expect(PubSub.deferred).to.deep.equal([])
  })
  it('should clear intervals', () => {
    PubSub.intervals = { test: { method: sandbox.stub(), delayCycles: 0, intervalCycles: 5 } }
    resetPubSub()
    expect(PubSub.intervals).to.deep.equal({})
  })
  it('should clear timer', () => {
    PubSub.timer = 42
    resetPubSub()
    expect(PubSub.timer).to.equal(undefined)
  })
  it('should assign a new object reference for subscribers on each call', () => {
    resetPubSub()
    const first = PubSub.subscribers
    resetPubSub()
    expect(PubSub.subscribers).to.not.equal(first)
  })
  it('should assign a new array reference for deferred on each call', () => {
    resetPubSub()
    const first = PubSub.deferred
    resetPubSub()
    expect(PubSub.deferred).to.not.equal(first)
  })
  it('should assign a new object reference for intervals on each call', () => {
    resetPubSub()
    const first = PubSub.intervals
    resetPubSub()
    expect(PubSub.intervals).to.not.equal(first)
  })
})
