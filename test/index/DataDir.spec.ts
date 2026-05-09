'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { eventuallyRejects } from '#testutils/Errors.js'
import { cast } from '#testutils/TypeGuards.js'
import type { Stats } from 'node:fs'
import type { Changeset, FlushCallback } from '#sync/filewatcher.js'

import { ImageReader, Imports } from '#app.js'

const sandbox = Sinon.createSandbox()

const fakeDirStats = (): Stats => cast<Stats>({ isDirectory: () => true })
const fakeFileStats = (): Stats => cast<Stats>({ isDirectory: () => false })

describe('index.ts DATA_DIR handling', (): void => {
  let StartServerStub: Sinon.SinonStub | undefined = undefined
  let SynchronizeStub: Sinon.SinonStub | undefined = undefined
  let StartWatcherStub: Sinon.SinonStub | undefined = undefined
  let LoggerStub: Sinon.SinonStub | undefined = undefined
  let StatStub: Sinon.SinonStub | undefined = undefined
  let InitializeStub: Sinon.SinonStub | undefined = undefined
  let IncrementalSyncStub: Sinon.SinonStub | undefined = undefined

  beforeEach(() => {
    delete process.env.DATA_DIR
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    delete process.env.SKIP_SERVE
    delete process.env.DISABLE_WATCHER
    delete process.env.SYNC_INTERVAL
    StartServerStub = sandbox.stub(ImageReader, 'StartServer').resolves()
    SynchronizeStub = sandbox.stub(ImageReader, 'Synchronize').resolves()
    sandbox.useFakeTimers()
    LoggerStub = sandbox.stub(Imports, 'logger')
    StartWatcherStub = sandbox.stub(Imports, 'startWatcher').resolves({ unsubscribe: sandbox.stub().resolves() })
    StatStub = sandbox.stub(Imports, 'stat').resolves(fakeDirStats())
    InitializeStub = sandbox.stub(Imports, 'initialize').resolves(cast({}))
    IncrementalSyncStub = sandbox.stub().resolves()
    sandbox.stub(Imports, 'IncrementalSyncFunctions').value({ IncrementalSync: IncrementalSyncStub })
  })

  afterEach(() => {
    sandbox.restore()
    delete process.env.DATA_DIR
    ImageReader.Interval = undefined
    ImageReader.WatcherSubscription = undefined
    ImageReader.WatcherEnabled = false
    ImageReader.SyncLock._locked = false
    ImageReader.SyncInterval = 10_800_000
  })

  it('should call stat once to validate the data directory', async () => {
    await ImageReader.Run()
    expect(StatStub?.callCount).to.equal(1)
  })

  it('should pass the default /data path to stat when DATA_DIR is unset', async () => {
    await ImageReader.Run()
    expect(StatStub?.firstCall.args[0]).to.equal('/data')
  })

  it('should pass the DATA_DIR value to stat when set', async () => {
    process.env.DATA_DIR = '/library/images'
    await ImageReader.Run()
    expect(StatStub?.firstCall.args[0]).to.equal('/library/images')
  })

  it('should log the selected data directory', async () => {
    await ImageReader.Run()
    const calls = LoggerStub?.getCalls() ?? []
    const hasDataDirLog = calls.some((c) => `${c.args[0]}`.startsWith('using data directory'))
    expect(hasDataDirLog).to.equal(true)
  })

  it('should log the resolved data directory value', async () => {
    process.env.DATA_DIR = '/library/images'
    await ImageReader.Run()
    const calls = LoggerStub?.getCalls() ?? []
    const dataDirLog = calls.find((c) => `${c.args[0]}`.startsWith('using data directory'))
    expect(dataDirLog?.args[1]).to.equal('/library/images')
  })

  it('should log the data directory before stat rejects', async () => {
    StatStub?.rejects(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.Run())
    const calls = LoggerStub?.getCalls() ?? []
    const hasDataDirLog = calls.some((c) => `${c.args[0]}`.startsWith('using data directory'))
    expect(hasDataDirLog).to.equal(true)
  })

  it('should reject when stat rejects', async () => {
    StatStub?.rejects(new Error('ENOENT'))
    const err = await eventuallyRejects(ImageReader.Run())
    expect(err.message).to.match(/DATA_DIR/v)
  })

  it('should include the data directory in the rejection message when stat rejects', async () => {
    process.env.DATA_DIR = '/missing/path'
    StatStub?.rejects(new Error('ENOENT'))
    const err = await eventuallyRejects(ImageReader.Run())
    expect(err.message).to.contain('/missing/path')
  })

  it('should not call StartServer when stat rejects', async () => {
    StatStub?.rejects(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should not call Synchronize when stat rejects', async () => {
    StatStub?.rejects(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.Run())
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should not start watcher when stat rejects', async () => {
    StatStub?.rejects(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.Run())
    expect(StartWatcherStub?.called).to.equal(false)
  })

  it('should reject when stat returns a non-directory', async () => {
    StatStub?.resolves(fakeFileStats())
    const err = await eventuallyRejects(ImageReader.Run())
    expect(err.message).to.match(/not a directory/v)
  })

  it('should include the data directory in the rejection when stat returns a non-directory', async () => {
    process.env.DATA_DIR = '/etc/passwd'
    StatStub?.resolves(fakeFileStats())
    const err = await eventuallyRejects(ImageReader.Run())
    expect(err.message).to.contain('/etc/passwd')
  })

  it('should not call StartServer when stat returns a non-directory', async () => {
    StatStub?.resolves(fakeFileStats())
    await eventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
  })

  it('should not call Synchronize when stat returns a non-directory', async () => {
    StatStub?.resolves(fakeFileStats())
    await eventuallyRejects(ImageReader.Run())
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should pass the resolved DATA_DIR to startWatcher when set', async () => {
    process.env.DATA_DIR = '/library/images'
    await ImageReader.Run()
    expect(StartWatcherStub?.firstCall.args[0]).to.equal('/library/images')
  })

  it('should pass the resolved DATA_DIR to IncrementalSync in the flush callback', async () => {
    const fakeKnex = { fake: true }
    InitializeStub?.resolves(cast(fakeKnex))
    process.env.DATA_DIR = '/library/images'
    await ImageReader.Run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.firstCall.args[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(IncrementalSyncStub?.firstCall.args[2]).to.equal('/library/images')
  })
})
