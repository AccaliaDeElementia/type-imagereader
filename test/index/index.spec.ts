'use sanity'

import assert from 'node:assert'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import Sinon from 'sinon'
import { EventuallyRejects } from '#testutils/Errors'
import { Cast } from '#testutils/TypeGuards'
import type { Changeset, FlushCallback } from '#utils/filewatcher'

import { ImageReader, Imports } from '#app'

const sandbox = Sinon.createSandbox()

describe('/index.ts tests', (): void => {
  let StartServerStub: Sinon.SinonStub | undefined = undefined
  let SynchronizeStub: Sinon.SinonStub | undefined = undefined
  let ClockFake: Sinon.SinonFakeTimers | undefined = undefined
  let LoggerStub: Sinon.SinonStub | undefined = undefined
  let StartWatcherStub: Sinon.SinonStub | undefined = undefined
  let PersistanceStub: { initialize: Sinon.SinonStub } | undefined = undefined
  let IncrementalSyncStub: Sinon.SinonStub | undefined = undefined

  beforeEach(() => {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    delete process.env.DISABLE_WATCHER
    delete process.env.SYNC_INTERVAL
    StartServerStub = sandbox.stub(ImageReader, 'StartServer').resolves()
    SynchronizeStub = sandbox.stub(ImageReader, 'Synchronize').resolves()
    ClockFake = sandbox.useFakeTimers()
    LoggerStub = sandbox.stub(Imports, 'logger')
    StartWatcherStub = sandbox.stub(Imports, 'startWatcher').resolves({ unsubscribe: Sinon.stub().resolves() })
    PersistanceStub = { initialize: Sinon.stub().resolves({}) }
    sandbox.stub(Imports, 'persistance').value(PersistanceStub)
    IncrementalSyncStub = Sinon.stub().resolves()
    sandbox.stub(Imports, 'IncrementalSyncFunctions').value({ IncrementalSync: IncrementalSyncStub })
  })

  afterEach(() => {
    sandbox.restore()
    ImageReader.Interval = undefined
    ImageReader.WatcherSubscription = undefined
    ImageReader.WatcherEnabled = false
    ImageReader.SyncLock._locked = false
    ImageReader.SyncInterval = 10_800_000
  })

  it('should reject when StartServer throws', async () => {
    StartServerStub?.throws(new Error('FOO'))
    const err = await EventuallyRejects(ImageReader.Run())
    expect(err.message).to.equal('FOO')
  })

  it('should reject when StartServer rejects', async () => {
    StartServerStub?.rejects(new Error('FOO'))
    const err = await EventuallyRejects(ImageReader.Run())
    expect(err.message).to.equal('FOO')
  })

  it('should call StartServer when PORT is not defined', async () => {
    delete process.env.PORT
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
  })

  it('should pass default port 3030 to StartServer when PORT is not defined', async () => {
    delete process.env.PORT
    await ImageReader.Run()
    expect(StartServerStub?.firstCall.args[0]).to.equal(3030)
  })

  it('should call StartServer when PORT is blank', async () => {
    process.env.PORT = ''
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
  })

  it('should pass default port 3030 to StartServer when PORT is blank', async () => {
    process.env.PORT = ''
    await ImageReader.Run()
    expect(StartServerStub?.firstCall.args[0]).to.equal(3030)
  })

  it('should call StartServer when PORT is valid', async () => {
    process.env.PORT = '5555'
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
  })

  it('should pass specified port to StartServer when PORT is valid', async () => {
    process.env.PORT = '5555'
    await ImageReader.Run()
    expect(StartServerStub?.firstCall.args[0]).to.equal(5555)
  })

  it('should not call StartServer when PORT fails to parse', async () => {
    process.env.PORT = 'FOO'
    await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should not call Synchronize when PORT fails to parse', async () => {
    process.env.PORT = 'FOO'
    await EventuallyRejects(ImageReader.Run())
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should reject with descriptive message when PORT fails to parse', async () => {
    process.env.PORT = 'FOO'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(e.message).to.equal('Port NaN (from env: FOO) is not a number. Valid ports must be a number.')
  })

  it('should not call StartServer when PORT is too small', async () => {
    process.env.PORT = '-1'
    await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should not call Synchronize when PORT is too small', async () => {
    process.env.PORT = '-1'
    await EventuallyRejects(ImageReader.Run())
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should reject with descriptive message when PORT is too small', async () => {
    process.env.PORT = '-1'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(e.message).to.equal('Port -1 is out of range. Valid ports must be between 0 and 65535.')
  })

  it('should not call StartServer when PORT is too big', async () => {
    process.env.PORT = '131072'
    await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should not call Synchronize when PORT is too big', async () => {
    process.env.PORT = '131072'
    await EventuallyRejects(ImageReader.Run())
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should reject with descriptive message when PORT is too big', async () => {
    process.env.PORT = '131072'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(e.message).to.equal('Port 131072 is out of range. Valid ports must be between 0 and 65535.')
  })

  it('should not call StartServer when PORT is not integer', async () => {
    process.env.PORT = '3.1415926'
    await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should not call Synchronize when PORT is not integer', async () => {
    process.env.PORT = '3.1415926'
    await EventuallyRejects(ImageReader.Run())
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should reject with descriptive message when PORT is not integer', async () => {
    process.env.PORT = '3.1415926'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(e.message).to.equal('Port 3.1415926 is not integer. Valid ports must be integer between 0 and 65535.')
  })

  it('should run Synchronization if SKIP_SYNC is not set', async () => {
    delete process.env.SKIP_SYNC
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should run Synchronization if SKIP_SYNC is blank', async () => {
    process.env.SKIP_SYNC = ''
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should not run Synchronization if SKIP_SYNC is true', async () => {
    process.env.SKIP_SYNC = 'true'
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should not run Synchronization if SKIP_SYNC is 1', async () => {
    process.env.SKIP_SYNC = '1'
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should run server if SKIP_SERVE is not set', async () => {
    delete process.env.SKIP_SERVE
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
  })

  it('should run server if SKIP_SERVE is blank', async () => {
    process.env.SKIP_SERVE = ''
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
  })

  it('should not run server if SKIP_SERVE is true', async () => {
    process.env.SKIP_SERVE = 'true'
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should not run server if SKIP_SERVE is 1', async () => {
    process.env.SKIP_SERVE = '1'
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should run Synchronization again after SyncInterval miliseconds', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    SynchronizeStub?.resetHistory()
    ClockFake?.tick(99)
    expect(SynchronizeStub?.called).to.equal(false)
    ClockFake?.tick(1)
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should skip Synchronization if a previous run is still running', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    SynchronizeStub?.resetHistory()
    // eslint-disable-next-line require-atomic-updates -- intentional test-only mutation to simulate a locked sync state
    ImageReader.SyncLock._locked = true
    ClockFake?.tick(101)
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should reset sync running if Synchronization throws', async () => {
    SynchronizeStub?.throws(new Error('FOO!'))
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    expect(ImageReader.SyncLock._locked).to.equal(false)
  })

  it('should reset sync running if Synchronization rejects', async () => {
    SynchronizeStub?.rejects(new Error('FOO!'))
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    expect(ImageReader.SyncLock._locked).to.equal(false)
  })

  it('should tolerate Synchronization rejects in interval', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    SynchronizeStub?.rejects(new Error('FOO!'))
    ClockFake?.tick(105)
    await Promise.resolve()
    assert(true, 'should not throw or reject because inner promise rejects')
  })

  it('should log once when initial sync rejects', async () => {
    const err = new Error('SYNC FAILED')
    SynchronizeStub?.rejects(err)
    await ImageReader.Run()
    expect(LoggerStub?.callCount).to.equal(1)
  })

  it("should log with message 'sync error' when initial sync rejects", async () => {
    SynchronizeStub?.rejects(new Error('SYNC FAILED'))
    await ImageReader.Run()
    expect(LoggerStub?.firstCall.args[0]).to.equal('sync error')
  })

  it('should log the error object when initial sync rejects', async () => {
    const err = new Error('SYNC FAILED')
    SynchronizeStub?.rejects(err)
    await ImageReader.Run()
    expect(LoggerStub?.firstCall.args[1]).to.equal(err)
  })

  it('should not log when initial sync resolves', async () => {
    await ImageReader.Run()
    expect(LoggerStub?.callCount).to.equal(0)
  })

  it('should log once when interval sync rejects', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    SynchronizeStub?.rejects(new Error('INTERVAL SYNC FAILED'))
    await ClockFake?.tickAsync(101)
    expect(LoggerStub?.callCount).to.equal(1)
  })

  it("should log with message 'sync interval error' when interval sync rejects", async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    SynchronizeStub?.rejects(new Error('INTERVAL SYNC FAILED'))
    await ClockFake?.tickAsync(101)
    expect(LoggerStub?.firstCall.args[0]).to.equal('sync interval error')
  })

  it('should log the error object when interval sync rejects', async () => {
    const err = new Error('INTERVAL SYNC FAILED')
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    SynchronizeStub?.rejects(err)
    await ClockFake?.tickAsync(101)
    expect(LoggerStub?.firstCall.args[1]).to.equal(err)
  })

  it('should not log when interval sync resolves', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.Run()
    ClockFake?.tick(101)
    await Promise.resolve()
    expect(LoggerStub?.callCount).to.equal(0)
  })

  it('should start watcher by default', async () => {
    await ImageReader.Run()
    expect(StartWatcherStub?.called).to.equal(true)
  })

  it('should start watcher on /data', async () => {
    await ImageReader.Run()
    expect(StartWatcherStub?.firstCall.args[0]).to.equal('/data')
  })

  it('should set WatcherEnabled to true when watcher starts', async () => {
    await ImageReader.Run()
    expect(ImageReader.WatcherEnabled).to.equal(true)
  })

  it('should store watcher subscription', async () => {
    const sub = { unsubscribe: Sinon.stub().resolves() }
    StartWatcherStub?.resolves(sub)
    await ImageReader.Run()
    expect(ImageReader.WatcherSubscription).to.equal(sub)
  })

  it('should not start watcher when DISABLE_WATCHER is 1', async () => {
    process.env.DISABLE_WATCHER = '1'
    await ImageReader.Run()
    expect(StartWatcherStub?.called).to.equal(false)
  })

  it('should not start watcher when DISABLE_WATCHER is true', async () => {
    process.env.DISABLE_WATCHER = 'true'
    await ImageReader.Run()
    expect(StartWatcherStub?.called).to.equal(false)
  })

  it('should set WatcherEnabled to false when DISABLE_WATCHER is 1', async () => {
    process.env.DISABLE_WATCHER = '1'
    await ImageReader.Run()
    expect(ImageReader.WatcherEnabled).to.equal(false)
  })

  it('should not start watcher when SKIP_SYNC is 1', async () => {
    process.env.SKIP_SYNC = '1'
    await ImageReader.Run()
    expect(StartWatcherStub?.called).to.equal(false)
  })

  it('should fall back gracefully when watcher fails to start', async () => {
    StartWatcherStub?.rejects(new Error('inotify failed'))
    await ImageReader.Run()
    expect(ImageReader.WatcherEnabled).to.equal(false)
  })

  it('should log when watcher fails to start', async () => {
    StartWatcherStub?.rejects(new Error('inotify failed'))
    await ImageReader.Run()
    const hasWatcherFailLog = (LoggerStub?.getCalls() ?? []).some(
      (c) => c.args[0] === 'watcher start failed, falling back to polling only',
    )
    expect(hasWatcherFailLog).to.equal(true)
  })

  it('should default SyncInterval to 24 hours when watcher is enabled', async () => {
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(86_400_000)
  })

  it('should default SyncInterval to 3 hours when watcher is disabled', async () => {
    process.env.DISABLE_WATCHER = '1'
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(10_800_000)
  })

  it('should default SyncInterval to 3 hours when watcher fails to start', async () => {
    StartWatcherStub?.rejects(new Error('nope'))
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(10_800_000)
  })

  it('should use SYNC_INTERVAL env var when set', async () => {
    process.env.SYNC_INTERVAL = '60000'
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(60000)
  })

  it('should use SYNC_INTERVAL even when watcher is enabled', async () => {
    process.env.SYNC_INTERVAL = '60000'
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(60000)
  })

  it('should use SYNC_INTERVAL even when watcher is disabled', async () => {
    process.env.DISABLE_WATCHER = '1'
    process.env.SYNC_INTERVAL = '60000'
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(60000)
  })

  it('should ignore invalid SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = 'banana'
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(86_400_000)
  })

  it('should ignore negative SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = '-1000'
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(86_400_000)
  })

  it('should ignore zero SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = '0'
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(86_400_000)
  })

  it('should ignore empty SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = ''
    await ImageReader.Run()
    expect(ImageReader.SyncInterval).to.equal(86_400_000)
  })

  it('should acquire SyncLock when flush callback is invoked', async () => {
    await ImageReader.Run()
    const onFlush = Cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(ImageReader.SyncLock._locked).to.equal(false)
  })

  it('should call persistance.initialize in flush callback', async () => {
    await ImageReader.Run()
    const onFlush = Cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(PersistanceStub?.initialize.callCount).to.equal(1)
  })

  it('should call IncrementalSync in flush callback', async () => {
    const fakeKnex = { fake: true }
    PersistanceStub?.initialize.resolves(fakeKnex)
    await ImageReader.Run()
    const onFlush = Cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(IncrementalSyncStub?.callCount).to.equal(1)
    expect(IncrementalSyncStub?.firstCall.args[0]).to.equal(fakeKnex)
    expect(IncrementalSyncStub?.firstCall.args[1]).to.equal(changeset)
  })

  it('should release SyncLock after flush callback completes', async () => {
    await ImageReader.Run()
    const onFlush = Cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(ImageReader.SyncLock._locked).to.equal(false)
  })

  it('should release SyncLock when IncrementalSync rejects', async () => {
    IncrementalSyncStub?.rejects(new Error('incremental failed'))
    await ImageReader.Run()
    const onFlush = Cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    try {
      await onFlush(changeset)
    } catch {
      // expected
    }
    expect(ImageReader.SyncLock._locked).to.equal(false)
  })

  it('should skip flush when SyncLock is already held', async () => {
    await ImageReader.Run()
    // eslint-disable-next-line require-atomic-updates -- intentional test-only mutation to simulate a locked sync state
    ImageReader.SyncLock._locked = true
    const onFlush = Cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(IncrementalSyncStub?.callCount).to.equal(0)
  })
})
