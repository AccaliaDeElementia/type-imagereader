'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { Imports, Functions } from '#utils/filewatcher'
import type { FlushCallback, WatcherSubscription } from '#utils/filewatcher'
import { Cast } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

type SubscriberCallback = (err: Error | null, events: Array<{ type: string; path: string }>) => unknown

const sandbox = Sinon.createSandbox()

describe('utils/filewatcher Functions.start()', () => {
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let subscribeStub = Sinon.stub()
  let setTimeoutStub = Sinon.stub()
  let clearTimeoutStub = Sinon.stub()
  let flushCallback: FlushCallback = Sinon.stub().resolves()
  let fakeSubscription: WatcherSubscription = { unsubscribe: Sinon.stub().resolves() }
  let subscriberCallback: SubscriberCallback = Sinon.stub()

  beforeEach(() => {
    loggerStub = Sinon.stub()
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    fakeSubscription = { unsubscribe: Sinon.stub().resolves() }
    subscriberCallback = Sinon.stub()
    subscribeStub = sandbox.stub(Imports, 'subscribe').callsFake(async (_dir, fn) => {
      subscriberCallback = Cast<SubscriberCallback>(fn)
      return await Promise.resolve(fakeSubscription)
    })
    setTimeoutStub = sandbox.stub(Imports, 'setTimeout').returns(Cast<ReturnType<typeof setTimeout>>(42))
    clearTimeoutStub = sandbox.stub(Imports, 'clearTimeout')
    flushCallback = Sinon.stub().resolves()
    Functions.debounceMs = 5000
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should create a debug logger', async () => {
    await Functions.start('/data', flushCallback)
    expect(debugStub.callCount).to.equal(1)
  })

  it('should call subscribe with the data directory', async () => {
    await Functions.start('/data', flushCallback)
    expect(subscribeStub.firstCall.args[0]).to.equal('/data')
  })

  it('should return the subscription', async () => {
    const result = await Functions.start('/data', flushCallback)
    expect(result).to.equal(fakeSubscription)
  })

  it('should log that watcher started', async () => {
    await Functions.start('/data', flushCallback)
    expect(loggerStub.firstCall.args[0]).to.equal('File watcher started on')
    expect(loggerStub.firstCall.args[1]).to.equal('/data')
  })

  it('should schedule flush when create events arrive', async () => {
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.callCount).to.equal(1)
  })

  it('should schedule flush with debounceMs delay', async () => {
    Functions.debounceMs = 7000
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.firstCall.args[1]).to.equal(7000)
  })

  it('should not schedule flush when no qualifying events arrive', async () => {
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'update', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.callCount).to.equal(0)
  })

  it('should clear previous timer when new events arrive', async () => {
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
    expect(clearTimeoutStub.callCount).to.equal(1)
    expect(clearTimeoutStub.firstCall.args[0]).to.equal(42)
  })

  it('should log error when watcher reports error', async () => {
    await Functions.start('/data', flushCallback)
    const error = new Error('watch failed')
    subscriberCallback(error, [])
    expect(loggerStub.calledWith('watcher error', error)).to.equal(true)
  })

  it('should not schedule flush when watcher reports error', async () => {
    await Functions.start('/data', flushCallback)
    subscriberCallback(new Error('watch failed'), [])
    expect(setTimeoutStub.callCount).to.equal(0)
  })

  it('should call flush callback when timer fires', async () => {
    setTimeoutStub.callsFake((fn: () => void) => {
      fn()
      return 42
    })
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    expect(Cast<Sinon.SinonStub>(flushCallback).callCount).to.equal(1)
  })

  it('should pass changeset to flush callback', async () => {
    setTimeoutStub.callsFake((fn: () => void) => {
      fn()
      return 42
    })
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    const changeset = Cast<Map<string, string>>(Cast<Sinon.SinonStub>(flushCallback).firstCall.args[0])
    expect(changeset.get('/foo.jpg')).to.equal('create')
  })

  it('should clear changeset entries after successful flush', async () => {
    let flushFn: (() => void) | undefined = undefined
    setTimeoutStub.callsFake((fn: () => void) => {
      flushFn = fn
      return 42
    })
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    const callFlush = Cast<() => void>(flushFn)
    callFlush()
    await Promise.resolve()
    await Promise.resolve()
    // Fire again with no new events - should not call flush again since changeset is empty
    subscriberCallback(null, [{ type: 'update', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.callCount).to.equal(1)
  })

  it('should reschedule flush when flush callback rejects', async () => {
    const rejectingFlush: FlushCallback = Sinon.stub().rejects(new Error('flush failed'))
    let flushFn: (() => void) | undefined = undefined
    setTimeoutStub.callsFake((fn: () => void) => {
      flushFn = fn
      return 42
    })
    await Functions.start('/data', rejectingFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    const callFlush = Cast<() => void>(flushFn)
    callFlush()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    // Should have scheduled a retry
    expect(setTimeoutStub.callCount).to.be.above(1)
  })

  it('should not call flush callback when changeset is empty at flush time', async () => {
    let flushFn: (() => void) | undefined = undefined
    setTimeoutStub.callsFake((fn: () => void) => {
      flushFn = fn
      return 42
    })
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    // First flush — processes the changeset
    const callFirstFlush = Cast<() => void>(flushFn)
    callFirstFlush()
    await Promise.resolve()
    await Promise.resolve()
    expect(Cast<Sinon.SinonStub>(flushCallback).callCount).to.equal(1)
    // Second flush — changeset is now empty, should not call onFlush again
    const callSecondFlush = Cast<() => void>(flushFn)
    callSecondFlush()
    await Promise.resolve()
    await Promise.resolve()
    expect(Cast<Sinon.SinonStub>(flushCallback).callCount).to.equal(1)
  })

  it('should log flush error when retry scheduling throws', async () => {
    const rejectingFlush: FlushCallback = Sinon.stub().rejects(new Error('flush failed'))
    let callCount = 0
    setTimeoutStub.callsFake((fn: () => void) => {
      callCount += 1
      if (callCount === 1) {
        // First call: invoke flush immediately
        fn()
      }
      // After the first call, setTimeout will throw when scheduleFlush calls it from catch
      if (callCount > 1) {
        throw new Error('setTimeout broke')
      }
      return 42
    })
    await Functions.start('/data', rejectingFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    const hasFlushError = loggerStub.getCalls().some((c) => c.args[0] === 'flush error')
    expect(hasFlushError).to.equal(true)
  })
})
