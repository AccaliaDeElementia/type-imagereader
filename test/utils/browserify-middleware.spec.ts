'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import { StatusCodes } from 'http-status-codes'

import browserifyMiddleware, { Imports, Functions } from '../../utils/browserify-middleware'
import { StubToRequest, StubToResponse } from '../testutils/TypeGuards'

@suite
export class BrowserifyMiddlewareGetPathsTests {
  @test
  'it replaces compileable extension .js'(): void {
    const paths = Functions.GetPaths('foo.js')
    expect(paths).to.deep.equal(['foo.js', 'foo.ts', 'foo'])
  }

  @test
  'it replaces compileable extension .ts'(): void {
    const paths = Functions.GetPaths('foo.ts')
    expect(paths).to.deep.equal(['foo.js', 'foo.ts', 'foo'])
  }

  @test
  'it ignores non compileable extension .qs'(): void {
    const paths = Functions.GetPaths('foo.qs')
    expect(paths).to.deep.equal(['foo.qs.js', 'foo.qs.ts', 'foo.qs'])
  }
}

@suite
export class BrowserifyMiddlewareGetSystemPathTests {
  AccessStub?: Sinon.SinonStub

  before(): void {
    this.AccessStub = sinon.stub(Imports, 'access')
  }

  after(): void {
    this.AccessStub?.restore()
  }

  @test
  async 'It accepts leading slashes'(): Promise<void> {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', '/bar')
    expect(this.AccessStub?.calledWith('/foo/bar.js')).to.equal(true)
  }

  @test
  async 'It tests acccess to path + .js'(): Promise<void> {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', 'bar')
    expect(this.AccessStub?.calledWith('/foo/bar.js')).to.equal(true)
  }

  @test
  async 'It tests acccess to path + .ts'(): Promise<void> {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', 'bar')
    expect(this.AccessStub?.calledWith('/foo/bar.ts')).to.equal(true)
  }

  @test
  async 'It tests acccess to path'(): Promise<void> {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', 'bar')
    expect(this.AccessStub?.calledWith('/foo/bar')).to.equal(true)
  }

  @test
  async 'it resolves to null if no file matches'(): Promise<void> {
    this.AccessStub?.rejects('ERROR!')
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal(null)
  }

  @test
  async 'it resolves to .js if if all file matches'(): Promise<void> {
    this.AccessStub?.callsFake(async (_: string) => {
      await Promise.resolve()
    })
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar.js')
  }

  @test
  async 'it resolves to .ts if no .js matches'(): Promise<void> {
    this.AccessStub?.callsFake(async (path: string) => {
      ;/\.js$/i.test(path) ? await Promise.reject(new Error('ERROR')) : await Promise.resolve()
    })
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar.ts')
  }

  @test
  async 'it resolves to path if no .js/.ts matches'(): Promise<void> {
    this.AccessStub?.callsFake(async (path: string) => {
      ;/\.[jt]s$/.test(path) ? await Promise.reject(new Error('ERROR')) : await Promise.resolve()
    })
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar')
  }
}

class ErrorWithCode extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

@suite
export class BrowserifyMiddlewareCompileBundleTests {
  AccessStub?: Sinon.SinonStub
  MinifyStub?: Sinon.SinonStub
  BrowserifyStub?: Sinon.SinonStub
  Browser = {
    plugin: sinon.stub(),
    transform: sinon.stub(),
    add: sinon.stub(),
    bundle: sinon.stub(),
  }

  before(): void {
    this.AccessStub = sinon.stub(Imports, 'access')
    this.AccessStub.resolves()
    this.Browser.bundle.callsFake((fn) => {
      fn(null, Buffer.from('browserified', 'utf-8'))
    })
    this.BrowserifyStub = sinon.stub(Imports, 'browserify')
    this.BrowserifyStub.returns(this.Browser)
    this.MinifyStub = sinon.stub(Imports, 'minify')
    this.MinifyStub.callsFake((src) => ({ code: src }))
  }

  after(): void {
    this.AccessStub?.restore()
    this.BrowserifyStub?.restore()
    this.MinifyStub?.restore()
  }

