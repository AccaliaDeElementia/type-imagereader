'use sanity'

import Sinon from 'sinon'
import { eventuallyRejects } from '#testutils/errors.js'
import { cast } from '#testutils/typeGuards.js'
import type { Stats } from 'node:fs'

import { ImageReader, Imports } from '#app.js'

const sandbox = Sinon.createSandbox()

describe('app.ts ONESHOT mode tests', (): void => {
  let SynchronizeStub: Sinon.SinonStub | undefined = undefined
  let ClockFake: Sinon.SinonFakeTimers | undefined = undefined
  let LoggerStub: Sinon.SinonStub | undefined = undefined
  let StartWatcherStub: Sinon.SinonStub | undefined = undefined
  let DestroyStub: Sinon.SinonStub | undefined = undefined

  beforeEach(() => {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    delete process.env.DISABLE_WATCHER
    delete process.env.SYNC_INTERVAL
    delete process.env.ONESHOT
    process.env.SKIP_SERVE = '1'
    SynchronizeStub = sandbox.stub(ImageReader, 'synchronize').resolves()
    ClockFake = sandbox.useFakeTimers()
    LoggerStub = sandbox.stub(Imports, 'logger')
    StartWatcherStub = sandbox.stub(Imports, 'startWatcher').resolves({ unsubscribe: sandbox.stub().resolves() })
    sandbox.stub(Imports, 'stat').resolves(cast<Stats>({ isDirectory: () => true }))
    DestroyStub = sandbox.stub().resolves()
    sandbox.stub(Imports, 'initialize').resolves(cast({ destroy: DestroyStub }))
  })

  afterEach(() => {
    sandbox.restore()
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
    expect(SynchronizeStub?.called).toBe(true)
  })

  it('should call synchronize when ONESHOT is true', async () => {
    process.env.ONESHOT = 'true'
    await ImageReader.run()
    expect(SynchronizeStub?.called).toBe(true)
  })

  it('should not start watcher when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(StartWatcherStub?.called).toBe(false)
  })

  it('should not start watcher when ONESHOT is true', async () => {
    process.env.ONESHOT = 'true'
    await ImageReader.run()
    expect(StartWatcherStub?.called).toBe(false)
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
    SynchronizeStub?.resetHistory()
    ClockFake?.tick(10_000)
    expect(SynchronizeStub?.called).toBe(false)
  })

  it('should leave Interval undefined when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(ImageReader.interval).toBe(undefined)
  })

  it('should call knex.destroy after sync when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.run()
    expect(DestroyStub?.called).toBe(true)
  })

  it('should call knex.destroy even when synchronize rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    SynchronizeStub?.rejects(new Error('SYNC FAILED'))
    await eventuallyRejects(ImageReader.run())
    expect(DestroyStub?.called).toBe(true)
  })

  it('should reject with sync error when synchronize rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    SynchronizeStub?.rejects(new Error('SYNC FAILED'))
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toBe('SYNC FAILED')
  })

  it('should log when knex.destroy rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    DestroyStub?.rejects(new Error('POOL TEARDOWN FAILED'))
    await ImageReader.run()
    const hasDestroyFailLog = (LoggerStub?.getCalls() ?? []).some(
      (c) => c.args[0] === 'failed to release knex pool in oneshot mode',
    )
    expect(hasDestroyFailLog).toBe(true)
  })

  it('should not call synchronize when ONESHOT and SKIP_SYNC are both set', async () => {
    process.env.ONESHOT = '1'
    process.env.SKIP_SYNC = '1'
    await ImageReader.run()
    expect(SynchronizeStub?.called).toBe(false)
  })

  it('should not call knex.destroy when ONESHOT and SKIP_SYNC are both set', async () => {
    process.env.ONESHOT = '1'
    process.env.SKIP_SYNC = '1'
    await ImageReader.run()
    expect(DestroyStub?.called).toBe(false)
  })
})
