'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import fsWalker from '../../../utils/fswalker'

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
  it('should call each item for root node', async () => {
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
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: true,
      },
    ])
  })
  it('should call each item for root node', async () => {
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
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: true,
      },
    ])
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
    expect(spy.callCount).to.equal(2)
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: false,
      },
    ])
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
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal([])
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
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal([])
  })
})
