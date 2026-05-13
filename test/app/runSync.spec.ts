'use sanity'

import { ImageReader, runSync, Internals, Imports } from '#app.js'
import { eventuallyFulfills } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

const fireImmediately = (fn: () => Promise<void>): number => {
  fn().catch(() => null)
  return 0
}

describe('app.ts runSync() tests', () => {
  let actuallyRunSpy = vi.fn().mockResolvedValue(undefined)
  let setIntervalFake: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  const defaultInterval = ImageReader.syncInterval
  beforeEach(() => {
    ImageReader.interval = undefined
    ImageReader.syncInterval = defaultInterval
    actuallyRunSpy = vi.spyOn(Internals, 'runSyncWithLock').mockResolvedValue(undefined)
    setIntervalFake = vi.spyOn(Imports, 'setInterval').mockReturnValue(0)
    loggerStub = vi.spyOn(Imports, 'logger')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should set interval to execute sync on schedule', async () => {
    await runSync()
    expect(setIntervalFake.mock.calls.length).toBe(1)
  })
  it('should take call ActuallyRun synchronously on initial call', async () => {
    const promise = runSync()
    const beforeWaitCallcount = actuallyRunSpy.mock.calls.length
    await promise
    expect(beforeWaitCallcount).toBe(1)
  })
  it('should resolve when ActuallyRun rejects', async () => {
    actuallyRunSpy.mockRejectedValue('foo!')
    await eventuallyFulfills(runSync())
  })
  it('should log once when the initial sync rejects', async () => {
    actuallyRunSpy.mockRejectedValue(new Error('INITIAL SYNC FAILED'))
    await runSync()
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it("should log with message 'initial sync error' when the initial sync rejects", async () => {
    actuallyRunSpy.mockRejectedValue(new Error('INITIAL SYNC FAILED'))
    await runSync()
    expect(loggerStub.mock.calls[0]?.[0]).toBe('initial sync error')
  })
  it('should log the error object when the initial sync rejects', async () => {
    const err = new Error('INITIAL SYNC FAILED')
    actuallyRunSpy.mockRejectedValue(err)
    await runSync()
    expect(loggerStub.mock.calls[0]?.[1]).toBe(err)
  })
  it('should log once when interval callback rejects', async () => {
    actuallyRunSpy.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('SYNC FAILED'))
    setIntervalFake.mockImplementation(fireImmediately)
    await runSync()
    await Promise.resolve()
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it("should log with message 'sync interval error' when interval callback rejects", async () => {
    actuallyRunSpy.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('SYNC FAILED'))
    setIntervalFake.mockImplementation(fireImmediately)
    await runSync()
    await Promise.resolve()
    expect(loggerStub.mock.calls[0]?.[0]).toBe('sync interval error')
  })
  it('should log the error object when interval callback rejects', async () => {
    const err = new Error('SYNC FAILED')
    actuallyRunSpy.mockResolvedValueOnce(undefined).mockRejectedValueOnce(err)
    setIntervalFake.mockImplementation(fireImmediately)
    await runSync()
    await Promise.resolve()
    expect(loggerStub.mock.calls[0]?.[1]).toBe(err)
  })
  it('should not log when interval callback resolves', async () => {
    setIntervalFake.mockImplementation(fireImmediately)
    await runSync()
    await Promise.resolve()
    expect(loggerStub.mock.calls.length).toBe(0)
  })
})
