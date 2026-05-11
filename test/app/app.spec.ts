'use sanity'

import assert from 'node:assert'
import Sinon from 'sinon'
import { eventuallyRejects } from '#testutils/errors.js'
import { cast } from '#testutils/typeGuards.js'
import type { Stats } from 'node:fs'
import type { Changeset, FlushCallback } from '#sync/filewatcher.js'

import { ImageReader, Imports } from '#app.js'

const sandbox = Sinon.createSandbox()

describe('/app.ts tests', (): void => {
  let StartServerStub: Sinon.SinonStub | undefined = undefined
  let SynchronizeStub: Sinon.SinonStub | undefined = undefined
  let ClockFake: Sinon.SinonFakeTimers | undefined = undefined
  let LoggerStub: Sinon.SinonStub | undefined = undefined
  let StartWatcherStub: Sinon.SinonStub | undefined = undefined
  let InitializeStub: Sinon.SinonStub | undefined = undefined
  let IncrementalSyncStub: Sinon.SinonStub | undefined = undefined

  beforeEach(() => {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    delete process.env.DISABLE_WATCHER
    delete process.env.SYNC_INTERVAL
    StartServerStub = sandbox.stub(ImageReader, 'startServer').resolves()
    SynchronizeStub = sandbox.stub(ImageReader, 'synchronize').resolves()
    ClockFake = sandbox.useFakeTimers()
    LoggerStub = sandbox.stub(Imports, 'logger')
    StartWatcherStub = sandbox.stub(Imports, 'startWatcher').resolves({ unsubscribe: sandbox.stub().resolves() })
    sandbox.stub(Imports, 'stat').resolves(cast<Stats>({ isDirectory: () => true }))
    InitializeStub = sandbox.stub(Imports, 'initialize').resolves(cast({}))
    IncrementalSyncStub = sandbox.stub().resolves()
    sandbox.stub(Imports, 'IncrementalSyncFunctions').value({ incrementalSync: IncrementalSyncStub })
  })

  afterEach(() => {
    sandbox.restore()
    ImageReader.interval = undefined
    ImageReader.watcherSubscription = undefined
    ImageReader.watcherEnabled = false
    ImageReader.syncLock._locked = false
    ImageReader.syncInterval = 10_800_000
  })

  it('should reject when startServer throws', async () => {
    StartServerStub?.throws(new Error('FOO'))
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toBe('FOO')
  })

  it('should reject when startServer rejects', async () => {
    StartServerStub?.rejects(new Error('FOO'))
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toBe('FOO')
  })

  const portSuccesses: Array<[string, string | undefined, number]> = [
    ['is not defined', undefined, 3030],
    ['is blank', '', 3030],
    ['is at lower boundary', '0', 0],
    ['is valid', '5555', 5555],
    ['is at upper boundary', '65535', 65535],
  ]
  portSuccesses.forEach(([cond, value, expectedPort]) => {
    describe(`when PORT ${cond}`, () => {
      beforeEach(async () => {
        if (value !== undefined) process.env.PORT = value
        await ImageReader.run()
      })
      it('should call startServer', () => {
        expect(StartServerStub?.called).toBe(true)
      })
      it('should pass expected port to startServer', () => {
        expect(StartServerStub?.firstCall.args[0]).toBe(expectedPort)
      })
    })
  })

  const portRejections: Array<[string, string, string]> = [
    ['fails to parse', 'FOO', 'Port NaN (from env: FOO) is not a number. Valid ports must be a number.'],
    ['is too small', '-1', 'Port -1 is out of range. Valid ports must be between 0 and 65535.'],
    ['is too big', '65536', 'Port 65536 is out of range. Valid ports must be between 0 and 65535.'],
    ['is far too big', '131072', 'Port 131072 is out of range. Valid ports must be between 0 and 65535.'],
    ['is not integer', '3.1415926', 'Port 3.1415926 is not integer. Valid ports must be integer between 0 and 65535.'],
  ]
  portRejections.forEach(([cond, port, expectedMessage]) => {
    describe(`when PORT ${cond}`, () => {
      let err = cast<Error>({})
      beforeEach(async () => {
        process.env.PORT = port
        err = await eventuallyRejects(ImageReader.run())
      })
      it('should not call startServer', () => {
        expect(StartServerStub?.called).toBe(false)
      })
      it('should not call synchronize', () => {
        expect(SynchronizeStub?.called).toBe(false)
      })
      it('should reject with descriptive message', () => {
        expect(err.message).toBe(expectedMessage)
      })
    })
  })

  const skipFlagCases: Array<[string, string | undefined, boolean]> = [
    ['is not set', undefined, true],
    ['is blank', '', true],
    ['is true', 'true', false],
    ['is 1', '1', false],
  ]
  skipFlagCases.forEach(([cond, value, shouldRun]) => {
    describe(`when SKIP_SYNC ${cond}`, () => {
      beforeEach(async () => {
        if (value !== undefined) process.env.SKIP_SYNC = value
        await ImageReader.run()
      })
      it(`should ${shouldRun ? '' : 'not '}run Synchronization`, () => {
        expect(SynchronizeStub?.called).toBe(shouldRun)
      })
    })
  })
  skipFlagCases.forEach(([cond, value, shouldRun]) => {
    describe(`when SKIP_SERVE ${cond}`, () => {
      beforeEach(async () => {
        if (value !== undefined) process.env.SKIP_SERVE = value
        await ImageReader.run()
      })
      it(`should ${shouldRun ? '' : 'not '}run server`, () => {
        expect(StartServerStub?.called).toBe(shouldRun)
      })
    })
  })

  it('should run Synchronization again after syncInterval milliseconds', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    SynchronizeStub?.resetHistory()
    ClockFake?.tick(99)
    expect(SynchronizeStub?.called).toBe(false)
    ClockFake?.tick(1)
    expect(SynchronizeStub?.called).toBe(true)
  })

  it('should skip Synchronization if a previous run is still running', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    SynchronizeStub?.resetHistory()
    // eslint-disable-next-line require-atomic-updates -- intentional test-only mutation to simulate a locked sync state
    ImageReader.syncLock._locked = true
    ClockFake?.tick(101)
    expect(SynchronizeStub?.called).toBe(false)
  })

  it('should reset sync running if Synchronization throws', async () => {
    SynchronizeStub?.throws(new Error('FOO!'))
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    expect(ImageReader.syncLock._locked).toBe(false)
  })

  it('should reset sync running if Synchronization rejects', async () => {
    SynchronizeStub?.rejects(new Error('FOO!'))
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    expect(ImageReader.syncLock._locked).toBe(false)
  })

  it('should tolerate Synchronization rejects in interval', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    SynchronizeStub?.rejects(new Error('FOO!'))
    ClockFake?.tick(105)
    await Promise.resolve()
    assert(true, 'should not throw or reject because inner promise rejects')
  })

  const syncLogCalls = (): Sinon.SinonSpyCall[] =>
    (LoggerStub?.getCalls() ?? []).filter((c) => c.args[0] !== 'using data directory: %s')

  it('should log once when initial sync rejects', async () => {
    const err = new Error('SYNC FAILED')
    SynchronizeStub?.rejects(err)
    await ImageReader.run()
    expect(syncLogCalls().length).toBe(1)
  })

  it("should log with message 'sync error' when initial sync rejects", async () => {
    SynchronizeStub?.rejects(new Error('SYNC FAILED'))
    await ImageReader.run()
    expect(syncLogCalls()[0]?.args[0]).toBe('sync error')
  })

  it('should log the error object when initial sync rejects', async () => {
    const err = new Error('SYNC FAILED')
    SynchronizeStub?.rejects(err)
    await ImageReader.run()
    expect(syncLogCalls()[0]?.args[1]).toBe(err)
  })

  it('should not log sync errors when initial sync resolves', async () => {
    await ImageReader.run()
    expect(syncLogCalls().length).toBe(0)
  })

  it('should log once when interval sync rejects', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    SynchronizeStub?.rejects(new Error('INTERVAL SYNC FAILED'))
    await ClockFake?.tickAsync(101)
    expect(syncLogCalls().length).toBe(1)
  })

  it("should log with message 'sync interval error' when interval sync rejects", async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    SynchronizeStub?.rejects(new Error('INTERVAL SYNC FAILED'))
    await ClockFake?.tickAsync(101)
    expect(syncLogCalls()[0]?.args[0]).toBe('sync interval error')
  })

  it('should log the error object when interval sync rejects', async () => {
    const err = new Error('INTERVAL SYNC FAILED')
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    SynchronizeStub?.rejects(err)
    await ClockFake?.tickAsync(101)
    expect(syncLogCalls()[0]?.args[1]).toBe(err)
  })

  it('should not log sync errors when interval sync resolves', async () => {
    process.env.SYNC_INTERVAL = '100'
    await ImageReader.run()
    ClockFake?.tick(101)
    await Promise.resolve()
    expect(syncLogCalls().length).toBe(0)
  })

  it('should start watcher by default', async () => {
    await ImageReader.run()
    expect(StartWatcherStub?.called).toBe(true)
  })

  it('should start watcher on /data', async () => {
    await ImageReader.run()
    expect(StartWatcherStub?.firstCall.args[0]).toBe('/data')
  })

  it('should set watcherEnabled to true when watcher starts', async () => {
    await ImageReader.run()
    expect(ImageReader.watcherEnabled).toBe(true)
  })

  it('should store watcher subscription', async () => {
    const sub = { unsubscribe: sandbox.stub().resolves() }
    StartWatcherStub?.resolves(sub)
    await ImageReader.run()
    expect(ImageReader.watcherSubscription).toBe(sub)
  })

  it('should not start watcher when DISABLE_WATCHER is 1', async () => {
    process.env.DISABLE_WATCHER = '1'
    await ImageReader.run()
    expect(StartWatcherStub?.called).toBe(false)
  })

  it('should not start watcher when DISABLE_WATCHER is true', async () => {
    process.env.DISABLE_WATCHER = 'true'
    await ImageReader.run()
    expect(StartWatcherStub?.called).toBe(false)
  })

  it('should set watcherEnabled to false when DISABLE_WATCHER is 1', async () => {
    process.env.DISABLE_WATCHER = '1'
    await ImageReader.run()
    expect(ImageReader.watcherEnabled).toBe(false)
  })

  it('should not start watcher when SKIP_SYNC is 1', async () => {
    process.env.SKIP_SYNC = '1'
    await ImageReader.run()
    expect(StartWatcherStub?.called).toBe(false)
  })

  it('should fall back gracefully when watcher fails to start', async () => {
    StartWatcherStub?.rejects(new Error('inotify failed'))
    await ImageReader.run()
    expect(ImageReader.watcherEnabled).toBe(false)
  })

  it('should log when watcher fails to start', async () => {
    StartWatcherStub?.rejects(new Error('inotify failed'))
    await ImageReader.run()
    const hasWatcherFailLog = (LoggerStub?.getCalls() ?? []).some(
      (c) => c.args[0] === 'watcher start failed, falling back to polling only',
    )
    expect(hasWatcherFailLog).toBe(true)
  })

  it('should default syncInterval to 24 hours when watcher is enabled', async () => {
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(86_400_000)
  })

  it('should default syncInterval to 3 hours when watcher is disabled', async () => {
    process.env.DISABLE_WATCHER = '1'
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(10_800_000)
  })

  it('should default syncInterval to 3 hours when watcher fails to start', async () => {
    StartWatcherStub?.rejects(new Error('nope'))
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(10_800_000)
  })

  it('should use SYNC_INTERVAL env var when set', async () => {
    process.env.SYNC_INTERVAL = '60000'
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(60000)
  })

  it('should use SYNC_INTERVAL even when watcher is enabled', async () => {
    process.env.SYNC_INTERVAL = '60000'
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(60000)
  })

  it('should use SYNC_INTERVAL even when watcher is disabled', async () => {
    process.env.DISABLE_WATCHER = '1'
    process.env.SYNC_INTERVAL = '60000'
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(60000)
  })

  it('should ignore invalid SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = 'banana'
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(86_400_000)
  })

  it('should ignore negative SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = '-1000'
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(86_400_000)
  })

  it('should ignore zero SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = '0'
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(86_400_000)
  })

  it('should ignore empty SYNC_INTERVAL', async () => {
    process.env.SYNC_INTERVAL = ''
    await ImageReader.run()
    expect(ImageReader.syncInterval).toBe(86_400_000)
  })

  it('should acquire syncLock when flush callback is invoked', async () => {
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(ImageReader.syncLock._locked).toBe(false)
  })

  it('should call initialize in flush callback', async () => {
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(InitializeStub?.callCount).toBe(1)
  })

  it('should call incrementalSync once in flush callback', async () => {
    const fakeKnex = { fake: true }
    InitializeStub?.resolves(cast(fakeKnex))
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(IncrementalSyncStub?.callCount).toBe(1)
  })

  it('should pass knex to incrementalSync in flush callback', async () => {
    const fakeKnex = { fake: true }
    InitializeStub?.resolves(cast(fakeKnex))
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(IncrementalSyncStub?.firstCall.args[0]).toBe(fakeKnex)
  })

  it('should pass changeset to incrementalSync in flush callback', async () => {
    const fakeKnex = { fake: true }
    InitializeStub?.resolves(cast(fakeKnex))
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(IncrementalSyncStub?.firstCall.args[1]).toBe(changeset)
  })

  it('should release syncLock after flush callback completes', async () => {
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(ImageReader.syncLock._locked).toBe(false)
  })

  it('should release syncLock when incrementalSync rejects', async () => {
    IncrementalSyncStub?.rejects(new Error('incremental failed'))
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    try {
      await onFlush(changeset)
    } catch {
      // expected
    }
    expect(ImageReader.syncLock._locked).toBe(false)
  })

  it('should reject with sync locked message when syncLock is held', async () => {
    await ImageReader.run()
    // eslint-disable-next-line require-atomic-updates -- intentional test-only mutation to simulate a locked sync state
    ImageReader.syncLock._locked = true
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    const err = await eventuallyRejects(onFlush(changeset))
    expect(err.message).toBe('sync locked')
  })

  it('should not call incrementalSync when syncLock is held', async () => {
    await ImageReader.run()
    // eslint-disable-next-line require-atomic-updates -- intentional test-only mutation to simulate a locked sync state
    ImageReader.syncLock._locked = true
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await eventuallyRejects(onFlush(changeset))
    expect(IncrementalSyncStub?.callCount).toBe(0)
  })
})
