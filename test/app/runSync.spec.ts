'use sanity'

import Sinon from 'sinon'
import { ImageReader, runSync, Internals, Imports } from '#app.js'
import { eventuallyFulfills } from '#testutils/errors.js'

const sandbox = Sinon.createSandbox()

const fireImmediately = (fn: () => Promise<void>): number => {
  fn().catch(() => null)
  return 0
}

describe('app.ts runSync() tests', () => {
  let actuallyRunSpy = sandbox.stub().resolves()
  let setIntervalFake = sandbox.stub()
  let loggerStub = sandbox.stub()
  const defaultInterval = ImageReader.syncInterval
  beforeEach(() => {
    ImageReader.interval = undefined
    ImageReader.syncInterval = defaultInterval
    actuallyRunSpy = sandbox.stub(Internals, 'runSyncWithLock').resolves()
    setIntervalFake = sandbox.stub(Imports, 'setInterval').returns(0)
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should set interval to execute sync on schedule', async () => {
    await runSync()
    expect(setIntervalFake.callCount).toBe(1)
  })
  it('should take call ActuallyRun synchronously on initial call', async () => {
    const promise = runSync()
    const beforeWaitCallcount = actuallyRunSpy.callCount
    await promise
    expect(beforeWaitCallcount).toBe(1)
  })
  it('should resolve when ActuallyRun rejects', async () => {
    actuallyRunSpy.rejects('foo!')
    await eventuallyFulfills(runSync())
  })
  it('should log once when the initial sync rejects', async () => {
    actuallyRunSpy.rejects(new Error('INITIAL SYNC FAILED'))
    await runSync()
    expect(loggerStub.callCount).toBe(1)
  })
  it("should log with message 'initial sync error' when the initial sync rejects", async () => {
    actuallyRunSpy.rejects(new Error('INITIAL SYNC FAILED'))
    await runSync()
    expect(loggerStub.firstCall.args[0]).toBe('initial sync error')
  })
  it('should log the error object when the initial sync rejects', async () => {
    const err = new Error('INITIAL SYNC FAILED')
    actuallyRunSpy.rejects(err)
    await runSync()
    expect(loggerStub.firstCall.args[1]).toBe(err)
  })
  it('should log once when interval callback rejects', async () => {
    actuallyRunSpy.resolves()
    setIntervalFake.callsFake(fireImmediately)
    actuallyRunSpy.onSecondCall().rejects(new Error('SYNC FAILED'))
    await runSync()
    await Promise.resolve()
    expect(loggerStub.callCount).toBe(1)
  })
  it("should log with message 'sync interval error' when interval callback rejects", async () => {
    actuallyRunSpy.resolves()
    setIntervalFake.callsFake(fireImmediately)
    actuallyRunSpy.onSecondCall().rejects(new Error('SYNC FAILED'))
    await runSync()
    await Promise.resolve()
    expect(loggerStub.firstCall.args[0]).toBe('sync interval error')
  })
  it('should log the error object when interval callback rejects', async () => {
    const err = new Error('SYNC FAILED')
    actuallyRunSpy.resolves()
    setIntervalFake.callsFake(fireImmediately)
    actuallyRunSpy.onSecondCall().rejects(err)
    await runSync()
    await Promise.resolve()
    expect(loggerStub.firstCall.args[1]).toBe(err)
  })
  it('should not log when interval callback resolves', async () => {
    setIntervalFake.callsFake(fireImmediately)
    await runSync()
    await Promise.resolve()
    expect(loggerStub.callCount).toBe(0)
  })
})
