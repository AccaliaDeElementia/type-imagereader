'use sanity'

import Sinon from 'sinon'
import { PubSub } from '#public/scripts/app/pubsub.js'
import {
  capturedDeferred,
  capturedInterval,
  capturedSubscriber,
  mountPubSub,
  publishedData,
  resetPubSub,
  shouldGuard,
  unmountPubSub,
} from '#testutils/pubsub.js'

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

describe('testutils/PubSub mountPubSub() / unmountPubSub()', () => {
  afterEach(() => {
    unmountPubSub()
    sandbox.restore()
  })
  it('should set PubSub.guardCallback when mounted', () => {
    expect(PubSub.guardCallback).toBe(undefined)
    mountPubSub()
    expect(PubSub.guardCallback).toBeTypeOf('function')
  })
  it('should clear PubSub.guardCallback when unmounted', () => {
    mountPubSub()
    unmountPubSub()
    expect(PubSub.guardCallback).toBe(undefined)
  })
  it('should install a guardCallback that throws an informative error mentioning the operation', () => {
    mountPubSub()
    expect(() => PubSub.guardCallback?.("subscribe to 'X'")).toThrow(/subscribe to 'X'/v)
  })
  it('should install a guardCallback whose message hints at the Imports stub seam', () => {
    mountPubSub()
    expect(() => PubSub.guardCallback?.("publish 'Y'")).toThrow(/Imports/v)
  })
})

describe('testutils/PubSub capturedInterval()', () => {
  let addIntervalStub = sandbox.stub()
  beforeEach(() => {
    addIntervalStub = sandbox.stub()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should return the method arg from the matching addInterval call', () => {
    const method = sandbox.stub()
    addIntervalStub('TestInterval', method, 100)
    expect(capturedInterval(addIntervalStub, 'TestInterval')).toBe(method)
  })
  it('should match the name case-sensitively', () => {
    const method = sandbox.stub()
    addIntervalStub('TestInterval', method, 100)
    expect(() => capturedInterval(addIntervalStub, 'testinterval')).toThrow(/testinterval/v)
  })
  it('should return the most-recently-registered method when multiple calls match', () => {
    const earlier = sandbox.stub()
    const latest = sandbox.stub()
    addIntervalStub('TestInterval', earlier, 100)
    addIntervalStub('TestInterval', latest, 200)
    expect(capturedInterval(addIntervalStub, 'TestInterval')).toBe(latest)
  })
  it('should ignore calls for non-matching names', () => {
    const matching = sandbox.stub()
    const other = sandbox.stub()
    addIntervalStub('Other', other, 100)
    addIntervalStub('TestInterval', matching, 200)
    expect(capturedInterval(addIntervalStub, 'TestInterval')).toBe(matching)
  })
  it('should throw when the stub has no matching addInterval call', () => {
    addIntervalStub('Other', sandbox.stub(), 100)
    expect(() => capturedInterval(addIntervalStub, 'Missing')).toThrow(/Missing/v)
  })
  it('should throw when the stub has no calls at all', () => {
    expect(() => capturedInterval(addIntervalStub, 'Missing')).toThrow(/Missing/v)
  })
})

describe('testutils/PubSub capturedDeferred()', () => {
  let deferStub = sandbox.stub()
  beforeEach(() => {
    deferStub = sandbox.stub()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should return all method args from defer calls in registration order', () => {
    const first = sandbox.stub()
    const second = sandbox.stub()
    deferStub(first, 100)
    deferStub(second, 200)
    expect(capturedDeferred(deferStub)).toEqual([first, second])
  })
  it('should return an empty array when the stub has no calls', () => {
    expect(capturedDeferred(deferStub)).toEqual([])
  })
})

describe('testutils/PubSub shouldGuard()', () => {
  it('should guard ordinary app specs under test/public/app/', () => {
    expect(shouldGuard('/work/test/public/app/folders/init.spec.ts')).toBe(true)
  })
  it('should not guard pubsub specs under test/public/app/pubsub/', () => {
    expect(shouldGuard('/work/test/public/app/pubsub/subscribe.spec.ts')).toBe(false)
  })
  it('should not guard the pubsub testutil spec', () => {
    expect(shouldGuard('/work/test/testutils/pubSub.spec.ts')).toBe(false)
  })
  it('should guard server-side specs by default (no exclusion match)', () => {
    expect(shouldGuard('/work/test/sync/findItems/findSyncItems.spec.ts')).toBe(true)
  })
})
