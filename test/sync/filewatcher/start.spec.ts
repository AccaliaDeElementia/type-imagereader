'use sanity'

import { Imports, Filewatcher, start } from '#sync/filewatcher.js'
import type { FlushCallback, WatcherSubscription } from '#sync/filewatcher.js'
import type { AsyncSubscription } from '@parcel/watcher'
import { cast } from '#testutils/typeGuards.js'
import { stubLoggerFactory } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

type SubscriberCallback = (err: Error | null, events: Array<{ type: string; path: string }>) => unknown

describe('sync/filewatcher start()', () => {
  let loggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let watcher = cast<WatcherSubscription>({})
  let setTimeoutStub: MockInstance = vi.fn()
  let clearTimeoutStub: MockInstance = vi.fn()
  let flushCallback: FlushCallback = vi.fn().mockResolvedValue(undefined)
  let fakeSubscription: AsyncSubscription = { unsubscribe: vi.fn().mockResolvedValue(undefined) }
  let subscriberCallback: SubscriberCallback = vi.fn()
  let scheduledFlush: (() => void) | undefined = undefined
  const TIMER_ID = cast<ReturnType<typeof setTimeout>>(42)

  beforeEach(() => {
    ;({ debugStub, loggerStub } = stubLoggerFactory(Imports))
    fakeSubscription = { unsubscribe: vi.fn().mockResolvedValue(undefined) }
    subscriberCallback = vi.fn()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation(async (_dir, fn) => {
      subscriberCallback = cast<SubscriberCallback>(fn)
      return await Promise.resolve(fakeSubscription)
    })
    setTimeoutStub = vi.spyOn(Imports, 'setTimeout').mockReturnValue(TIMER_ID)
    clearTimeoutStub = vi.spyOn(Imports, 'clearTimeout').mockImplementation((..._args: unknown[]) => undefined)
    flushCallback = vi.fn().mockResolvedValue(undefined)
    Filewatcher.debounceMs = 5000
    Filewatcher.maxPendingChanges = 500
    scheduledFlush = undefined
  })

  const captureScheduledFlush = (): void => {
    setTimeoutStub.mockImplementation((fn: () => void) => {
      scheduledFlush = fn
      return TIMER_ID
    })
  }
  const fireScheduledFlush = (): void => {
    cast<() => void>(scheduledFlush)()
  }
  const runFirstFlushThenBreakTheTimer = (): void => {
    let scheduleCount = 0
    setTimeoutStub.mockImplementation((fn: () => void) => {
      scheduleCount += 1
      if (scheduleCount > 1) throw new Error('setTimeout broke')
      fn()
      return TIMER_ID
    })
  }
  const eventArrives = (path: string): void => {
    subscriberCallback(null, [{ type: 'create', path }])
  }

  it('should create a debug logger', async () => {
    watcher = await start('/data', flushCallback)
    expect(debugStub.mock.calls.length).toBe(1)
  })

  it('should call subscribe with the data directory', async () => {
    watcher = await start('/data', flushCallback)
    expect(subscribeStub.mock.calls[0]?.[0]).toBe('/data')
  })

  it('should delegate unsubscribe to the watcher subscription', async () => {
    const unsubscribeStub = vi.fn().mockResolvedValue(undefined)
    fakeSubscription = { unsubscribe: unsubscribeStub }
    watcher = await start('/data', flushCallback)
    await watcher.unsubscribe()
    expect(unsubscribeStub.mock.calls.length).toBe(1)
  })

  it('should wait for an in-flight flush before unsubscribing', async () => {
    const { promise, resolve: resolveFlush } = Promise.withResolvers<undefined>()
    const flushStarted = Promise.withResolvers<undefined>()
    const order: string[] = []
    setTimeoutStub.mockImplementation((fn: () => void) => {
      fn()
      return 42
    })
    watcher = await start(
      '/data',
      cast<FlushCallback>(async () => {
        flushStarted.resolve(undefined)
        await promise
        order.push('flush')
      }),
    )
    eventArrives('/data/foo.jpg')
    await flushStarted.promise
    const teardown = watcher.unsubscribe().then((): void => {
      order.push('unsubscribe')
    })
    resolveFlush(undefined)
    await teardown
    expect(order).toEqual(['flush', 'unsubscribe'])
  })

  it('should log watcher started message', async () => {
    watcher = await start('/data', flushCallback)
    expect(loggerStub.mock.calls[0]?.[0]).toBe('File watcher started on')
  })

  it('should log data directory in startup message', async () => {
    watcher = await start('/data', flushCallback)
    expect(loggerStub.mock.calls[0]?.[1]).toBe('/data')
  })

  it('should schedule flush when create events arrive', async () => {
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    expect(setTimeoutStub.mock.calls.length).toBe(1)
  })

  it('should schedule flush with debounceMs delay', async () => {
    Filewatcher.debounceMs = 7000
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    expect(setTimeoutStub.mock.calls[0]?.[1]).toBe(7000)
  })

  it('should not schedule flush when no qualifying events arrive', async () => {
    watcher = await start('/data', flushCallback)
    subscriberCallback(null, [{ type: 'update', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.mock.calls.length).toBe(0)
  })

  it('should call clearTimeout once when new events arrive', async () => {
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    eventArrives('/data/bar.jpg')
    expect(clearTimeoutStub.mock.calls.length).toBe(1)
  })

  it('should pass timer id to clearTimeout when new events arrive', async () => {
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    eventArrives('/data/bar.jpg')
    expect(clearTimeoutStub.mock.calls[0]?.[0]).toBe(42)
  })

  it('should log error when watcher reports error', async () => {
    watcher = await start('/data', flushCallback)
    const error = new Error('watch failed')
    subscriberCallback(error, [])
    expect(loggerStub).toHaveBeenCalledWith('watcher error', error)
  })

  it('should not schedule flush when watcher reports error', async () => {
    watcher = await start('/data', flushCallback)
    subscriberCallback(new Error('watch failed'), [])
    expect(setTimeoutStub.mock.calls.length).toBe(0)
  })

  it('should call flush callback when timer fires', async () => {
    setTimeoutStub.mockImplementation((fn: () => void) => {
      fn()
      return 42
    })
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    expect(cast<MockInstance>(flushCallback).mock.calls.length).toBe(1)
  })

  it('should pass changeset to flush callback', async () => {
    setTimeoutStub.mockImplementation((fn: () => void) => {
      fn()
      return 42
    })
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    const changeset = cast<Map<string, string>>(cast<MockInstance>(flushCallback).mock.calls[0]?.[0])
    expect(changeset.get('/foo.jpg')).toBe('create')
  })

  it('should clear changeset entries after successful flush', async () => {
    captureScheduledFlush()
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    fireScheduledFlush()
    await watcher.whenFlushed()
    subscriberCallback(null, [{ type: 'update', path: '/data/foo.jpg' }])
    expect(setTimeoutStub.mock.calls.length).toBe(1)
  })

  it('should reschedule flush when flush callback rejects', async () => {
    const rejectingFlush: FlushCallback = vi.fn().mockRejectedValue(new Error('flush failed'))
    captureScheduledFlush()
    watcher = await start('/data', rejectingFlush)
    eventArrives('/data/foo.jpg')
    fireScheduledFlush()
    await watcher.whenFlushed()
    expect(setTimeoutStub.mock.calls.length).toBeGreaterThan(1)
  })

  it('should not call flush callback when changeset is empty at flush time', async () => {
    captureScheduledFlush()
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    fireScheduledFlush()
    await watcher.whenFlushed()
    expect(cast<MockInstance>(flushCallback).mock.calls.length).toBe(1)
    fireScheduledFlush()
    await watcher.whenFlushed()
    expect(cast<MockInstance>(flushCallback).mock.calls.length).toBe(1)
  })

  it('should log flush error when retry scheduling throws', async () => {
    const rejectingFlush: FlushCallback = vi.fn().mockRejectedValue(new Error('flush failed'))
    runFirstFlushThenBreakTheTimer()
    watcher = await start('/data', rejectingFlush)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    const hasFlushError = loggerStub.mock.calls.some((c) => c[0] === 'flush error')
    expect(hasFlushError).toBe(true)
  })

  it('should flush immediately when changeset reaches maxPendingChanges', async () => {
    Filewatcher.maxPendingChanges = 2
    watcher = await start('/data', flushCallback)
    subscriberCallback(null, [
      { type: 'create', path: '/data/foo.jpg' },
      { type: 'create', path: '/data/bar.jpg' },
    ])
    await watcher.whenFlushed()
    expect(cast<MockInstance>(flushCallback).mock.calls.length).toBe(1)
  })

  it('should not schedule a timer when force-flushing at threshold', async () => {
    Filewatcher.maxPendingChanges = 2
    watcher = await start('/data', flushCallback)
    subscriberCallback(null, [
      { type: 'create', path: '/data/foo.jpg' },
      { type: 'create', path: '/data/bar.jpg' },
    ])
    expect(setTimeoutStub.mock.calls.length).toBe(0)
  })

  it('should clear existing timer when force-flushing at threshold', async () => {
    Filewatcher.maxPendingChanges = 2
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    expect(setTimeoutStub.mock.calls.length).toBe(1)
    eventArrives('/data/bar.jpg')
    expect(clearTimeoutStub.mock.calls.length).toBe(1)
  })

  it('should schedule a timer below maxPendingChanges', async () => {
    Filewatcher.maxPendingChanges = 10
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    expect(setTimeoutStub.mock.calls.length).toBe(1)
  })

  it('should not call flush callback immediately below maxPendingChanges', async () => {
    Filewatcher.maxPendingChanges = 10
    watcher = await start('/data', flushCallback)
    eventArrives('/data/foo.jpg')
    expect(cast<MockInstance>(flushCallback).mock.calls.length).toBe(0)
  })

  it('should clear pending timer in scheduleRetry when events arrive during flush', async () => {
    const delayedReject: FlushCallback = vi.fn().mockImplementation(async () => {
      await Promise.resolve()
      throw new Error('flush failed')
    })
    captureScheduledFlush()
    watcher = await start('/data', delayedReject)
    eventArrives('/data/foo.jpg')
    fireScheduledFlush()
    eventArrives('/data/bar.jpg')
    await watcher.whenFlushed()
    expect(clearTimeoutStub.mock.calls.length).toBe(1)
  })

  it('should log flush error when force-flush and scheduleRetry both fail', async () => {
    Filewatcher.maxPendingChanges = 1
    const rejectingFlush: FlushCallback = vi.fn().mockRejectedValue(new Error('flush failed'))
    setTimeoutStub.mockImplementation(() => {
      throw new Error('setTimeout broke')
    })
    watcher = await start('/data', rejectingFlush)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    const hasFlushError = loggerStub.mock.calls.some((c) => c[0] === 'flush error')
    expect(hasFlushError).toBe(true)
  })

  it('should log flush error from scheduleRetry timer when nested retry fails', async () => {
    const rejectingFlush: FlushCallback = vi.fn().mockRejectedValue(new Error('flush failed'))
    let callCount = 0
    setTimeoutStub.mockImplementation((fn: () => void) => {
      callCount += 1
      if (callCount <= 2) {
        fn()
      }
      if (callCount > 2) {
        throw new Error('setTimeout broke')
      }
      return 42
    })
    watcher = await start('/data', rejectingFlush)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    const flushErrors = loggerStub.mock.calls.filter((c) => c[0] === 'flush error')
    expect(flushErrors.length).toBeGreaterThan(0)
  })

  it('should not schedule a timer for initial force-flush', async () => {
    Filewatcher.maxPendingChanges = 1
    const delayedFlush: FlushCallback = vi.fn().mockImplementation(async () => {
      await Promise.resolve()
    })
    watcher = await start('/data', delayedFlush)
    eventArrives('/data/foo.jpg')
    expect(setTimeoutStub.mock.calls.length).toBe(0)
  })

  it('should schedule debounce timer for events during in-flight force-flush', async () => {
    Filewatcher.maxPendingChanges = 1
    const delayedFlush: FlushCallback = vi.fn().mockImplementation(async () => {
      await Promise.resolve()
    })
    watcher = await start('/data', delayedFlush)
    eventArrives('/data/foo.jpg')
    eventArrives('/data/bar.jpg')
    expect(setTimeoutStub.mock.calls.length).toBe(1)
  })

  it('should not call flush a second time while force-flush is in progress', async () => {
    Filewatcher.maxPendingChanges = 1
    const delayedFlush: FlushCallback = vi.fn().mockImplementation(async () => {
      await Promise.resolve()
    })
    watcher = await start('/data', delayedFlush)
    eventArrives('/data/foo.jpg')
    eventArrives('/data/bar.jpg')
    await watcher.whenFlushed()
    expect(cast<MockInstance>(delayedFlush).mock.calls.length).toBe(1)
  })

  it('should allow a new force-flush after previous force-flush completes', async () => {
    Filewatcher.maxPendingChanges = 1
    let flushCount = 0
    const delayedFlush: FlushCallback = vi.fn().mockImplementation(async () => {
      flushCount += 1
      await Promise.resolve()
    })
    watcher = await start('/data', delayedFlush)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    expect(flushCount).toBe(1)
    eventArrives('/data/baz.jpg')
    await watcher.whenFlushed()
    expect(flushCount).toBe(2)
  })

  it('should allow a new force-flush after previous force-flush rejects', async () => {
    Filewatcher.maxPendingChanges = 1
    const rejectOnce: FlushCallback = vi
      .fn()
      .mockImplementationOnce(async () => {
        await Promise.resolve()
        throw new Error('flush failed')
      })
      .mockImplementationOnce(async () => {
        await Promise.resolve()
      })
    watcher = await start('/data', rejectOnce)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    eventArrives('/data/bar.jpg')
    await watcher.whenFlushed()
    expect(cast<MockInstance>(rejectOnce).mock.calls.length).toBe(2)
  })

  it('should log retry message when immediate force-flush fails', async () => {
    Filewatcher.maxPendingChanges = 1
    const rejectingFlush: FlushCallback = vi.fn().mockRejectedValue(new Error('flush failed'))
    watcher = await start('/data', rejectingFlush)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    const hasRetryLog = loggerStub.mock.calls.some((c) => c[0] === 'Flush deferred, will retry')
    expect(hasRetryLog).toBe(true)
  })

  it('should log the underlying error object alongside the retry message when onFlush rejects', async () => {
    const flushErr = new Error('db auth failed')
    captureScheduledFlush()
    const rejectingFlush: FlushCallback = vi.fn().mockRejectedValue(flushErr)
    watcher = await start('/data', rejectingFlush)
    eventArrives('/data/foo.jpg')
    fireScheduledFlush()
    await watcher.whenFlushed()
    const retryCall = loggerStub.mock.calls.find((c) => c[0] === 'Flush deferred, will retry')
    expect(retryCall?.[1]).toBe(flushErr)
  })

  const runFlushRaceScenario = async (): Promise<MockInstance> => {
    const { promise, resolve: resolveFlush } = Promise.withResolvers<undefined>()
    const flushStarted = Promise.withResolvers<undefined>()
    const delayedFlush = vi.fn().mockImplementation(async () => {
      flushStarted.resolve(undefined)
      await promise
    })
    captureScheduledFlush()
    watcher = await start('/data', cast<FlushCallback>(delayedFlush))
    eventArrives('/data/foo.jpg')
    fireScheduledFlush()
    await flushStarted.promise
    subscriberCallback(null, [{ type: 'delete', path: '/data/foo.jpg' }])
    resolveFlush(undefined)
    await watcher.whenFlushed()
    fireScheduledFlush()
    await watcher.whenFlushed()
    return delayedFlush
  }

  it('should call onFlush a second time when an event re-sets a flushed key during flush', async () => {
    const stub = await runFlushRaceScenario()
    expect(stub.mock.calls.length).toBe(2)
  })

  it('should pass the re-set value to the second flush when an event arrives during flush', async () => {
    const stub = await runFlushRaceScenario()
    expect(cast<Map<string, string>>(stub.mock.calls[1]?.[0]).get('/foo.jpg')).toBe('delete')
  })

  it('should schedule one debounce timer when immediate force-flush fails', async () => {
    Filewatcher.maxPendingChanges = 1
    const rejectingFlush: FlushCallback = vi.fn().mockRejectedValue(new Error('flush failed'))
    watcher = await start('/data', rejectingFlush)
    eventArrives('/data/foo.jpg')
    await watcher.whenFlushed()
    expect(setTimeoutStub.mock.calls.length).toBe(1)
  })
})
