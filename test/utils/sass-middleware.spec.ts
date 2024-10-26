'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import sassMiddleware, { Imports, Functions } from '../../utils/sass-middleware'

@suite
export class SassMiddlewareCompileCssTests {
  CompileAsyncStub?: Sinon.SinonStub
  LoggingStub?: Sinon.SinonStub

  before () {
    this.CompileAsyncStub = sinon.stub(Imports.sass, 'compileAsync').resolves({
      css: '',
      loadedUrls: []
    })
    this.LoggingStub = sinon.stub(Functions, 'logger')
  }

  after () {
    this.CompileAsyncStub?.restore()
    this.LoggingStub?.restore()
  }

  @test
  async 'it should log start of processing' () {
    await Functions.CompileCss('/foo', '/bar.css')
    expect(this.LoggingStub?.calledWith('Begin compiling /bar.css')).to.equal(true)
  }

  @test
  async 'it should compile using sass' () {
    await Functions.CompileCss('/foo', '/bar.css')
    expect(this.CompileAsyncStub?.calledWith('/foo/bar.css', {
      style: 'compressed',
      sourceMap: true
    })).to.equal(true)
  }

  @test
  async 'it should log completion of processing' () {
    await Functions.CompileCss('/foo', '/bar.css')
    expect(this.LoggingStub?.calledWith('/bar.css compiled successfully')).to.equal(true)
  }

  @test
  async 'it should return the compiled css' () {
    this.CompileAsyncStub?.resolves({
      css: 'THIS IS MY CSS',
      loadedUrls: []
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.css).to.equal('THIS IS MY CSS')
  }

  @test
  async 'it should return the sourceMap with default version' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: []
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.version).to.equal(0)
  }

  @test
  async 'it should return the sourceMap with calculated version' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        version: '42'
      }
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.version).to.equal(42)
  }

  @test
  async 'it should return the sourceMap with NaN for invalid version' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        version: 'qq'
      }
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(isNaN(result.map.version)).to.equal(true)
  }

  @test
  async 'it should return the sourceMap with filename' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {}
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.file).to.equal('/bar.css')
  }

  @test
  async 'it should return the sourceMap with default names array' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {}
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.names).to.deep.equal([])
  }

  @test
  async 'it should return the sourceMap with sourceMap Names' () {
    const names = ['foo', 'bar', 'baz']
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        names
      }
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.names).to.equal(names)
  }

  @test
  async 'it should return the sourceMap with default sources array' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {}
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.sources).to.deep.equal([])
  }

  @test
  async 'it should return the sourceMap with sources array' () {
    const sources = ['foo', 'bar', 'baz']
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        sources
      }
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.sources).to.equal(sources)
  }

  @test
  async 'it should return the sourceMap with default mappings' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {}
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.mappings).to.equal('')
  }

  @test
  async 'it should return the sourceMap with mappings' () {
    this.CompileAsyncStub?.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        mappings: 'SOME MAPPINGS'
      }
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.mappings).to.equal('SOME MAPPINGS')
  }

  @test
  async 'it should log error message when non Error is thrown' () {
    this.CompileAsyncStub?.rejects('SOMETHING BAD')
    await (Functions.CompileCss('/foo', '/bar.css').catch(() => 0))
    expect(this.LoggingStub?.calledWith('Error Compiling /bar.css: SOMETHING BAD')).to.equal(true)
  }

  @test
  async 'it should log error message when Error is thrown' () {
    this.CompileAsyncStub?.rejects(new Error('SOMETHING BAD'))
    await (Functions.CompileCss('/foo', '/bar.css').catch(() => 0))
    expect(this.LoggingStub?.calledWith('Error Compiling /bar.css: Error: SOMETHING BAD')).to.equal(true)
  }

  @test
  async 'it should rethrow error when non Error is thrown' () {
    this.CompileAsyncStub?.rejects('SOMETHING BAD')
    await (Functions.CompileCss('/foo', '/bar.css')
      .then(() => expect.fail('Test should have rejected the promise'),
        (err) => expect(`${err}`).to.equal('SOMETHING BAD')))
  }

  @test
  async 'it should rethrow error when Error is thrown' () {
    const expected = new Error('SOMETHING BAD')
    this.CompileAsyncStub?.rejects(expected)
    await (Functions.CompileCss('/foo', '/bar.css')
      .then(() => expect.fail('Test should have rejected the promise'),
        (err) => expect(err).to.equal(expected)))
  }
}

