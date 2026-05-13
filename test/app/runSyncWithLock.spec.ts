'use sanity'

import { ImageReader, runSyncWithLock } from '#app.js'
import { eventuallyRejects } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

describe('app.ts runSyncWithLock()', () => {
  let synchronizeStub: MockInstance = vi.fn()
  let takeStub: MockInstance = vi.fn()
  let releaseStub: MockInstance = vi.fn()
  beforeEach(() => {
    synchronizeStub = vi.spyOn(ImageReader, 'synchronize').mockResolvedValue(undefined)
    takeStub = vi.spyOn(ImageReader.syncLock, 'take').mockReturnValue(true)
    releaseStub = vi.spyOn(ImageReader.syncLock, 'release')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should attempt to take the sync lock', async () => {
    await runSyncWithLock()
    expect(takeStub.mock.calls.length).toBe(1)
  })
  it('should not synchronize when lock is already held', async () => {
    takeStub.mockReturnValue(false)
    await runSyncWithLock()
    expect(synchronizeStub.mock.calls.length).toBe(0)
  })
  it('should not release lock when lock was not acquired', async () => {
    takeStub.mockReturnValue(false)
    await runSyncWithLock()
    expect(releaseStub.mock.calls.length).toBe(0)
  })
  it('should synchronize when lock is acquired', async () => {
    await runSyncWithLock()
    expect(synchronizeStub.mock.calls.length).toBe(1)
  })
  it('should take lock before synchronizing', async () => {
    let lockTakenBeforeSync = false
    synchronizeStub.mockImplementation(async () => {
      lockTakenBeforeSync = takeStub.mock.calls.length > 0
      await Promise.resolve()
    })
    await runSyncWithLock()
    expect(lockTakenBeforeSync).toBe(true)
  })
  it('should not release lock before synchronizing', async () => {
    let lockReleasedBeforeSync = false
    synchronizeStub.mockImplementation(async () => {
      lockReleasedBeforeSync = releaseStub.mock.calls.length > 0
      await Promise.resolve()
    })
    await runSyncWithLock()
    expect(lockReleasedBeforeSync).toBe(false)
  })
  it('should release lock once after synchronize resolves', async () => {
    await runSyncWithLock()
    expect(releaseStub.mock.calls.length).toBe(1)
  })
  it('should release lock after (not before) synchronize resolves', async () => {
    await runSyncWithLock()
    expect((releaseStub.mock.invocationCallOrder[0] ?? 0) > (synchronizeStub.mock.invocationCallOrder[0] ?? 0)).toBe(
      true,
    )
  })
  it('should release lock after synchronize rejects', async () => {
    synchronizeStub.mockRejectedValue(new Error('SYNC ERROR'))
    await runSyncWithLock().catch(() => null)
    expect(releaseStub.mock.calls.length).toBe(1)
  })
  it('should propagate rejection from synchronize', async () => {
    const err = new Error('SYNC ERROR')
    synchronizeStub.mockRejectedValue(err)
    const caught = await eventuallyRejects(runSyncWithLock())
    expect(caught).toBe(err)
  })
})
