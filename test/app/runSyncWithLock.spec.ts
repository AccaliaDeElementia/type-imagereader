'use sanity'

import Sinon from 'sinon'
import { ImageReader, runSyncWithLock } from '#app.js'
import { eventuallyRejects } from '#testutils/errors.js'

const sandbox = Sinon.createSandbox()

describe('app.ts runSyncWithLock()', () => {
  let synchronizeStub = sandbox.stub()
  let takeStub = sandbox.stub()
  let releaseStub = sandbox.stub()
  beforeEach(() => {
    synchronizeStub = sandbox.stub(ImageReader, 'synchronize').resolves()
    takeStub = sandbox.stub(ImageReader.syncLock, 'take').returns(true)
    releaseStub = sandbox.stub(ImageReader.syncLock, 'release')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should attempt to take the sync lock', async () => {
    await runSyncWithLock()
    expect(takeStub.callCount).toBe(1)
  })
  it('should not synchronize when lock is already held', async () => {
    takeStub.returns(false)
    await runSyncWithLock()
    expect(synchronizeStub.callCount).toBe(0)
  })
  it('should not release lock when lock was not acquired', async () => {
    takeStub.returns(false)
    await runSyncWithLock()
    expect(releaseStub.callCount).toBe(0)
  })
  it('should synchronize when lock is acquired', async () => {
    await runSyncWithLock()
    expect(synchronizeStub.callCount).toBe(1)
  })
  it('should take lock before synchronizing', async () => {
    let lockTakenBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockTakenBeforeSync = takeStub.called
      await Promise.resolve()
    })
    await runSyncWithLock()
    expect(lockTakenBeforeSync).toBe(true)
  })
  it('should not release lock before synchronizing', async () => {
    let lockReleasedBeforeSync = false
    synchronizeStub.callsFake(async () => {
      lockReleasedBeforeSync = releaseStub.called
      await Promise.resolve()
    })
    await runSyncWithLock()
    expect(lockReleasedBeforeSync).toBe(false)
  })
  it('should release lock once after synchronize resolves', async () => {
    await runSyncWithLock()
    expect(releaseStub.callCount).toBe(1)
  })
  it('should release lock after (not before) synchronize resolves', async () => {
    await runSyncWithLock()
    expect(releaseStub.calledAfter(synchronizeStub)).toBe(true)
  })
  it('should release lock after synchronize rejects', async () => {
    synchronizeStub.rejects(new Error('SYNC ERROR'))
    await runSyncWithLock().catch(() => null)
    expect(releaseStub.callCount).toBe(1)
  })
  it('should propagate rejection from synchronize', async () => {
    const err = new Error('SYNC ERROR')
    synchronizeStub.rejects(err)
    const caught = await eventuallyRejects(runSyncWithLock())
    expect(caught).toBe(err)
  })
})