@suite
export class SassMiddlewareCompileAndCacheTests {
  CompileCssStub?: Sinon.SinonStub
  AccessStub?: Sinon.SinonStub

  before () {
    Functions.cache = {}
    this.CompileCssStub = sinon.stub(Functions, 'CompileCss').resolves(undefined)
    this.AccessStub = sinon.stub(Imports, 'access').resolves()
  }

  after () {
    this.CompileCssStub?.restore()
    this.AccessStub?.restore()
  }

  @test
  async 'it should test access to full path' () {
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(this.AccessStub?.calledWith('/foo/bar.scss')).to.equal(true)
  }

  @test
  async 'it should return true on success' () {
    const result = await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(result).to.equal(true)
  }

  @test
  async 'it should place cache entry on success' () {
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(Functions.cache['/bar.css']).to.not.equal(undefined)
  }

  @test
  async 'it should create compiled cache entry when compile succeeds' () {
    const expected = {}
    this.CompileCssStub?.resolves(expected)
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(await Functions.cache['/bar.css']).to.equal(expected)
  }

  @test
  async 'it should create compiled cache entry when compile fails' () {
    this.CompileCssStub?.rejects()
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(await Functions.cache['/bar.css']).to.equal(null)
  }

  @test
  async 'it should return false when access test fails' () {
    this.AccessStub?.rejects()
    const result = await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(result).to.equal(false)
  }

  @test
  async 'it should not try to compile when access test fails' () {
    this.AccessStub?.rejects()
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(this.CompileCssStub?.called).to.equal(false)
  }

  @test
  async 'it should not place a cache entry when access test fails' () {
    this.AccessStub?.rejects()
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(Functions.cache['/bar.css']).to.equal(undefined)
  }
}

@suite
export class SassMiddlewareCompileFolderTests {
  ReaddirStub?: Sinon.SinonStub
  CompileAndCacheStub?: Sinon.SinonStub

  before () {
    this.ReaddirStub = sinon.stub(Imports, 'readdir').resolves([])
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache').resolves(undefined)
  }

  after () {
    this.ReaddirStub?.restore()
    this.CompileAndCacheStub?.restore()
  }

