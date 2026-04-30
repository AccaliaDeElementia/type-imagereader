'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import Sinon from 'sinon'
import { EventuallyRejects } from '#testutils/Errors'

import { ImageReader, Imports } from '#app'

const sandbox = Sinon.createSandbox()

describe('index.ts ONESHOT mode tests', (): void => {
  let SynchronizeStub: Sinon.SinonStub | undefined = undefined
  let ClockFake: Sinon.SinonFakeTimers | undefined = undefined
  let LoggerStub: Sinon.SinonStub | undefined = undefined
  let StartWatcherStub: Sinon.SinonStub | undefined = undefined
  let PersistanceStub: { initialize: Sinon.SinonStub } | undefined = undefined
  let DestroyStub: Sinon.SinonStub | undefined = undefined

  beforeEach(() => {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    delete process.env.DISABLE_WATCHER
    delete process.env.SYNC_INTERVAL
    delete process.env.ONESHOT
    process.env.SKIP_SERVE = '1'
    SynchronizeStub = sandbox.stub(ImageReader, 'Synchronize').resolves()
    ClockFake = sandbox.useFakeTimers()
    LoggerStub = sandbox.stub(Imports, 'logger')
    StartWatcherStub = sandbox.stub(Imports, 'startWatcher').resolves({ unsubscribe: sandbox.stub().resolves() })
    DestroyStub = sandbox.stub().resolves()
    PersistanceStub = { initialize: sandbox.stub().resolves({ destroy: DestroyStub }) }
    sandbox.stub(Imports, 'persistance').value(PersistanceStub)
  })

  afterEach(() => {
    sandbox.restore()
    delete process.env.SKIP_SERVE
    ImageReader.Interval = undefined
    ImageReader.WatcherSubscription = undefined
    ImageReader.WatcherEnabled = false
    ImageReader.SyncLock._locked = false
    ImageReader.SyncInterval = 10_800_000
  })

  it('should call Synchronize when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should call Synchronize when ONESHOT is true', async () => {
    process.env.ONESHOT = 'true'
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should not start watcher when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.Run()
    expect(StartWatcherStub?.called).to.equal(false)
  })

  it('should not start watcher when ONESHOT is true', async () => {
    process.env.ONESHOT = 'true'
    await ImageReader.Run()
    expect(StartWatcherStub?.called).to.equal(false)
  })

  it('should leave WatcherEnabled false when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.Run()
    expect(ImageReader.WatcherEnabled).to.equal(false)
  })

  it('should leave WatcherSubscription undefined when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.Run()
    expect(ImageReader.WatcherSubscription).to.equal(undefined)
  })

  it('should not schedule recurring sync when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    SynchronizeStub?.resetHistory()
    ClockFake?.tick(10_000)
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should leave Interval undefined when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.Run()
    expect(ImageReader.Interval).to.equal(undefined)
  })

  it('should call knex.destroy after sync when ONESHOT is 1', async () => {
    process.env.ONESHOT = '1'
    await ImageReader.Run()
    expect(DestroyStub?.called).to.equal(true)
  })

  it('should call knex.destroy even when Synchronize rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    SynchronizeStub?.rejects(new Error('SYNC FAILED'))
    await EventuallyRejects(ImageReader.Run())
    expect(DestroyStub?.called).to.equal(true)
  })

  it('should reject with sync error when Synchronize rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    SynchronizeStub?.rejects(new Error('SYNC FAILED'))
    const err = await EventuallyRejects(ImageReader.Run())
    expect(err.message).to.equal('SYNC FAILED')
  })

  it('should log when knex.destroy rejects in ONESHOT mode', async () => {
    process.env.ONESHOT = '1'
    DestroyStub?.rejects(new Error('POOL TEARDOWN FAILED'))
    await ImageReader.Run()
    const hasDestroyFailLog = (LoggerStub?.getCalls() ?? []).some(
      (c) => c.args[0] === 'failed to release knex pool in oneshot mode',
    )
    expect(hasDestroyFailLog).to.equal(true)
  })

  it('should not call Synchronize when ONESHOT and SKIP_SYNC are both set', async () => {
    process.env.ONESHOT = '1'
    process.env.SKIP_SYNC = '1'
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should not call knex.destroy when ONESHOT and SKIP_SYNC are both set', async () => {
    process.env.ONESHOT = '1'
    process.env.SKIP_SYNC = '1'
    await ImageReader.Run()
    expect(DestroyStub?.called).to.equal(false)
  })
})
