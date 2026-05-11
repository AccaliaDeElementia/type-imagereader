'use sanity'

import Sinon from 'sinon'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { capturedSubscriber, getSubscriber, resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

describe('testutils/PubSub resetPubSub()', () => {
  afterEach(() => {
    sandbox.restore()
    resetPubSub()
  })
  it('should clear subscribers', () => {
    PubSub.subscribers = { 'TEST:TOPIC': [] }
    resetPubSub()
    expect(PubSub.subscribers).toEqual({})
  })
  it('should clear deferred', () => {
    PubSub.deferred = [{ method: sandbox.stub(), delayCycles: 1 }]
    resetPubSub()
    expect(PubSub.deferred).toEqual([])
  })
  it('should clear intervals', () => {
    PubSub.intervals = { test: { method: sandbox.stub(), delayCycles: 0, intervalCycles: 5 } }
    resetPubSub()
    expect(PubSub.intervals).toEqual({})
  })
  it('should clear timer', () => {
    PubSub.timer = 42
    resetPubSub()
    expect(PubSub.timer).toBe(undefined)
  })
  it('should assign a new object reference for subscribers on each call', () => {
    resetPubSub()
    const first = PubSub.subscribers
    resetPubSub()
    expect(PubSub.subscribers).not.toBe(first)
  })
  it('should assign a new array reference for deferred on each call', () => {
    resetPubSub()
    const first = PubSub.deferred
    resetPubSub()
    expect(PubSub.deferred).not.toBe(first)
  })
  it('should assign a new object reference for intervals on each call', () => {
    resetPubSub()
    const first = PubSub.intervals
    resetPubSub()
    expect(PubSub.intervals).not.toBe(first)
  })
})

describe('testutils/PubSub getSubscriber()', () => {
  afterEach(() => {
    sandbox.restore()
    resetPubSub()
  })
  it('should return the registered subscriber for the topic', () => {
    const stub = sandbox.stub().resolves()
    PubSub.subscribers['TEST:TOPIC'] = [stub]
    expect(getSubscriber('TEST:TOPIC')).toBe(stub)
  })
  it('should canonicalize the topic name to upper-case before lookup', () => {
    const stub = sandbox.stub().resolves()
    PubSub.subscribers['TEST:TOPIC'] = [stub]
    expect(getSubscriber('test:topic')).toBe(stub)
  })
  it('should return the most-recently-registered subscriber when multiple exist', () => {
    const earlier = sandbox.stub().resolves()
    const latest = sandbox.stub().resolves()
    PubSub.subscribers['TEST:TOPIC'] = [earlier, latest]
    expect(getSubscriber('TEST:TOPIC')).toBe(latest)
  })
  it('should leave the registry unchanged after retrieval', () => {
    const stub = sandbox.stub().resolves()
    PubSub.subscribers['TEST:TOPIC'] = [stub]
    getSubscriber('TEST:TOPIC')
    expect(PubSub.subscribers['TEST:TOPIC']).toEqual([stub])
  })
  it('should throw when the topic has no registered subscribers', () => {
    expect(() => getSubscriber('TEST:UNKNOWN')).toThrow(/TEST:UNKNOWN/v)
  })
  it('should throw when the topic is registered with an empty subscriber list', () => {
    PubSub.subscribers['TEST:EMPTY'] = []
    expect(() => getSubscriber('TEST:EMPTY')).toThrow(/TEST:EMPTY/v)
  })
})

describe('testutils/PubSub capturedSubscriber()', () => {
  let subscribeStub = sandbox.stub()
  beforeEach(() => {
    subscribeStub = sandbox.stub()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should return the handler function from the matching subscribe call', () => {
    const handler = sandbox.stub().resolves()
    subscribeStub('Test:Topic', handler)
    expect(capturedSubscriber(subscribeStub, 'Test:Topic')).toBe(handler)
  })
  it('should match the topic case-insensitively', () => {
    const handler = sandbox.stub().resolves()
    subscribeStub('Test:Topic', handler)
    expect(capturedSubscriber(subscribeStub, 'test:topic')).toBe(handler)
  })
  it('should return the most-recently-registered handler when multiple calls match', () => {
    const earlier = sandbox.stub().resolves()
    const latest = sandbox.stub().resolves()
    subscribeStub('Test:Topic', earlier)
    subscribeStub('Test:Topic', latest)
    expect(capturedSubscriber(subscribeStub, 'Test:Topic')).toBe(latest)
  })
  it('should ignore calls for non-matching topics', () => {
    const matching = sandbox.stub().resolves()
    const other = sandbox.stub().resolves()
    subscribeStub('Other:Topic', other)
    subscribeStub('Test:Topic', matching)
    expect(capturedSubscriber(subscribeStub, 'Test:Topic')).toBe(matching)
  })
  it('should throw when the stub has no matching subscribe call', () => {
    subscribeStub('Other:Topic', sandbox.stub().resolves())
    expect(() => capturedSubscriber(subscribeStub, 'Test:Missing')).toThrow(/Test:Missing/v)
  })
  it('should throw when the stub has no calls at all', () => {
    expect(() => capturedSubscriber(subscribeStub, 'Test:Missing')).toThrow(/Test:Missing/v)
  })
})
