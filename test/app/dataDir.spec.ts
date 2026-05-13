'use sanity'

import { eventuallyRejects } from '#testutils/errors.js'
import { cast } from '#testutils/typeGuards.js'
import type { Stats } from 'node:fs'
import type { Changeset, FlushCallback } from '#sync/filewatcher.js'

import { ImageReader, Imports } from '#app.js'
import type { MockInstance } from 'vitest'

const fakeDirStats = (): Stats => cast<Stats>({ isDirectory: () => true })
const fakeFileStats = (): Stats => cast<Stats>({ isDirectory: () => false })

describe('app.ts DATA_DIR handling', (): void => {
  let StartServerStub: MockInstance | undefined = undefined
  let SynchronizeStub: MockInstance | undefined = undefined
  let StartWatcherStub: MockInstance | undefined = undefined
  let LoggerStub: MockInstance | undefined = undefined
  let StatStub: MockInstance | undefined = undefined
  let InitializeStub: MockInstance | undefined = undefined
  let IncrementalSyncStub: MockInstance | undefined = undefined

  beforeEach(() => {
    delete process.env.DATA_DIR
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    delete process.env.SKIP_SERVE
    delete process.env.DISABLE_WATCHER
    delete process.env.SYNC_INTERVAL
    StartServerStub = vi.spyOn(ImageReader, 'startServer').mockResolvedValue(cast(undefined))
    SynchronizeStub = vi.spyOn(ImageReader, 'synchronize').mockResolvedValue(undefined)
    vi.useFakeTimers()
    LoggerStub = vi.spyOn(Imports, 'logger')
    StartWatcherStub = vi
      .spyOn(Imports, 'startWatcher')
      .mockResolvedValue({ unsubscribe: vi.fn().mockResolvedValue(undefined) })
    StatStub = vi.spyOn(Imports, 'stat').mockResolvedValue(fakeDirStats())
    InitializeStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(cast({}))
    IncrementalSyncStub = vi.spyOn(Imports.IncrementalSyncFunctions, 'incrementalSync').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete process.env.DATA_DIR
    ImageReader.interval = undefined
    ImageReader.watcherSubscription = undefined
    ImageReader.watcherEnabled = false
    ImageReader.syncLock._locked = false
    ImageReader.syncInterval = 10_800_000
  })

  it('should call stat once to validate the data directory', async () => {
    await ImageReader.run()
    expect(StatStub?.mock.calls.length).toBe(1)
  })

  it('should pass the default /data path to stat when DATA_DIR is unset', async () => {
    await ImageReader.run()
    expect(StatStub?.mock.calls[0]?.[0]).toBe('/data')
  })

  it('should pass the DATA_DIR value to stat when set', async () => {
    process.env.DATA_DIR = '/library/images'
    await ImageReader.run()
    expect(StatStub?.mock.calls[0]?.[0]).toBe('/library/images')
  })

  it('should log the selected data directory', async () => {
    await ImageReader.run()
    const calls = LoggerStub?.mock.calls ?? []
    const hasDataDirLog = calls.some((c) => `${c[0]}`.startsWith('using data directory'))
    expect(hasDataDirLog).toBe(true)
  })

  it('should log the resolved data directory value', async () => {
    process.env.DATA_DIR = '/library/images'
    await ImageReader.run()
    const calls = LoggerStub?.mock.calls ?? []
    const dataDirLog = calls.find((c) => `${c[0]}`.startsWith('using data directory'))
    expect(dataDirLog?.[1]).toBe('/library/images')
  })

  it('should log the data directory before stat rejects', async () => {
    StatStub?.mockRejectedValue(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.run())
    const calls = LoggerStub?.mock.calls ?? []
    const hasDataDirLog = calls.some((c) => `${c[0]}`.startsWith('using data directory'))
    expect(hasDataDirLog).toBe(true)
  })

  it('should reject when stat rejects', async () => {
    StatStub?.mockRejectedValue(new Error('ENOENT'))
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toMatch(/DATA_DIR/v)
  })

  it('should include the data directory in the rejection message when stat rejects', async () => {
    process.env.DATA_DIR = '/missing/path'
    StatStub?.mockRejectedValue(new Error('ENOENT'))
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toContain('/missing/path')
  })

  it('should not call startServer when stat rejects', async () => {
    StatStub?.mockRejectedValue(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.run())
    expect(StartServerStub).not.toHaveBeenCalled()
  })

  it('should not call synchronize when stat rejects', async () => {
    StatStub?.mockRejectedValue(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.run())
    expect(SynchronizeStub).not.toHaveBeenCalled()
  })

  it('should not start watcher when stat rejects', async () => {
    StatStub?.mockRejectedValue(new Error('ENOENT'))
    await eventuallyRejects(ImageReader.run())
    expect(StartWatcherStub).not.toHaveBeenCalled()
  })

  it('should reject when stat returns a non-directory', async () => {
    StatStub?.mockResolvedValue(fakeFileStats())
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toMatch(/not a directory/v)
  })

  it('should include the data directory in the rejection when stat returns a non-directory', async () => {
    process.env.DATA_DIR = '/etc/passwd'
    StatStub?.mockResolvedValue(fakeFileStats())
    const err = await eventuallyRejects(ImageReader.run())
    expect(err.message).toContain('/etc/passwd')
  })

  it('should not call startServer when stat returns a non-directory', async () => {
    StatStub?.mockResolvedValue(fakeFileStats())
    await eventuallyRejects(ImageReader.run())
    expect(StartServerStub).not.toHaveBeenCalled()
  })

  it('should not call synchronize when stat returns a non-directory', async () => {
    StatStub?.mockResolvedValue(fakeFileStats())
    await eventuallyRejects(ImageReader.run())
    expect(SynchronizeStub).not.toHaveBeenCalled()
  })

  it('should pass the resolved DATA_DIR to startWatcher when set', async () => {
    process.env.DATA_DIR = '/library/images'
    await ImageReader.run()
    expect(StartWatcherStub?.mock.calls[0]?.[0]).toBe('/library/images')
  })

  it('should pass the resolved DATA_DIR to incrementalSync in the flush callback', async () => {
    const fakeKnex = { fake: true }
    InitializeStub?.mockResolvedValue(cast(fakeKnex))
    process.env.DATA_DIR = '/library/images'
    await ImageReader.run()
    const onFlush = cast<FlushCallback>(StartWatcherStub?.mock.calls[0]?.[1])
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await onFlush(changeset)
    expect(IncrementalSyncStub?.mock.calls[0]?.[2]).toBe('/library/images')
  })
})
