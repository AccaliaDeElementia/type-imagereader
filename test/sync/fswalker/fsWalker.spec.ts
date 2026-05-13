'use sanity'

import { setImmediate as yieldMacro } from 'node:timers/promises'

import { fsWalker, Imports, Fswalker } from '#sync/fswalker.js'
import { eventuallyRejects } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

describe('sync/fswalker fsWalker()', () => {
  let readdirSpy: MockInstance = vi.fn()
  const originalConcurrency = Fswalker.concurrency
  beforeEach(() => {
    readdirSpy = vi.spyOn(Imports, 'readdir').mockResolvedValue([])
  })
  afterEach(() => {
    vi.restoreAllMocks()
    Fswalker.concurrency = originalConcurrency
  })
  it('should call readdir starting at root', async () => {
    await fsWalker('/foo/bar/baz', async () => {
      await Promise.resolve()
    })
    expect(readdirSpy.mock.calls.length).toBe(1)
  })
  it('should call the item callback once for root node', async () => {
    readdirSpy.mockResolvedValue([
      {
        name: 'foo.png',
        isDirectory: () => false,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls.length).toBe(1)
  })
  it('should call the item callback with expected items for root node', async () => {
    readdirSpy.mockResolvedValue([
      {
        name: 'foo.png',
        isDirectory: () => false,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls[0]?.[0]).toEqual([
      {
        path: '/foo.png',
        isFile: true,
      },
    ])
  })
  it('should call the item callback twice when folder found', async () => {
    readdirSpy.mockResolvedValueOnce([
      {
        name: 'foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls.length).toBe(2)
  })
  it('should add folder to list', async () => {
    readdirSpy.mockResolvedValueOnce([
      {
        name: 'foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls[0]?.[0]).toEqual([
      {
        path: '/foo.png',
        isFile: false,
      },
    ])
  })
  it('should call the item callback once when filtering unexpected filetype', async () => {
    readdirSpy.mockResolvedValue([
      {
        name: 'foo.txt',
        isDirectory: () => false,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls.length).toBe(1)
  })
  it('should filter unexpected filetype', async () => {
    readdirSpy.mockResolvedValue([
      {
        name: 'foo.txt',
        isDirectory: () => false,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls[0]?.[0]).toEqual([])
  })
  const upperCaseExtensions = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG', 'TIF', 'TIFF', 'BMP', 'JFIF', 'JPE']
  upperCaseExtensions.forEach((ext) => {
    it(`should accept uppercase .${ext} extension`, async () => {
      readdirSpy.mockResolvedValue([{ name: `foo.${ext}`, isDirectory: () => false }])
      const spy = vi.fn().mockResolvedValue(undefined)
      await fsWalker('/bar/baz', spy)
      expect(spy.mock.calls[0]?.[0]).toEqual([{ path: `/foo.${ext}`, isFile: true }])
    })
  })
  const mixedCaseExtensions = ['Jpg', 'jPeG', 'Png', 'WebP', 'Gif', 'Svg', 'Tif', 'tIfF', 'Bmp', 'jFiF', 'Jpe']
  mixedCaseExtensions.forEach((ext) => {
    it(`should accept mixed-case .${ext} extension`, async () => {
      readdirSpy.mockResolvedValue([{ name: `foo.${ext}`, isDirectory: () => false }])
      const spy = vi.fn().mockResolvedValue(undefined)
      await fsWalker('/bar/baz', spy)
      expect(spy.mock.calls[0]?.[0]).toEqual([{ path: `/foo.${ext}`, isFile: true }])
    })
  })
  it('should propagate rejection from eachItem callback', async () => {
    readdirSpy.mockResolvedValue([{ name: 'foo.png', isDirectory: () => false }])
    const error = new Error('callback failed')
    const err = await eventuallyRejects(fsWalker('/bar/baz', vi.fn().mockRejectedValue(error)))
    expect(err).toBe(error)
  })
  it('should stop walking when eachItem rejects mid-walk', async () => {
    readdirSpy.mockResolvedValueOnce([
      { name: 'subdir', isDirectory: () => true },
      { name: 'foo.png', isDirectory: () => false },
    ])
    readdirSpy.mockResolvedValueOnce([])
    await eventuallyRejects(fsWalker('/bar/baz', vi.fn().mockRejectedValue(new Error('stop'))))
    expect(readdirSpy.mock.calls.length).toBe(1)
  })
  it('should preserve a single error when concurrent peer workers both reject', async () => {
    readdirSpy.mockResolvedValueOnce([
      { name: 'subA', isDirectory: () => true },
      { name: 'subB', isDirectory: () => true },
    ])
    readdirSpy.mockRejectedValueOnce(new Error('errA'))
    readdirSpy.mockRejectedValueOnce(new Error('errB'))
    const err = await eventuallyRejects(fsWalker('/bar/baz', vi.fn().mockResolvedValue(undefined)))
    expect(err.message).toMatch(/^err[AB]$/v)
  })
  it('should call the item callback once when hidden folder present', async () => {
    readdirSpy.mockResolvedValueOnce([
      {
        name: '.foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls.length).toBe(1)
  })
  it('should ignore hidden folder', async () => {
    readdirSpy.mockResolvedValueOnce([
      {
        name: '.foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = vi.fn()
    spy.mockResolvedValue(undefined)
    await fsWalker('/bar/baz', spy)
    expect(spy.mock.calls[0]?.[0]).toEqual([])
  })
  it('should run multiple readdirs in flight once the queue has siblings', async () => {
    Fswalker.concurrency = 3
    const inFlight = { count: 0, peak: 0 }
    const release: Array<() => void> = []
    let drain = false
    const subdirs = ['a', 'b', 'c', 'd', 'e'].map((name) => ({ name, isDirectory: () => true }))
    readdirSpy.mockImplementation(async (path: string) => {
      if (path === '/root/') {
        return subdirs
      }
      inFlight.count += 1
      inFlight.peak = Math.max(inFlight.peak, inFlight.count)
      if (!drain) {
        const { promise, resolve } = Promise.withResolvers<undefined>()
        release.push(() => {
          resolve(undefined)
        })
        await promise
      }
      inFlight.count -= 1
      return []
    })
    const walk = fsWalker('/root', vi.fn().mockResolvedValue(undefined))
    while (inFlight.count < 3) {
      // eslint-disable-next-line no-await-in-loop -- waiting for workers to saturate
      await yieldMacro()
    }
    drain = true
    while (release.length > 0) release.shift()?.()
    await walk
    expect(inFlight.peak).toBe(3)
  })
  it('should process all nested directories when concurrency exceeds queue depth', async () => {
    Fswalker.concurrency = 4
    readdirSpy.mockResolvedValueOnce([
      { name: 'a', isDirectory: () => true },
      { name: 'b', isDirectory: () => true },
      { name: 'c', isDirectory: () => true },
    ])
    readdirSpy.mockResolvedValueOnce([])
    readdirSpy.mockResolvedValueOnce([])
    readdirSpy.mockResolvedValueOnce([])
    await fsWalker('/root', vi.fn().mockResolvedValue(undefined))
    expect(readdirSpy.mock.calls.length).toBe(4)
  })
})
