'use sanity'

import Sinon from 'sinon'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { capturedSubscriber, publishedData, resetPubSub } from '#testutils/pubsub.js'

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

describe('testutils/PubSub publishedData()', () => {
  let publishStub = sandbox.stub()
  beforeEach(() => {
    publishStub = sandbox.stub()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should return the data arg of the matching publish call', () => {
    publishStub('Test:Topic', 'payload')
    expect(publishedData(publishStub, 'Test:Topic')).toBe('payload')
  })
  it('should match the topic case-insensitively', () => {
    publishStub('Test:Topic', 'payload')
    expect(publishedData(publishStub, 'test:topic')).toBe('payload')
  })
  it('should return the data of the first matching call when multiple match', () => {
    publishStub('Test:Topic', 'first')
    publishStub('Test:Topic', 'second')
    expect(publishedData(publishStub, 'Test:Topic')).toBe('first')
  })
  it('should ignore calls for non-matching topics', () => {
    publishStub('Other:Topic', 'noise')
    publishStub('Test:Topic', 'signal')
    expect(publishedData(publishStub, 'Test:Topic')).toBe('signal')
  })
  it('should throw when the stub has no matching publish call', () => {
    publishStub('Other:Topic', 'data')
    expect(() => publishedData(publishStub, 'Test:Missing')).toThrow(/Test:Missing/v)
  })
  it('should throw when the stub has no calls at all', () => {
    expect(() => publishedData(publishStub, 'Test:Missing')).toThrow(/Test:Missing/v)
  })
})
