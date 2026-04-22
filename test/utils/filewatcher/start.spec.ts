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
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let subscribeStub = sandbox.stub()
  let setTimeoutStub = sandbox.stub()
  let clearTimeoutStub = sandbox.stub()
  let flushCallback: FlushCallback = sandbox.stub().resolves()
  let fakeSubscription: WatcherSubscription = { unsubscribe: sandbox.stub().resolves() }
  let subscriberCallback: SubscriberCallback = sandbox.stub()

  beforeEach(() => {
    loggerStub = sandbox.stub()
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    fakeSubscription = { unsubscribe: sandbox.stub().resolves() }
    subscriberCallback = sandbox.stub()
    subscribeStub = sandbox.stub(Imports, 'subscribe').callsFake(async (_dir, fn) => {
      subscriberCallback = Cast<SubscriberCallback>(fn)
      return await Promise.resolve(fakeSubscription)
    })
    setTimeoutStub = sandbox.stub(Imports, 'setTimeout').returns(Cast<ReturnType<typeof setTimeout>>(42))
    clearTimeoutStub = sandbox.stub(Imports, 'clearTimeout')
    flushCallback = sandbox.stub().resolves()
    Functions.debounceMs = 5000
    Functions.maxPendingChanges = 500
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

  it('should log watcher started message', async () => {
    await Functions.start('/data', flushCallback)
    expect(loggerStub.firstCall.args[0]).to.equal('File watcher started on')
  })

  it('should log data directory in startup message', async () => {
    await Functions.start('/data', flushCallback)
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

  it('should call clearTimeout once when new events arrive', async () => {
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
    expect(clearTimeoutStub.callCount).to.equal(1)
  })

  it('should pass timer id to clearTimeout when new events arrive', async () => {
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
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
    const rejectingFlush: FlushCallback = sandbox.stub().rejects(new Error('flush failed'))
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
    const rejectingFlush: FlushCallback = sandbox.stub().rejects(new Error('flush failed'))
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

  it('should flush immediately when changeset reaches maxPendingChanges', async () => {
    Functions.maxPendingChanges = 2
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [
      { type: 'create', path: '/data/foo.jpg' },
      { type: 'create', path: '/data/bar.jpg' },
    ])
    await Promise.resolve()
    await Promise.resolve()
    expect(Cast<Sinon.SinonStub>(flushCallback).callCount).to.equal(1)
  })

  it('should not schedule a timer when force-flushing at threshold', async () => {
    Functions.maxPendingChanges = 2
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [
      { type: 'create', path: '/data/foo.jpg' },
      { type: 'create', path: '/data/bar.jpg' },
    ])
    expect(setTimeoutStub.callCount).to.equal(0)
  })

  it('should clear existing timer when force-flushing at threshold', async () => {
    Functions.maxPendingChanges = 2
    await Functions.start('/data', flushCallback)
    // First event: below threshold, schedules a timer
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.callCount).to.equal(1)
    // Second event: reaches threshold, should clear the pending timer
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
    expect(clearTimeoutStub.callCount).to.equal(1)
  })

  it('should schedule a timer below maxPendingChanges', async () => {
    Functions.maxPendingChanges = 10
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.callCount).to.equal(1)
  })

  it('should not call flush callback immediately below maxPendingChanges', async () => {
    Functions.maxPendingChanges = 10
    await Functions.start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    expect(Cast<Sinon.SinonStub>(flushCallback).callCount).to.equal(0)
  })

  it('should clear pending timer in scheduleRetry when events arrive during flush', async () => {
    const delayedReject: FlushCallback = sandbox.stub().callsFake(async () => {
      await Promise.resolve()
      throw new Error('flush failed')
    })
    let flushFn: (() => void) | undefined = undefined
    setTimeoutStub.callsFake((fn: () => void) => {
      flushFn = fn
      return 42
    })
    await Functions.start('/data', delayedReject)
    // Event arrives, scheduleFlush sets debounce timer
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    const callFlush = Cast<() => void>(flushFn)
    // Timer fires — flush() sets debounceTimer = null, then awaits onFlush
    callFlush()
    // While onFlush is pending, new events arrive — scheduleFlush sets a new timer
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
    // onFlush rejects on next microtick — flush catch calls scheduleRetry with timer active
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    // scheduleRetry should have cleared the timer set during the pending flush
    expect(clearTimeoutStub.callCount).to.equal(1)
  })

  it('should log flush error when force-flush and scheduleRetry both fail', async () => {
    Functions.maxPendingChanges = 1
    const rejectingFlush: FlushCallback = sandbox.stub().rejects(new Error('flush failed'))
    setTimeoutStub.throws(new Error('setTimeout broke'))
    await Functions.start('/data', rejectingFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    const hasFlushError = loggerStub.getCalls().some((c) => c.args[0] === 'flush error')
    expect(hasFlushError).to.equal(true)
  })

  it('should log flush error from scheduleRetry timer when nested retry fails', async () => {
    const rejectingFlush: FlushCallback = sandbox.stub().rejects(new Error('flush failed'))
    let callCount = 0
    setTimeoutStub.callsFake((fn: () => void) => {
      callCount += 1
      if (callCount <= 2) {
        fn()
      }
      if (callCount > 2) {
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
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    const flushErrors = loggerStub.getCalls().filter((c) => c.args[0] === 'flush error')
    expect(flushErrors.length).to.be.above(0)
  })

  it('should not schedule a timer for initial force-flush', async () => {
    Functions.maxPendingChanges = 1
    const delayedFlush: FlushCallback = sandbox.stub().callsFake(async () => {
      await Promise.resolve()
    })
    await Functions.start('/data', delayedFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.callCount).to.equal(0)
  })

  it('should schedule debounce timer for events during in-flight force-flush', async () => {
    Functions.maxPendingChanges = 1
    const delayedFlush: FlushCallback = sandbox.stub().callsFake(async () => {
      await Promise.resolve()
    })
    await Functions.start('/data', delayedFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
    expect(setTimeoutStub.callCount).to.equal(1)
  })

  it('should not call flush a second time while force-flush is in progress', async () => {
    Functions.maxPendingChanges = 1
    const delayedFlush: FlushCallback = sandbox.stub().callsFake(async () => {
      await Promise.resolve()
    })
    await Functions.start('/data', delayedFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(Cast<Sinon.SinonStub>(delayedFlush).callCount).to.equal(1)
  })

  it('should allow a new force-flush after previous force-flush completes', async () => {
    Functions.maxPendingChanges = 1
    let flushCount = 0
    const delayedFlush: FlushCallback = sandbox.stub().callsFake(async () => {
      flushCount += 1
      await Promise.resolve()
    })
    await Functions.start('/data', delayedFlush)
    // First event triggers force-flush
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    // Let force-flush complete
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(flushCount).to.equal(1)
    // Second event should trigger a new force-flush since the first completed
    subscriberCallback(null, [{ type: 'create', path: '/data/baz.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(flushCount).to.equal(2)
  })

  it('should allow a new force-flush after previous force-flush rejects', async () => {
    Functions.maxPendingChanges = 1
    const rejectOnce: FlushCallback = sandbox
      .stub()
      .onFirstCall()
      .callsFake(async () => {
        await Promise.resolve()
        throw new Error('flush failed')
      })
      .onSecondCall()
      .callsFake(async () => {
        await Promise.resolve()
      })
    await Functions.start('/data', rejectOnce)
    // First event triggers force-flush which will reject
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    // Rejection schedules a debounced retry; fire new events to trigger force-flush again
    subscriberCallback(null, [{ type: 'create', path: '/data/bar.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(Cast<Sinon.SinonStub>(rejectOnce).callCount).to.equal(2)
  })

  it('should log retry message when immediate force-flush fails', async () => {
    Functions.maxPendingChanges = 1
    const rejectingFlush: FlushCallback = sandbox.stub().rejects(new Error('flush failed'))
    await Functions.start('/data', rejectingFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    const hasRetryLog = loggerStub.getCalls().some((c) => c.args[0] === 'Flush deferred, will retry')
    expect(hasRetryLog).to.equal(true)
  })

  it('should log the underlying error object alongside the retry message when onFlush rejects', async () => {
    const flushErr = new Error('db auth failed')
    let flushFn: (() => void) | undefined = undefined
    setTimeoutStub.callsFake((fn: () => void) => {
      flushFn = fn
      return 42
    })
    const rejectingFlush: FlushCallback = sandbox.stub().rejects(flushErr)
    await Functions.start('/data', rejectingFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    const callFlush = Cast<() => void>(flushFn)
    callFlush()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    const retryCall = loggerStub.getCalls().find((c) => c.args[0] === 'Flush deferred, will retry')
    expect(retryCall?.args[1]).to.equal(flushErr)
  })

  it('should schedule one debounce timer when immediate force-flush fails', async () => {
    Functions.maxPendingChanges = 1
    const rejectingFlush: FlushCallback = sandbox.stub().rejects(new Error('flush failed'))
    await Functions.start('/data', rejectingFlush)
    subscriberCallback(null, [{ type: 'create', path: '/data/foo.jpg' }])
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(setTimeoutStub.callCount).to.equal(1)
  })
})