  @test
  async 'it should add tsify plugin'(): Promise<void> {
    expect(this.Browser.plugin.calledWith('tsify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(this.Browser.plugin.calledWith('tsify')).to.equal(true)
  }

  @test
  async 'it should add common-shakeify plugin'(): Promise<void> {
    expect(this.Browser.plugin.calledWith('common-shakeify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(this.Browser.plugin.calledWith('common-shakeify')).to.equal(true)
  }

  @test
  async 'it should add common-shakeify configuration for ecma version 14'(): Promise<void> {
    expect(this.Browser.plugin.calledWith('common-shakeify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(
      this.Browser.plugin.calledWith('common-shakeify', {
        ecmaVersion: 14,
      }),
    ).to.equal(true)
  }

  @test
  async 'it should add brfs transform'(): Promise<void> {
    expect(this.Browser.transform.calledWith('brfs')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(this.Browser.transform.calledWith('brfs')).to.equal(true)
  }

  @test
  async 'it should add path to bundle'(): Promise<void> {
    const expected = `/foo/${Math.random()}`
    await Functions.CompileBundle(expected)
    expect(this.Browser.add.calledWith(expected)).to.equal(true)
  }

  @test
  async 'it should resolve to a string on success'(): Promise<void> {
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal('browserified')
  }

  @test
  async 'it should reject when access rejects'(): Promise<void> {
    this.AccessStub?.rejects()
    await Functions.CompileBundle('/foo').then(
      () => expect.fail('Function did not reject as expected!'),
      () => null,
    )
  }

  @test
  async 'it should reject on generic bundle error'(): Promise<void> {
    this.Browser.bundle.callsFake((fn) => {
      fn('ERROR!', null)
    })
    await Functions.CompileBundle('/foo').then(
      () => expect.fail('Function did not reject as expected!'),
      () => null,
    )
  }

  @test
  async 'it should resolve to null on MODULE_NOT_FOUND'(): Promise<void> {
    this.Browser.bundle.callsFake((fn) => {
      fn(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'), null)
    })
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  }

  @test
  async 'it should resolve to null on ENOENT'(): Promise<void> {
    this.Browser.bundle.callsFake((fn) => {
      fn(new ErrorWithCode('OOPS', 'ENOENT'), null)
    })
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  }

  @test
  async 'it should resolve to null when minify fails'(): Promise<void> {
    this.MinifyStub?.callsFake(() => ({}))
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  }
}

@suite
export class BrowserifyMiddlewareCompileAndCacheTests {
  GetSystemPath?: Sinon.SinonStub
  GetPaths?: Sinon.SinonStub
  CompileBundleStub?: Sinon.SinonStub
  Logger?: Sinon.SinonStub

  before(): void {
    this.GetSystemPath = sinon.stub(Functions, 'GetSystemPath')
    this.GetSystemPath.resolves()
    this.GetPaths = sinon.stub(Functions, 'GetPaths')
    this.GetPaths.returns([])
    this.CompileBundleStub = sinon.stub(Functions, 'CompileBundle')
    this.CompileBundleStub.resolves()
    this.Logger = sinon.stub(Functions, 'logger')
    Functions.browserified = {}
  }

  after(): void {
    this.CompileBundleStub?.restore()
    this.GetPaths?.restore()
    this.GetSystemPath?.restore()
    this.Logger?.restore()
  }

  @test
  async 'it should abort if real path resolves to null'(): Promise<void> {
    this.GetSystemPath?.resolves(null)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.called).to.equal(false)
  }

  @test
  async 'it should abort if real path resolves to undefined'(): Promise<void> {
    this.GetSystemPath?.resolves(undefined)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.called).to.equal(false)
  }

  @test
  async 'it should abort if real path resolves to empty'(): Promise<void> {
    this.GetSystemPath?.resolves('')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.called).to.equal(false)
  }

  @test
  async 'it should proceed if real path resolves to string'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.GetPaths?.called).to.equal(true)
  }

  @test
  async 'it should get paths for requested path'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.GetPaths?.calledWith('bar')).to.equal(true)
  }

