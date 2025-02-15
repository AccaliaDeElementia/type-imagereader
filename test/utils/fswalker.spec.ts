'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import fsWalker from '../../utils/fswalker'

@suite
export class fsWalkerTests {
  readdirSpy: sinon.SinonStub = sinon.stub()
  before(): void {
    this.readdirSpy = sinon.stub(fsWalker.fn, 'readdir')
    this.readdirSpy.resolves([])
  }

  after(): void {
    this.readdirSpy.restore()
  }

  @test
  async 'it should call readdir starting at root'(): Promise<void> {
    await fsWalker('/foo/bar/baz', async () => {
      await Promise.resolve()
    })
    expect(this.readdirSpy.callCount).to.equal(1)
  }

  @test
  async 'it call each item for root node'(): Promise<void> {
    this.readdirSpy.resolves([
      {
        name: 'foo.png',
        isDirectory: () => false,
      },
    ])
    const spy = sinon.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: true,
      },
    ])
  }

  @test
  async 'it should call each item for root node'(): Promise<void> {
    this.readdirSpy.resolves([
      {
        name: 'foo.png',
        isDirectory: () => false,
      },
    ])
    const spy = sinon.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: true,
      },
    ])
  }

  @test
  async 'it should add folder to list'(): Promise<void> {
    this.readdirSpy.onFirstCall().resolves([
      {
        name: 'foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = sinon.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(2)
    expect(spy.firstCall.args[0]).to.deep.equal([
      {
        path: '/foo.png',
        isFile: false,
      },
    ])
  }

  @test
  async 'it should filter unexpected filetype'(): Promise<void> {
    this.readdirSpy.resolves([
      {
        name: 'foo.txt',
        isDirectory: () => false,
      },
    ])
    const spy = sinon.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal([])
  }

  @test
  async 'it should ignore hidden folder'(): Promise<void> {
    this.readdirSpy.onFirstCall().resolves([
      {
        name: '.foo.png',
        isDirectory: () => true,
      },
    ])
    const spy = sinon.stub()
    spy.resolves()
    await fsWalker('/bar/baz', spy)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal([])
  }
}
