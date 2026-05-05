'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { setImmediate as yieldMacro } from 'node:timers/promises'

import fsWalker from '#utils/fswalker.js'
import { EventuallyRejects } from '#testutils/Errors.js'

const sandbox = Sinon.createSandbox()

describe('utils/fswalker function fsWalker()', () => {
  let readdirSpy = sandbox.stub()
  const originalConcurrency = fsWalker.concurrency
  beforeEach(() => {
    readdirSpy = sandbox.stub(fsWalker.fn, 'readdir')
    readdirSpy.resolves([])
  })
  afterEach(() => {
    sandbox.restore()
    fsWalker.concurrency = originalConcurrency
  })
  it('should call readdir starting at root', async () => {
    await fsWalker('/foo/bar/baz', async () => {
      await Promise.resolve()
    })
    expect(readdirSpy.callCount).to.equal(1)
  })
  it('should call the item callback once for root node', async () => {
    readdirSpy.resolves([
      {
        name: 'foo.png',
        isDirectory: () => false,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should call the item callback with expected items for root node', async () => {
    readdirSpy.resolves([
      {
        name: 'foo.png',
        isDirectory: () => false,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: true,
      },
    ])
  })
  it('should call the item callback twice when folder found', async () => {
    readdirSpy.onFirstCall().resolves([
      {
        name: 'foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(2)
  })
  it('should add folder to list', async () => {
    readdirSpy.onFirstCall().resolves([
      {
        name: 'foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: false,
      },
    ])
  })
  it('should call the item callback once when filtering unexpected filetype', async () => {
    readdirSpy.resolves([
      {
        name: 'foo.txt',
        isDirectory: () => false,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should filter unexpected filetype', async () => {
    readdirSpy.resolves([
      {
        name: 'foo.txt',
        isDirectory: () => false,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.firstCall.args[0]).to.deep.equal([])
  })
  const upperCaseExtensions = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG', 'TIF', 'TIFF', 'BMP', 'JFIF', 'JPE']
  upperCaseExtensions.forEach((ext) => {
    it(`should accept uppercase .${ext} extension`, async () => {
      readdirSpy.resolves([{ name: `foo.${ext}`, isDirectory: () => false }])
      const spy = sandbox.stub().resolves()
      await fsWalker('/bar/baz', spy)
      expect(spy.firstCall.args[0]).to.deep.equal([{ path: `/foo.${ext}`, isFile: true }])
    })
  })
  const mixedCaseExtensions = ['Jpg', 'jPeG', 'Png', 'WebP', 'Gif', 'Svg', 'Tif', 'tIfF', 'Bmp', 'jFiF', 'Jpe']
  mixedCaseExtensions.forEach((ext) => {
    it(`should accept mixed-case .${ext} extension`, async () => {
      readdirSpy.resolves([{ name: `foo.${ext}`, isDirectory: () => false }])
      const spy = sandbox.stub().resolves()
      await fsWalker('/bar/baz', spy)
      expect(spy.firstCall.args[0]).to.deep.equal([{ path: `/foo.${ext}`, isFile: true }])
    })
  })
  it('should propagate rejection from eachItem callback', async () => {
    readdirSpy.resolves([{ name: 'foo.png', isDirectory: () => false }])
    const error = new Error('callback failed')
    const err = await EventuallyRejects(fsWalker('/bar/baz', sandbox.stub().rejects(error)))
    expect(err).to.equal(error)
  })
  it('should stop walking when eachItem rejects mid-walk', async () => {
    readdirSpy.onFirstCall().resolves([
      { name: 'subdir', isDirectory: () => true },
      { name: 'foo.png', isDirectory: () => false },
    ])
    readdirSpy.onSecondCall().resolves([])
    await EventuallyRejects(fsWalker('/bar/baz', sandbox.stub().rejects(new Error('stop'))))
    expect(readdirSpy.callCount).to.equal(1)
  })
  it('should call the item callback once when hidden folder present', async () => {
    readdirSpy.onFirstCall().resolves([
      {
        name: '.foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should ignore hidden folder', async () => {
    readdirSpy.onFirstCall().resolves([
      {
        name: '.foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = sandbox.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.firstCall.args[0]).to.deep.equal([])
  })
  it('should run multiple readdirs in flight once the queue has siblings', async () => {
    fsWalker.concurrency = 3
    const inFlight = { count: 0, peak: 0 }
    const release: Array<() => void> = []
    let drain = false
    const subdirs = ['a', 'b', 'c', 'd', 'e'].map((name) => ({ name, isDirectory: () => true }))
    readdirSpy.callsFake(async (path: string) => {
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
    const walk = fsWalker('/root', sandbox.stub().resolves())
    while (inFlight.count < 3) {
      // eslint-disable-next-line no-await-in-loop -- waiting for workers to saturate
      await yieldMacro()
    }
    drain = true
    while (release.length > 0) release.shift()?.()
    await walk
    expect(inFlight.peak).to.equal(3)
  })
  it('should process all nested directories when concurrency exceeds queue depth', async () => {
    fsWalker.concurrency = 4
    readdirSpy.onCall(0).resolves([
      { name: 'a', isDirectory: () => true },
      { name: 'b', isDirectory: () => true },
      { name: 'c', isDirectory: () => true },
    ])
    readdirSpy.onCall(1).resolves([])
    readdirSpy.onCall(2).resolves([])
    readdirSpy.onCall(3).resolves([])
    await fsWalker('/root', sandbox.stub().resolves())
    expect(readdirSpy.callCount).to.equal(4)
  })
})