  @test
  async 'it should handle empty directory gracefully' () {
    await Functions.CompileFolder('/foo', '/bar')
    expect(this.CompileAndCacheStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore non saas file' () {
    this.ReaddirStub?.resolves([{ name: 'styles.css' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(this.CompileAndCacheStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore dotfiles' () {
    this.ReaddirStub?.resolves([{ name: '.styles.scss' }, { name: '/.styles.scss' }, { name: '/.baz/styles.scss' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(this.CompileAndCacheStub?.called).to.equal(false)
  }

  @test
  async 'it should compile sass files' () {
    this.ReaddirStub?.resolves([{ name: 'styles.sass' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/styles.sass')).to.equal(true)
  }

  @test
  async 'it should compile scss files' () {
    this.ReaddirStub?.resolves([{ name: 'styles.scss' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/styles.scss')).to.equal(true)
  }

  @test
  async 'it should tolerate CompileAndCache rejecting' () {
    const awaiter = new Promise<boolean>(resolve => resolve(true))
    this.CompileAndCacheStub?.callsFake(() => awaiter.then(() => Promise.reject(new ErrorEvent('FOO'))))
    this.ReaddirStub?.resolves([{ name: 'styles.scss' }, { name: 'styles2.scss' }])
    await Functions.CompileFolder('/foo', '/bar')
    await awaiter
    expect(this.CompileAndCacheStub?.callCount).to.equal(2)
  }
}

@suite
export class SassMiddlewareWatchFolderTests {
  LoggerStub?: Sinon.SinonStub
  WatchStub?: Sinon.SinonStub
  DebouncerStub?: Sinon.SinonStub
  CompileAndCacheStub?: Sinon.SinonStub

  before () {
    this.LoggerStub = sinon.stub(Functions, 'logger')
    this.WatchStub = sinon.stub(Imports, 'watch')
    this.WatchStub.returns([])
    this.DebouncerStub = sinon.stub(Functions.debouncer, 'debounce')
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache').resolves()
  }

  after () {
    this.LoggerStub?.restore()
    this.WatchStub?.restore()
    this.DebouncerStub?.restore()
    this.CompileAndCacheStub?.restore()
  }

  @test
  async 'it should log start of watching' () {
    await Functions.WatchFolder('/foo', '/bar')
    expect(this.LoggerStub?.calledWith('Watching /bar for stylesheets')).to.equal(true)
  }

  @test
  async 'it should call watch function with proper flags' () {
    await Functions.WatchFolder('/foo', '/bar')
    expect(this.WatchStub?.calledWith('/foo/bar', { persistent: false })).to.equal(true)
  }

  @test
  async 'it should log when watcher fails to init' () {
    const err = new Error('AAAH!')
    this.WatchStub?.throws(err)
    await Functions.WatchFolder('/foo', '/bar')
    expect(this.LoggerStub?.calledWith('Watcher for /bar exited unexpectedly', err)).to.equal(true)
  }

  @test
  async 'it should ignore non sass file to compile' () {
    this.WatchStub?.returns([{ filename: 'file.txt' }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(this.DebouncerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore ecent without filename' () {
    this.WatchStub?.returns([{ filename: null }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(this.DebouncerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore dotfiles to compile' () {
    this.WatchStub?.returns([{ filename: '.file.sass' }, { filename: '/.file.sass' }, { filename: '/quux/.bar/file.sass' }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(this.DebouncerStub?.called).to.equal(false)
  }

  @test
  async 'it debounce when compiling sass file' () {
    this.WatchStub?.returns([{ filename: 'styles.sass' }])
    await Functions.WatchFolder('/foo', '/bar')
    expect(this.DebouncerStub?.calledWith('/bar/styles.sass')).to.equal(true)
  }

  @test
  async 'it log entry in debounced file' () {
    this.WatchStub?.returns([{ filename: 'styles.sass', eventType: 'change' }])
    await Functions.WatchFolder('/foo', '/bar')
    const fn = this.DebouncerStub?.lastCall.args[1]
    await fn()
    expect(this.LoggerStub?.calledWith('/bar/styles.sass needs recompiling, change')).to.equal(true)
  }

  @test
  async 'it compile and cache debounced file' () {
    this.WatchStub?.returns([{ filename: 'styles.scss', eventType: 'change' }])
    await Functions.WatchFolder('/foo', '/bar')
    const fn = this.DebouncerStub?.lastCall.args[1]
    await fn()
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/styles.scss')).to.equal(true)
  }
}

@suite
export class SassMiddlewareTests {
  StubRequest = {
    method: 'GET',
    path: '/styles.css'
  }

  StubResponse = {
    json: sinon.stub().returnsThis(),
    set: sinon.stub().returnsThis(),
    status: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis()
  }

  FakeRequest = this.StubRequest as unknown as Request
  FakeResponse = this.StubResponse as unknown as Response

  CompileAndCacheStub?: Sinon.SinonStub
  CompileFolderStub?: Sinon.SinonStub
  WatchFolderStub?: Sinon.SinonStub

  before () {
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache').resolves(true)
    this.CompileFolderStub = sinon.stub(Functions, 'CompileFolder').resolves(undefined)
    this.WatchFolderStub = sinon.stub(Functions, 'WatchFolder').resolves(undefined)
  }

  after () {
    this.CompileAndCacheStub?.restore()
    this.CompileFolderStub?.restore()
    this.WatchFolderStub?.restore()
  }

  @test
  'it should watch the configured folder' () {
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    expect(this.WatchFolderStub?.calledWith('/foo', '/bar')).to.equal(true)
  }

  @test
  async 'it should tolerate WatchFolder rejecting' () {
    const awaiter = new Promise<boolean>(resolve => resolve(true))
    this.WatchFolderStub?.callsFake(() => awaiter.then(() => Promise.reject(new ErrorEvent('FOO'))))
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    await awaiter
    expect(this.WatchFolderStub?.calledWith('/foo', '/bar')).to.equal(true)
  }

  @test
  async 'it should toplerate CompileFolder rejecting' () {
    const awaiter = new Promise<boolean>(resolve => resolve(true))
    this.CompileFolderStub?.callsFake(() => awaiter.then(() => Promise.reject(new ErrorEvent('FOO'))))
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    await awaiter
    expect(this.CompileFolderStub?.calledWith('/foo', '/bar')).to.equal(true)
  }

  @test
  'it should compile the configured folder' () {
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    expect(this.CompileFolderStub?.calledWith('/foo', '/bar')).to.equal(true)
  }

  @test
  'it should return a function' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    expect(sass).to.be.a('function')
  }

  @test
  async 'it should ignore a POST request' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.method = 'POST'
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
  }

  @test
  async 'it should ignore a non css request' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/styles.txt'
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
  }

  @test
  async 'it should ignore a dotfile request' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/.styles.css'
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
  }

  @test
  async 'it should reject a directory traversal request' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/../styles.css.map'
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(this.StubResponse.status.calledWith(StatusCodes.FORBIDDEN)).to.equal(true)
    expect(this.StubResponse.send.calledWith('Directory Traversal Not Allowed!')).to.equal(true)
    expect(this.StubResponse.set.called).to.equal(false)
  }

  @test
  async 'it should reject a file that is not found' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/styles.css.map'
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(this.StubResponse.send.calledWith('NOT FOUND')).to.equal(true)
    expect(this.StubResponse.set.called).to.equal(false)
  }

  @test
  async 'it should compile sass for a file that is not in the cache' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/styles.css.map'
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/styles.sass')).to.equal(true)
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/styles.scss')).to.equal(false)
  }

  @test
  async 'it should compile scss when sass is not found for a file that is not in the cache' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/styles.css.map'
    this.CompileAndCacheStub?.onFirstCall().resolves(false)
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/styles.sass')).to.equal(true)
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/styles.scss')).to.equal(true)
  }

  @test
  async 'it should send css map when requested' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/styles.css.map'
    const map = {
      version: 0,
      file: '/style.css',
      names: [],
      sources: [],
      mappings: 'SOME MAPPINGS!'
    }
    Functions.cache['/styles.css'] = Promise.resolve({
      map,
      css: 'SOME CSS!'
    })
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(this.StubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
    expect(this.StubResponse.set.calledWith('Content-Type', 'application/json')).to.equal(true)
    expect(this.StubResponse.json.calledWith(map)).to.equal(true)
  }

  @test
  async 'it should send css when requested' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/styles.css'
    const map = {
      version: 0,
      file: '/style.css',
      names: [],
      sources: [],
      mappings: 'SOME MAPPINGS!'
    }
    Functions.cache['/styles.css'] = Promise.resolve({
      map,
      css: 'SOME CSS!'
    })
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(this.StubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
    expect(this.StubResponse.set.calledWith('Content-Type', 'text/css')).to.equal(true)
    expect(this.StubResponse.send.calledWith('SOME CSS!')).to.equal(true)
  }

  @test
  async 'it should reject with internal server error when error happens' () {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar'
    })
    const spy = sinon.stub()
    this.FakeRequest.path = '/styles.css'
    Functions.cache['/styles.css'] = Promise.reject(new Error('FOO IS BAR!'))
    await sass(this.FakeRequest, this.FakeResponse, spy)
    expect(this.StubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(this.StubResponse.send.calledWith('FOO IS BAR!')).to.equal(true)
  }
}
