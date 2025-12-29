'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/browserify-middleware'
import Sinon from 'sinon'

import { Cast } from '../../testutils/TypeGuards'
class ErrorWithCode extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}
describe('utils/browserify-middleware function WatchFolder()', () => {
  let loggerStub = Sinon.stub()
  let watchStub = Sinon.stub()
  let debounceStub = Sinon.stub()
  let compileAndCacheStub = Sinon.stub()

  beforeEach(() => {
    loggerStub = Sinon.stub(Functions, 'logger')
    watchStub = Sinon.stub(Imports, 'watch')
    watchStub.returns([])
    debounceStub = Sinon.stub(Functions.debouncer, 'debounce')
    compileAndCacheStub = Sinon.stub(Functions, 'CompileAndCache').resolves()
    Functions.browserified = {}
  })
  afterEach(() => {
    compileAndCacheStub.restore()
    debounceStub.restore()
    watchStub.restore()
    loggerStub.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should watch for changes', async () => {
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(watchStub.calledWith('/foo/bar', { persistent: false })).to.equal(true)
  })
  it('should log watch starting', async () => {
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(loggerStub.calledWith('Watching /bar for Scripts')).to.equal(true)
  })
  it('should log error on MODULE_NOT_FOUND', async () => {
    watchStub.throws(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(loggerStub.calledWith('/bar does not exist to watch')).to.equal(true)
  })
  it('should log error on MODULE_NOT_FOUND in iterate', async () => {
    const err = Promise.reject(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    watchStub.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(loggerStub.calledWith('/bar does not exist to watch')).to.equal(true)
  })
  it('should log error on ENOENT', async () => {
    watchStub.throws(new ErrorWithCode('OOPS', 'ENOENT'))
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(loggerStub.calledWith('/bar does not exist to watch')).to.equal(true)
  })
  it('should log error on ENOENT in iterate', async () => {
    const err = Promise.reject(new ErrorWithCode('OOPS', 'ENOENT'))
    watchStub.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(loggerStub.calledWith('/bar does not exist to watch')).to.equal(true)
  })
  it('should log error on exception', async () => {
    watchStub.throws('SOMETHING BAD')
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(loggerStub.calledWith('Watcher for /bar exited unexpectedly')).to.equal(true)
  })
  it('should log error on exception in iterate', async () => {
    const err = Promise.reject(new Error('SOMETHING BAD'))
    watchStub.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(loggerStub.calledWith('Watcher for /bar exited unexpectedly')).to.equal(true)
  })
  it('should ignore event without filename', async () => {
    watchStub.returns([
      {
        filename: null,
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(debounceStub.callCount).to.equal(0)
  })
  it('should debounce non folder event on iteration', async () => {
    watchStub.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(debounceStub.calledWith('/bar/baz')).to.equal(true)
  })
  it('should debounce folder event on iteration', async () => {
    watchStub.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', true)
    expect(debounceStub.calledWith('/bar')).to.equal(true)
  })
  it('should compile scripts for non folder event on iteration', async () => {
    watchStub.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', false)
    const fn = Cast(debounceStub.lastCall.args[1], (o: unknown): o is () => Promise<void> => typeof o === 'function')
    await fn()
    expect(compileAndCacheStub.calledWith('/foo', '/bar/baz')).to.equal(true)
  })
  it('should compile scripts for folder event on iteration', async () => {
    watchStub.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', true)
    const fn = Cast(debounceStub.lastCall.args[1], (o: unknown): o is () => Promise<void> => typeof o === 'function')
    await fn()
    expect(compileAndCacheStub.calledWith('/foo', '/bar')).to.equal(true)
  })
})