  @test
  async 'it should log start compile'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.Logger?.calledWith('Begin compiling /foo/bar')).to.equal(true)
  }

  @test
  async 'it should trigger compile requested path'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.calledWith('/foo/bar')).to.equal(true)
  }

  @test
  async 'it should save compile result for .js path'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified['bar.js']).to.equal('some code')
  }

  @test
  async 'it should save compile result for .ts path'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified['bar.ts']).to.equal('some code')
  }

  @test
  async 'it should save compile result for path'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified.bar).to.equal('some code')
  }

  @test
  async 'it should log compile complete'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.Logger?.calledWith('Compiled successfully /foo/bar')).to.equal(true)
  }

  @test
  async 'it should log error if GetPaths throws'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    const err = new Error('ERROR')
    this.GetPaths?.throws(err)
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.Logger?.calledWith('Begin compiling /foo/bar')).to.equal(false)
    expect(this.Logger?.calledWith('Compiled successfully /foo/bar')).to.equal(false)
    expect(this.Logger?.calledWith('Compile for /foo/bar failed:', err)).to.equal(true)
  }

  @test
  async 'it should log error if compile rejects'(): Promise<void> {
    this.GetSystemPath?.resolves('/foo/bar')
    const err = new Error('ERROR')
    this.GetPaths?.returns(['bar'])
    this.CompileBundleStub?.rejects(err)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.Logger?.calledWith('Begin compiling /foo/bar')).to.equal(true)
    expect(this.Logger?.calledWith('Compiled successfully /foo/bar')).to.equal(false)
    expect(this.Logger?.calledWith('Compile for /foo/bar failed:', err)).to.equal(true)
  }
}

@suite
export class BrowserifyMiddlewareSendScriptTests {
  StubResponse = {
    status: sinon.stub().returnsThis(),
    render: sinon.stub().returnsThis(),
    contentType: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
  }

  FakeResponse = StubToResponse(this.StubResponse)
  CompileAndCacheStub?: Sinon.SinonStub

  before(): void {
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache')
    this.CompileAndCacheStub.resolves()
    Functions.browserified = {}
  }

  after(): void {
    this.CompileAndCacheStub?.restore()
  }

  @test
  async 'it should set status OK on precompiled script'(): Promise<void> {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
  }

