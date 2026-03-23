'use sanity'

import Sinon from 'sinon'
import { ImageReader, Functions } from '../..'
import { expect } from 'chai'
import { EventuallyRejects } from '../testutils/Errors'

describe('index.ts Functions.ActuallyRunSyncForReal()', () => {
  let synchronizeStub = Sinon.stub()
  let takeStub = Sinon.stub()
  let releaseStub = Sinon.stub()
  beforeEach(() => {
    synchronizeStub = Sinon.stub(ImageReader, 'Synchronize').resolves()
    takeStub = Sinon.stub(ImageReader.SyncLock, 'Take').returns(true)
    releaseStub = Sinon.stub(ImageReader.SyncLock, 'Release')
  })
  afterEach(() => {
    synchronizeStub.restore()
    takeStub.restore()
    releaseStub.restore()
  })
  it('should attempt to take the sync lock', async () => {
    await Functions.ActuallyRunSyncForReal()
    expect(takeStub.callCount).to.equal(1)
  })
  it('should not synchronize when lock is already held', async () => {
    takeStub.returns(false)
    await Functions.ActuallyRunSyncForReal()
    expect(synchronizeStub.callCount).to.equal(0)
  })
  it('should not release lock when lock was not acquired', async () => {
    takeStub.returns(false)
    await Functions.ActuallyRunSyncForReal()
    expect(releaseStub.callCount).to.equal(0)
  })
  it('should synchronize when lock is acquired', async () => {
    await Functions.ActuallyRunSyncForReal()
    expect(synchronizeStub.callCount).to.equal(1)
  })
  it('should take lock before synchronizing', async () => {
    let lockTakenBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockTakenBeforeSync = takeStub.called
      await Promise.resolve()
    })
    await Functions.ActuallyRunSyncForReal()
    expect(lockTakenBeforeSync).to.equal(true)
  })
  it('should not release lock before synchronizing', async () => {
    let lockReleasedBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockReleasedBeforeSync = releaseStub.called
      await Promise.resolve()
    })
    await Functions.ActuallyRunSyncForReal()
    expect(lockReleasedBeforeSync).to.equal(false)
  })
  it('should release lock after synchronize resolves', async () => {
    await Functions.ActuallyRunSyncForReal()
    expect(releaseStub.callCount).to.equal(1)
    expect(releaseStub.calledAfter(synchronizeStub)).to.equal(true)
  })
  it('should release lock after synchronize rejects', async () => {
    synchronizeStub.rejects(new Error('SYNC ERROR'))
    await Functions.ActuallyRunSyncForReal().catch(() => null)
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should propagate rejection from synchronize', async () => {
    const err = new Error('SYNC ERROR')
    synchronizeStub.rejects(err)
    const caught = await EventuallyRejects(Functions.ActuallyRunSyncForReal())
    expect(caught).to.equal(err)
  })
})
