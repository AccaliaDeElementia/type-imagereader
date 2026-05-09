'use sanity'

import Sinon from 'sinon'
import { ImageReader, RunSyncWithLock } from '#app.js'
import { expect } from 'chai'
import { eventuallyRejects } from '#testutils/Errors.js'

const sandbox = Sinon.createSandbox()

describe('index.ts RunSyncWithLock()', () => {
  let synchronizeStub = sandbox.stub()
  let takeStub = sandbox.stub()
  let releaseStub = sandbox.stub()
  beforeEach(() => {
    synchronizeStub = sandbox.stub(ImageReader, 'Synchronize').resolves()
    takeStub = sandbox.stub(ImageReader.SyncLock, 'take').returns(true)
    releaseStub = sandbox.stub(ImageReader.SyncLock, 'release')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should attempt to take the sync lock', async () => {
    await RunSyncWithLock()
    expect(takeStub.callCount).to.equal(1)
  })
  it('should not synchronize when lock is already held', async () => {
    takeStub.returns(false)
    await RunSyncWithLock()
    expect(synchronizeStub.callCount).to.equal(0)
  })
  it('should not release lock when lock was not acquired', async () => {
    takeStub.returns(false)
    await RunSyncWithLock()
    expect(releaseStub.callCount).to.equal(0)
  })
  it('should synchronize when lock is acquired', async () => {
    await RunSyncWithLock()
    expect(synchronizeStub.callCount).to.equal(1)
  })
  it('should take lock before synchronizing', async () => {
    let lockTakenBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockTakenBeforeSync = takeStub.called
      await Promise.resolve()
    })
    await RunSyncWithLock()
    expect(lockTakenBeforeSync).to.equal(true)
  })
  it('should not release lock before synchronizing', async () => {
    let lockReleasedBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockReleasedBeforeSync = releaseStub.called
      await Promise.resolve()
    })
    await RunSyncWithLock()
    expect(lockReleasedBeforeSync).to.equal(false)
  })
  it('should release lock once after synchronize resolves', async () => {
    await RunSyncWithLock()
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should release lock after (not before) synchronize resolves', async () => {
    await RunSyncWithLock()
    expect(releaseStub.calledAfter(synchronizeStub)).to.equal(true)
  })
  it('should release lock after synchronize rejects', async () => {
    synchronizeStub.rejects(new Error('SYNC ERROR'))
    await RunSyncWithLock().catch(() => null)
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should propagate rejection from synchronize', async () => {
    const err = new Error('SYNC ERROR')
    synchronizeStub.rejects(err)
    const caught = await eventuallyRejects(RunSyncWithLock())
    expect(caught).to.equal(err)
  })
})