  @test
  async 'it should set content-type on precompiled script'(): Promise<void> {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.contentType.calledWith('application/javascript')).to.equal(true)
  }

  @test
  async 'it should send script on precompiled script'(): Promise<void> {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.send.calledWith('test script')).to.equal(true)
  }

  @test
  async 'it should set status OK on fresh compiled script'(): Promise<void> {
    this.CompileAndCacheStub?.callsFake(async (_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return await Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
  }

  @test
  async 'it should set content-type on fresh compiled script'(): Promise<void> {
    this.CompileAndCacheStub?.callsFake(async (_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return await Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.contentType.calledWith('application/javascript')).to.equal(true)
  }

  @test
  async 'it should send script on fresh compiled script'(): Promise<void> {
    this.CompileAndCacheStub?.callsFake(async (_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return await Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.send.calledWith('test script')).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script compiles to null'(): Promise<void> {
    Functions.browserified['/foo'] = Promise.resolve(null)
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      this.StubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script compiles to empty'(): Promise<void> {
    Functions.browserified['/foo'] = Promise.resolve('')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      this.StubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script rejects as MODULE_NOT_FOUND'(): Promise<void> {
    Functions.browserified['/foo'] = Promise.reject(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      this.StubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script rejects as ENOENT'(): Promise<void> {
    Functions.browserified['/foo'] = Promise.reject(new ErrorWithCode('OOPS', 'ENOENT'))
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      this.StubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  }

  @test
  async 'it should set INTERNAL_SERVER_ERROR response when script rejects non Error'(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Testing error handling with non errors being rejected
    Functions.browserified['/foo'] = Promise.reject('SOMETHING BAD')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(
      this.StubResponse.render.calledWith('error', {
        message: 'INTERNAL SERVER ERROR',
      }),
    ).to.equal(true)
  }

  @test
  async 'it should set INTERNAL_SERVER_ERROR response when script rejects'(): Promise<void> {
    const err = new Error('OOPS')
    Functions.browserified['/foo'] = Promise.reject(err)
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(this.StubResponse.render.calledWith('error', err)).to.equal(true)
  }
}

@suite
export class BrowserifyMiddlewareWatchFolderTests {
  LoggerStub?: Sinon.SinonStub
  WatchStub?: Sinon.SinonStub
  DebounceStub?: Sinon.SinonStub
  CompileAndCacheStub?: Sinon.SinonStub

  before(): void {
    this.LoggerStub = sinon.stub(Functions, 'logger')
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache')
    this.CompileAndCacheStub.resolves()
    this.DebounceStub = sinon.stub(Functions.debouncer, 'debounce')
    this.WatchStub = sinon.stub(Imports, 'watch')
    this.WatchStub.returns([])
  }

  after(): void {
    this.LoggerStub?.restore()
    this.CompileAndCacheStub?.restore()
    this.DebounceStub?.restore()
    this.WatchStub?.restore()
  }

  @test
  async 'it should watch for changes'(): Promise<void> {
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.WatchStub?.calledWith('/foo/bar', { persistent: false })).to.equal(true)
  }

  @test
  async 'it should log watch starting'(): Promise<void> {
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('Watching /bar for Scripts')).to.equal(true)
  }

  @test
  async 'it should log error on MODULE_NOT_FOUND'(): Promise<void> {
    this.WatchStub?.throws(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on MODULE_NOT_FOUND in iterate'(): Promise<void> {
    const err = Promise.reject(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    this.WatchStub?.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on ENOENT'(): Promise<void> {
    this.WatchStub?.throws(new ErrorWithCode('OOPS', 'ENOENT'))
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on ENOENT in iterate'(): Promise<void> {
    const err = Promise.reject(new ErrorWithCode('OOPS', 'ENOENT'))
    this.WatchStub?.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on exception'(): Promise<void> {
    this.WatchStub?.throws('SOMETHING BAD')
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('Watcher for /bar exited unexpectedly')).to.equal(true)
  }

  @test
  async 'it should log error on exception in iterate'(): Promise<void> {
    const err = Promise.reject(new Error('SOMETHING BAD'))
    this.WatchStub?.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('Watcher for /bar exited unexpectedly')).to.equal(true)
  }

  @test
  async 'it should ignore event without filename'(): Promise<void> {
    this.WatchStub?.returns([
      {
        filename: null,
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.DebounceStub?.callCount).to.equal(0)
  }

  @test
  async 'it should debounce non folder event on iteration'(): Promise<void> {
    this.WatchStub?.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.DebounceStub?.calledWith('/bar/baz')).to.equal(true)
  }

  @test
  async 'it should debounce folder event on iteration'(): Promise<void> {
    this.WatchStub?.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', true)
    expect(this.DebounceStub?.calledWith('/bar')).to.equal(true)
  }

  @test
  async 'it should compile scripts for non folder event on iteration'(): Promise<void> {
    this.WatchStub?.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', false)
    const fn = this.DebounceStub?.firstCall.args[1]
    await fn()
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/baz')).to.equal(true)
  }

  @test
  async 'it should compile scripts for folder event on iteration'(): Promise<void> {
    this.WatchStub?.returns([
      {
        filename: '/baz',
        eventType: 'change',
      },
    ])
    await Functions.WatchFolder('/foo', '/bar', true)
    const fn = this.DebounceStub?.firstCall.args[1]
    await fn()
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar')).to.equal(true)
  }
}

@suite
export class BrowserifyMiddlewareWatchAllFoldersTests {
  ReaddirStub?: Sinon.SinonStub
  CompileAndCacheStub?: Sinon.SinonStub
  WatchFolderStub?: Sinon.SinonStub
  LoggerStub?: Sinon.SinonStub

  before(): void {
    this.ReaddirStub = sinon.stub(Imports, 'readdir').resolves([])
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache').resolves(undefined)
    this.WatchFolderStub = sinon.stub(Functions, 'WatchFolder').resolves(undefined)
    this.LoggerStub = sinon.stub(Functions, 'logger')
  }

  after(): void {
    this.ReaddirStub?.restore()
    this.CompileAndCacheStub?.restore()
    this.WatchFolderStub?.restore()
    this.LoggerStub?.restore()
  }

  @test
  async 'it should read each folder in the list of watchdirs'(): Promise<void> {
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.ReaddirStub?.calledWith('/foo/bar', { withFileTypes: true })).to.equal(true)
    expect(this.ReaddirStub?.calledWith('/foo/baz', { withFileTypes: true })).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should watch each folder in the list of watchdirs'(): Promise<void> {
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.WatchFolderStub?.calledWith('/foo', '/bar', false)).to.equal(true)
    expect(this.WatchFolderStub?.calledWith('/foo', '/baz', false)).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore dotfiles when scanning for scripts to compile'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: '.eslintrc.js',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.called).to.equal(false)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore dotfolders when scanning for scripts to compile'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: '.tmp',
        isDirectory: () => true,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.called).to.equal(false)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore file without compileable extension when scanning for scripts to compile'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: 'eslintrc.yaml',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.called).to.equal(false)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should compile .js file when scanning for scripts to compile'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: 'application.js',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/application.js')).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should compile .ts file when scanning for scripts to compile'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: 'application.ts',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/application.ts')).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should compile folder when scanning for scripts to compile'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: 'application',
        isDirectory: () => true,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/application')).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should watch contents of folders when scanning for scripts to compile'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: 'application',
        isDirectory: () => true,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.WatchFolderStub?.calledWith('/foo', '/bar/application', true)).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should complain about folder not existing when erroring with MODULE_NOT_FOUND'(): Promise<void> {
    this.ReaddirStub?.rejects(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.LoggerStub?.calledWith('/bar does not exist to precompile scripts')).to.equal(true)
  }

  @test
  async 'it should complain about folder not existing when erroring with ENOENT'(): Promise<void> {
    this.ReaddirStub?.rejects(new ErrorWithCode('OOPS', 'ENOENT'))
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.LoggerStub?.calledWith('/bar does not exist to precompile scripts')).to.equal(true)
  }

  @test
  async 'it should handle unexpected error gracefully'(): Promise<void> {
    this.ReaddirStub?.rejects('SOMETHING BAD')
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.LoggerStub?.calledWith('Unexpected Error while precompiling /bar scripts')).to.equal(true)
  }

  @test
  async 'it should continue processing other folders after getting one error'(): Promise<void> {
    this.ReaddirStub?.onFirstCall().rejects('SOMETHING_BAD')
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.ReaddirStub?.calledWith('/foo/bar', { withFileTypes: true })).to.equal(true)
    expect(this.ReaddirStub?.calledWith('/foo/baz', { withFileTypes: true })).to.equal(true)
  }

  @test
  async 'it should continue processing when CompileAndCache rejects'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: 'application.ts',
        isDirectory: () => false,
      },
    ])
    this.CompileAndCacheStub?.rejects(new Error('FOO!'))
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should continue processing when WatchFolder rejects'(): Promise<void> {
    this.ReaddirStub?.resolves([
      {
        name: 'application',
        isDirectory: () => true,
      },
    ])
    this.WatchFolderStub?.rejects(new Error('FOO!'))
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.LoggerStub?.called).to.equal(false)
  }
}

