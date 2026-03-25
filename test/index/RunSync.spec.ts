'use sanity'

import Sinon from 'sinon'
import { ImageReader, RunSync, Functions, Imports } from '../..'
import { expect } from 'chai'
import { EventuallyFullfills } from '../../testutils/Errors'

const sandbox = Sinon.createSandbox()

const fireImmediately = (fn: () => Promise<void>): number => {
  fn().catch(() => null)
  return 0
}

describe('index.ts RunSync() tests', () => {
  let actuallyRunSpy = Sinon.stub().resolves()
  let setIntervalFake = Sinon.stub()
  let loggerStub = Sinon.stub()
  const defaultInterval = ImageReader.SyncInterval
  beforeEach(() => {
    ImageReader.Interval = undefined
    ImageReader.SyncInterval = defaultInterval
    actuallyRunSpy = sandbox.stub(Functions, 'ActuallyRunSyncForReal').resolves()
    setIntervalFake = sandbox.stub(Functions, 'setInterval').returns(0)
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should set interval to execute sync on schedule', async () => {
    await RunSync()
    expect(setIntervalFake.callCount).to.equal(1)
  })
  it('should take call ActuallyRun synchronously on initial call', async () => {
    const promise = RunSync()
    const beforeWaitCallcount = actuallyRunSpy.callCount
    await promise
    expect(beforeWaitCallcount).to.equal(1)
  })
  it('should resolve when ActuallyRun rejects', async () => {
    actuallyRunSpy.rejects('foo!')
    await EventuallyFullfills(RunSync())
  })
  it('should log once when interval callback rejects', async () => {
    actuallyRunSpy.resolves()
    setIntervalFake.callsFake(fireImmediately)
    actuallyRunSpy.onSecondCall().rejects(new Error('SYNC FAILED'))
    await RunSync()
    await Promise.resolve()
    expect(loggerStub.callCount).to.equal(1)
  })
  it("should log with message 'sync interval error' when interval callback rejects", async () => {
    actuallyRunSpy.resolves()
    setIntervalFake.callsFake(fireImmediately)
    actuallyRunSpy.onSecondCall().rejects(new Error('SYNC FAILED'))
    await RunSync()
    await Promise.resolve()
    expect(loggerStub.firstCall.args[0]).to.equal('sync interval error')
  })
  it('should log the error object when interval callback rejects', async () => {
    const err = new Error('SYNC FAILED')
    actuallyRunSpy.resolves()
    setIntervalFake.callsFake(fireImmediately)
    actuallyRunSpy.onSecondCall().rejects(err)
    await RunSync()
    await Promise.resolve()
    expect(loggerStub.firstCall.args[1]).to.equal(err)
  })
  it('should not log when interval callback resolves', async () => {
    setIntervalFake.callsFake(fireImmediately)
    await RunSync()
    await Promise.resolve()
    expect(loggerStub.callCount).to.equal(0)
  })
})
