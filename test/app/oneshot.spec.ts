'use sanity'

import { eventuallyRejects } from '#testutils/errors.js'
import { cast } from '#testutils/typeGuards.js'
import type { Stats } from 'node:fs'

import { ImageReader, Imports } from '#app.js'
import type { MockInstance } from 'vitest'

describe('app.ts ONESHOT mode tests', (): void => {
  let SynchronizeStub: MockInstance | undefined = undefined
  let LoggerStub: MockInstance | undefined = undefined
  let StartWatcherStub: MockInstance | undefined = undefined
  let DestroyStub: MockInstance | undefined = undefined

  beforeEach(() => {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    delete process.env.DISABLE_WATCHER
    delete process.env.SYNC_INTERVAL
    delete process.env.ONESHOT
    process.env.SKIP_SERVE = '1'
    SynchronizeStub = vi.spyOn(ImageReader, 'synchronize').mockResolvedValue(undefined)
    vi.useFakeTimers()
    LoggerStub = vi.spyOn(Imports, 'logger')
    StartWatcherStub = vi
      .spyOn(Imports, 'startWatcher')
      .mockResolvedValue({ unsubscribe: vi.fn().mockResolvedValue(undefined) })
    vi.spyOn(Imports, 'stat').mockResolvedValue(cast<Stats>({ isDirectory: () => true }))
    DestroyStub = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(Imports, 'initialize').mockResolvedValue(cast({ destroy: DestroyStub }))
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.SKIP_SERVE
    ImageReader.interval = undefined
    ImageReader.watcherSubscription = undefined
    ImageReader.watcherEnabled = false
    ImageReader.syncLock._locked = false
    ImageReader.syncInterval = 10_800_000
  })

  it('should call synchronize when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(SynchronizeStub).toHaveBeenCalled()
  })

  it('should call synchronize when ONESHOT is true', async () => {
    process.env.ONESHOT = 'true'
    await ImageReader.run()
    expect(SynchronizeStub).toHaveBeenCalled()
  })

  it('should not start watcher when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(StartWatcherStub).not.toHaveBeenCalled()
  })

  it('should not start watcher when ONESHOT is true', async () => {
    process.env.ONESHOT = 'true'
    await ImageReader.run()
    expect(StartWatcherStub).not.toHaveBeenCalled()
  })

  it('should leave watcherEnabled false when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(ImageReader.watcherEnabled).toBe(false)
  })

  it('should leave WatcherSubscription undefined when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(ImageReader.watcherSubscription).toBe(undefined)
  })

  it('should not schedule recurring sync when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    SynchronizeStub?.mockClear()
    vi.advanceTimersByTime(10_000)
    expect(SynchronizeStub).not.toHaveBeenCalled()
  })

  it('should leave Interval undefined when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(ImageReader.interval).toBe(undefined)
  })

  it('should call knex.destroy after sync when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(DestroyStub).toHaveBeenCalled()
  })

  it('should call knex.destroy even when synchronize rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    SynchronizeStub?.mockRejectedValue(new Error('SYNC FAILED'))
    await eventuallyRejects(ImageReader.run())
    expect(DestroyStub).toHaveBeenCalled()
  })

  it('should reject with sync error when synchronize rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    SynchronizeStub?.mockRejectedValue(new Error('SYNC FAILED'))
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toBe('SYNC FAILED')
  })

  it('should log when knex.destroy rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    DestroyStub?.mockRejectedValue(new Error('POOL TEARDOWN FAILED'))
    await ImageReader.run()
    const hasDestroyFailLog = (LoggerStub?.mock.calls ?? []).some(
      (c) => c[0] === 'failed to release knex pool in oneshot mode',
    )
    expect(hasDestroyFailLog).toBe(true)
  })

  it('should not call synchronize when ONESHOT and SKIP_SYNC are both set', async () => {
    process.env.ONESHOT = '1'
    process.env.SKIP_SYNC = '1'
    await ImageReader.run()
    expect(SynchronizeStub).not.toHaveBeenCalled()
  })

  it('should not call knex.destroy when ONESHOT and SKIP_SYNC are both set', async () => {
    process.env.ONESHOT = '1'
    process.env.SKIP_SYNC = '1'
    await ImageReader.run()
    expect(DestroyStub).not.toHaveBeenCalled()
  })
})