@suite
export class BrowserifyMiddlewareTests {
  StubRequest = {
    method: 'GET',
    path: '/',
  }

  StubResponse = {
    status: sinon.stub().returnsThis(),
    render: sinon.stub().returnsThis(),
  }

  FakeRequest = StubToRequest(this.StubRequest)
  FakeResponse = StubToResponse(this.StubResponse)

  WatchAllFoldersStub?: Sinon.SinonStub
  SendScriptStub?: Sinon.SinonStub

  before(): void {
    this.WatchAllFoldersStub = sinon.stub(Functions, 'WatchAllFolders').resolves(undefined)
    this.SendScriptStub = sinon.stub(Functions, 'SendScript')
  }

  after(): void {
    this.WatchAllFoldersStub?.restore()
    this.SendScriptStub?.restore()
  }

  @test
  'it should return a callable'(): void {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    expect(result).to.be.a('function')
  }

  @test
  'it should not watch when paths not specified'(): void {
    browserifyMiddleware({
      basePath: '/',
    })
    expect(this.WatchAllFoldersStub?.called).to.equal(false)
  }

  @test
  'it should not watch when paths empty'(): void {
    browserifyMiddleware({
      basePath: '/',
      watchPaths: [],
    })
    expect(this.WatchAllFoldersStub?.called).to.equal(false)
  }

