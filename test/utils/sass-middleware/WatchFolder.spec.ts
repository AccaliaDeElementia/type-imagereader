'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { Functions, Imports } from '../../../utils/sass-middleware'
import { Cast } from '../../testutils/TypeGuards'

describe('utils/sass-middleware function WatchFolder()', () => {
  let loggerStub = Sinon.stub()
  let watchStub = Sinon.stub()
  let debouncerStub = Sinon.stub()
  let compileAndCacheStub = Sinon.stub()
  beforeEach(() => {
    loggerStub = Sinon.stub(Functions, 'logger')
    watchStub = Sinon.stub(Imports, 'watch')
    watchStub.returns([])
    debouncerStub = Sinon.stub(Functions.debouncer, 'debounce')
    compileAndCacheStub = Sinon.stub(Functions, 'CompileAndCache').resolves()
  })
  afterEach(() => {
    loggerStub.restore()
    watchStub.restore()
    debouncerStub.restore()
    compileAndCacheStub.restore()
  })
  it('should log start of watching', async () => {
    await Functions.WatchFolder('/foo', '/bar')
    expect(loggerStub.calledWith('Watching /bar for stylesheets')).to.equal(true)
  })
  it('should call watch function with proper flags', async () => {
    await Functions.WatchFolder('/foo', '/bar')
    expect(watchStub.calledWith('/foo/bar', { persistent: false })).to.equal(true)
  })
  it('should log when watcher fails to init', async () => {
    const err = new Error('AAAH!')
    watchStub.throws(err)
    await Functions.WatchFolder('/foo', '/bar')
    expect(loggerStub.calledWith('Watcher for /bar exited unexpectedly', err)).to.equal(true)
  })
  it('should ignore non sass file to compile', async () => {
    watchStub.returns([{ filename: 'file.txt' }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(debouncerStub.called).to.equal(false)
  })
  it('should ignore ecent without filename', async () => {
    watchStub.returns([{ filename: null }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(debouncerStub.called).to.equal(false)
  })
  it('should ignore dotfiles to compile', async () => {
    watchStub.returns([{ filename: '.file.sass' }, { filename: '/.file.sass' }, { filename: '/quux/.bar/file.sass' }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(debouncerStub.called).to.equal(false)
  })
  it('debounce when compiling sass file', async () => {
    watchStub.returns([{ filename: 'styles.sass' }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(debouncerStub.calledWith('/bar/styles.sass')).to.equal(true)
  })
  it('log entry in debounced file', async () => {
    watchStub.returns([{ filename: 'styles.sass', eventType: 'change' }])
    await Functions.WatchFolder('/foo', '/bar')
    const fn = Cast<() => Promise<void>>(debouncerStub.lastCall.args[1])
    await fn()
    expect(loggerStub.calledWith('/bar/styles.sass needs recompiling, change')).to.equal(true)
  })
  it('compile and cache debounced file', async () => {
    watchStub.returns([{ filename: 'styles.scss', eventType: 'change' }])
    await Functions.WatchFolder('/foo', '/bar')
    const fn = Cast<() => Promise<void>>(debouncerStub.lastCall.args[1])
    await fn()
    expect(compileAndCacheStub.calledWith('/foo', '/bar/styles.scss')).to.equal(true)
  })
})
