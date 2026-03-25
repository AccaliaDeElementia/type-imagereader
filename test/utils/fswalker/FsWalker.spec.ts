'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import fsWalker from '../../../utils/fswalker'
import { EventuallyRejects } from '../../../testutils/Errors'

describe('utils/fswalker function fsWalker()', () => {
  let readdirSpy = Sinon.stub()
  beforeEach(() => {
    readdirSpy = Sinon.stub(fsWalker.fn, 'readdir')
    readdirSpy.resolves([])
  })
  afterEach(() => {
    readdirSpy.restore()
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
    const spy = Sinon.stub()
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
    const spy = Sinon.stub()
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
    const spy = Sinon.stub()
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
    const spy = Sinon.stub()
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
    const spy = Sinon.stub()
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
    const spy = Sinon.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.firstCall.args[0]).to.deep.equal([])
  })
  const upperCaseExtensions = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG', 'TIF', 'TIFF', 'BMP', 'JFIF', 'JPE']
  upperCaseExtensions.forEach((ext) => {
    it(`should accept uppercase .${ext} extension`, async () => {
      readdirSpy.resolves([{ name: `foo.${ext}`, isDirectory: () => false }])
      const spy = Sinon.stub().resolves()
      await fsWalker('/bar/baz', spy)
      expect(spy.firstCall.args[0]).to.deep.equal([{ path: `/foo.${ext}`, isFile: true }])
    })
  })
  const mixedCaseExtensions = ['Jpg', 'jPeG', 'Png', 'WebP', 'Gif', 'Svg', 'Tif', 'tIfF', 'Bmp', 'jFiF', 'Jpe']
  mixedCaseExtensions.forEach((ext) => {
    it(`should accept mixed-case .${ext} extension`, async () => {
      readdirSpy.resolves([{ name: `foo.${ext}`, isDirectory: () => false }])
      const spy = Sinon.stub().resolves()
      await fsWalker('/bar/baz', spy)
      expect(spy.firstCall.args[0]).to.deep.equal([{ path: `/foo.${ext}`, isFile: true }])
    })
  })
  it('should propagate rejection from eachItem callback', async () => {
    readdirSpy.resolves([{ name: 'foo.png', isDirectory: () => false }])
    const error = new Error('callback failed')
    const err = await EventuallyRejects(fsWalker('/bar/baz', Sinon.stub().rejects(error)))
    expect(err).to.equal(error)
  })
  it('should stop walking when eachItem rejects mid-walk', async () => {
    readdirSpy.onFirstCall().resolves([
      { name: 'subdir', isDirectory: () => true },
      { name: 'foo.png', isDirectory: () => false },
    ])
    readdirSpy.onSecondCall().resolves([])
    await EventuallyRejects(fsWalker('/bar/baz', Sinon.stub().rejects(new Error('stop'))))
    expect(readdirSpy.callCount).to.equal(1)
  })
  it('should call the item callback once when hidden folder present', async () => {
    readdirSpy.onFirstCall().resolves([
      {
        name: '.foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = Sinon.stub()
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
    const spy = Sinon.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.firstCall.args[0]).to.deep.equal([])
  })
})