  @test
  'it should watch when paths provided'(): void {
    browserifyMiddleware({
      basePath: '/foo',
      watchPaths: ['/bar', '/baz'],
    })
    expect(this.WatchAllFoldersStub?.calledWith('/foo', ['/bar', '/baz'])).to.equal(true)
  }

  @test
  async 'it should tolerate WatchAllFolders rejecting'(): Promise<void> {
    const awaiter = Promise.resolve(true)
    this.WatchAllFoldersStub?.callsFake(
      async () => await awaiter.then(async () => await Promise.reject(new Error('FOO!'))),
    )
    browserifyMiddleware({
      basePath: '/foo',
      watchPaths: ['/bar', '/baz'],
    })
    await awaiter
    expect(this.WatchAllFoldersStub?.calledWith('/foo', ['/bar', '/baz'])).to.equal(true)
  }

  @test
  async 'it should pass request to next for POST request'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'POST'
    this.StubRequest.path = '/script.js'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(this.StubResponse.status.called).to.equal(false)
    expect(this.SendScriptStub?.called).to.equal(false)
  }

  @test
  async 'it should pass request to next for HEAD request'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'HEAD'
    this.StubRequest.path = '/script.js'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(this.StubResponse.status.called).to.equal(false)
    expect(this.SendScriptStub?.called).to.equal(false)
  }

  @test
  async 'it should pass request to next for PATCH request'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'PATCH'
    this.StubRequest.path = '/script.js'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(this.StubResponse.status.called).to.equal(false)
    expect(this.SendScriptStub?.called).to.equal(false)
  }

  @test
  async 'it should pass request to next for DELETE request'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'DELETE'
    this.StubRequest.path = '/script.js'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(this.StubResponse.status.called).to.equal(false)
    expect(this.SendScriptStub?.called).to.equal(false)
  }

  @test
  async 'it should pass request to next for non compileable request'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'GET'
    this.StubRequest.path = '/script.txt'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(this.StubResponse.status.called).to.equal(false)
    expect(this.SendScriptStub?.called).to.equal(false)
  }

  @test
  async 'it should pass render forbidden error for directory traversal'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'GET'
    this.StubRequest.path = '/../script.js'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(this.StubResponse.status.calledWith(StatusCodes.FORBIDDEN)).to.equal(true)
    expect(
      this.StubResponse.render.calledWith('error', {
        message: 'Directory Traversal Not Allowed!',
      }),
    ).to.equal(true)
    expect(this.SendScriptStub?.called).to.equal(false)
  }

  @test
  async 'it should send file for valid request'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/foo',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'GET'
    this.StubRequest.path = '/script.js'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(this.StubResponse.status.called).to.equal(false)
    expect(this.SendScriptStub?.calledWith('/foo', '/script.js', this.FakeResponse)).to.equal(true)
  }

  @test
  async 'it should pass render Internal Server error for send file failure'(): Promise<void> {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'GET'
    this.StubRequest.path = '/script.js'
    this.SendScriptStub?.rejects('SOMETHING BAD')
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(this.StubResponse.status.called).to.equal(true)
    expect(this.StubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(
      this.StubResponse.render.calledWith('error', {
        message: 'INTERNAL_SERVER_ERROR',
      }),
    ).to.equal(true)
    expect(this.SendScriptStub?.called).to.equal(true)
  }
}
