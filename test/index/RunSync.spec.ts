'use sanity'

import Sinon from 'sinon'
import { ImageReader, RunSync, Functions } from '../..'
import { expect } from 'chai'
import { EventuallyFullfills } from '../testutils/Errors'

describe('index.ts RunSync() tests', () => {
  let actuallyRunSpy = Sinon.stub().resolves()
  let setIntervalFake = Sinon.stub()
  const defaultInterval = ImageReader.SyncInterval
  beforeEach(() => {
    ImageReader.Interval = undefined
    ImageReader.SyncInterval = defaultInterval
    actuallyRunSpy = Sinon.stub(Functions, 'ActuallyRunSyncForReal').resolves()
    setIntervalFake = Sinon.stub(Functions, 'setInterval').returns(0)
  })
  afterEach(() => {
    setIntervalFake.restore()
    actuallyRunSpy.restore()
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
  it('should ')
})
