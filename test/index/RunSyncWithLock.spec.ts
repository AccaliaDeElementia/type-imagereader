'use sanity'

import Sinon from 'sinon'
import { ImageReader, Functions } from '#app'
import { expect } from 'chai'
import { EventuallyRejects } from '#testutils/Errors'

const sandbox = Sinon.createSandbox()

describe('index.ts Functions.RunSyncWithLock()', () => {
  let synchronizeStub = sandbox.stub()
  let takeStub = sandbox.stub()
  let releaseStub = sandbox.stub()
  beforeEach(() => {
    synchronizeStub = sandbox.stub(ImageReader, 'Synchronize').resolves()
    takeStub = sandbox.stub(ImageReader.SyncLock, 'Take').returns(true)
    releaseStub = sandbox.stub(ImageReader.SyncLock, 'Release')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should attempt to take the sync lock', async () => {
    await Functions.RunSyncWithLock()
    expect(takeStub.callCount).to.equal(1)
  })
  it('should not synchronize when lock is already held', async () => {
    takeStub.returns(false)
    await Functions.RunSyncWithLock()
    expect(synchronizeStub.callCount).to.equal(0)
  })
  it('should not release lock when lock was not acquired', async () => {
    takeStub.returns(false)
    await Functions.RunSyncWithLock()
    expect(releaseStub.callCount).to.equal(0)
  })
  it('should synchronize when lock is acquired', async () => {
    await Functions.RunSyncWithLock()
    expect(synchronizeStub.callCount).to.equal(1)
  })
  it('should take lock before synchronizing', async () => {
    let lockTakenBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockTakenBeforeSync = takeStub.called
      await Promise.resolve()
    })
    await Functions.RunSyncWithLock()
    expect(lockTakenBeforeSync).to.equal(true)
  })
  it('should not release lock before synchronizing', async () => {
    let lockReleasedBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockReleasedBeforeSync = releaseStub.called
      await Promise.resolve()
    })
    await Functions.RunSyncWithLock()
    expect(lockReleasedBeforeSync).to.equal(false)
  })
  it('should release lock once after synchronize resolves', async () => {
    await Functions.RunSyncWithLock()
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should release lock after (not before) synchronize resolves', async () => {
    await Functions.RunSyncWithLock()
    expect(releaseStub.calledAfter(synchronizeStub)).to.equal(true)
  })
  it('should release lock after synchronize rejects', async () => {
    synchronizeStub.rejects(new Error('SYNC ERROR'))
    await Functions.RunSyncWithLock().catch(() => null)
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should propagate rejection from synchronize', async () => {
    const err = new Error('SYNC ERROR')
    synchronizeStub.rejects(err)
    const caught = await EventuallyRejects(Functions.RunSyncWithLock())
    expect(caught).to.equal(err)
  })
})
