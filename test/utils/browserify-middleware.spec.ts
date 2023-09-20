'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import browserifyMiddleware, { Imports, Functions } from '../../utils/browserify-middleware'

@suite
export class BrowserifyMiddlewareGetPathsTests {
  @test
  'it replaces compileable extension .js' () {
    const paths = Functions.GetPaths('foo.js')
    expect(paths).to.deep.equal([
      'foo.js',
      'foo.ts',
      'foo'
    ])
  }

  @test
  'it replaces compileable extension .ts' () {
    const paths = Functions.GetPaths('foo.ts')
    expect(paths).to.deep.equal([
      'foo.js',
      'foo.ts',
      'foo'
    ])
  }

  @test
  'it ignores non compileable extension .qs' () {
    const paths = Functions.GetPaths('foo.qs')
    expect(paths).to.deep.equal([
      'foo.qs.js',
      'foo.qs.ts',
      'foo.qs'
    ])
  }
}

@suite
export class BrowserifyMiddlewareGetSystemPathTests {
  AccessStub?: Sinon.SinonStub

  before () {
    this.AccessStub = sinon.stub(Imports, 'access')
  }

  after () {
    this.AccessStub?.restore()
  }

  @test
  async 'It accepts leading slashes' () {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', '/bar')
    expect(this.AccessStub?.calledWith('/foo/bar.js')).to.equal(true)
  }

  @test
  async 'It tests acccess to path + .js' () {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', 'bar')
    expect(this.AccessStub?.calledWith('/foo/bar.js')).to.equal(true)
  }

  @test
  async 'It tests acccess to path + .ts' () {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', 'bar')
    expect(this.AccessStub?.calledWith('/foo/bar.ts')).to.equal(true)
  }

  @test
  async 'It tests acccess to path' () {
    this.AccessStub?.resolves()
    await Functions.GetSystemPath('/foo', 'bar')
    expect(this.AccessStub?.calledWith('/foo/bar')).to.equal(true)
  }

  @test
  async 'it resolves to null if no file matches' () {
    this.AccessStub?.rejects('ERROR!')
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal(null)
  }

  @test
  async 'it resolves to .js if if all file matches' () {
    this.AccessStub?.callsFake((_: string) => Promise.resolve())
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar.js')
  }

  @test
  async 'it resolves to .ts if no .js matches' () {
    this.AccessStub?.callsFake((path: string) => /\.js$/.test(path) ? Promise.reject(new Error('ERROR')) : Promise.resolve())
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar.ts')
  }

  @test
  async 'it resolves to path if no .js/.ts matches' () {
    this.AccessStub?.callsFake((path: string) => /\.[jt]s$/.test(path) ? Promise.reject(new Error('ERROR')) : Promise.resolve())
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar')
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
    bundle: sinon.stub()
  }

  before () {
    this.AccessStub = sinon.stub(Imports, 'access')
    this.AccessStub.resolves()
    this.Browser.bundle.callsFake(fn => fn(null, Buffer.from('browserified', 'utf-8')))
    this.BrowserifyStub = sinon.stub(Imports, 'browserify')
    this.BrowserifyStub.returns(this.Browser)
    this.MinifyStub = sinon.stub(Imports, 'minify')
    this.MinifyStub.callsFake(src => {
      return {
        code: src
      }
    })
  }

  after () {
    this.AccessStub?.restore()
    this.BrowserifyStub?.restore()
    this.MinifyStub?.restore()
  }

  @test
  async 'it should add tsify plugin' () {
    expect(this.Browser.plugin.calledWith('tsify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(this.Browser.plugin.calledWith('tsify')).to.equal(true)
  }

  @test
  async 'it should add common-shakeify plugin' () {
    expect(this.Browser.plugin.calledWith('common-shakeify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(this.Browser.plugin.calledWith('common-shakeify')).to.equal(true)
  }

  @test
  async 'it should add common-shakeify configuration for ecma version 14' () {
    expect(this.Browser.plugin.calledWith('common-shakeify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(this.Browser.plugin.calledWith('common-shakeify', {
      ecmaVersion: 14
    })).to.equal(true)
  }

  @test
  async 'it should add brfs transform' () {
    expect(this.Browser.transform.calledWith('brfs')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(this.Browser.transform.calledWith('brfs')).to.equal(true)
  }

  @test
  async 'it should add path to bundle' () {
    const expected = `/foo/${Math.random()}`
    await Functions.CompileBundle(expected)
    expect(this.Browser.add.calledWith(expected)).to.equal(true)
  }

  @test
  async 'it should resolve to a string on success' () {
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal('browserified')
  }

  @test
  async 'it should reject when access rejects' () {
    this.AccessStub?.rejects()
    await Functions.CompileBundle('/foo').then(
      () => expect.fail('Function did not reject as expected!'),
      () => {}
    )
  }

  @test
  async 'it should reject on generic bundle error' () {
    this.Browser.bundle.callsFake(fn => fn('ERROR!', null))
    await Functions.CompileBundle('/foo').then(
      () => expect.fail('Function did not reject as expected!'),
      () => {}
    )
  }

  @test
  async 'it should resolve to null on MODULE_NOT_FOUND' () {
    this.Browser.bundle.callsFake(fn => fn({
      code: 'MODULE_NOT_FOUND'
    }, null))
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  }

  @test
  async 'it should resolve to null on ENOENT' () {
    this.Browser.bundle.callsFake(fn => fn({
      code: 'ENOENT'
    }, null))
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  }

  @test
  async 'it should resolve to null when minify fails' () {
    this.MinifyStub?.callsFake(() => {
      return {}
    })
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

  before () {
    this.GetSystemPath = sinon.stub(Functions, 'GetSystemPath')
    this.GetSystemPath.resolves()
    this.GetPaths = sinon.stub(Functions, 'GetPaths')
    this.GetPaths.returns([])
    this.CompileBundleStub = sinon.stub(Functions, 'CompileBundle')
    this.CompileBundleStub.resolves()
    this.Logger = sinon.stub(Functions, 'logger')
    Functions.browserified = {}
  }

  after () {
    this.CompileBundleStub?.restore()
    this.GetPaths?.restore()
    this.GetSystemPath?.restore()
    this.Logger?.restore()
  }

  @test
  async 'it should abort if real path resolves to null' () {
    this.GetSystemPath?.resolves(null)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.called).to.equal(false)
  }

  @test
  async 'it should abort if real path resolves to undefined' () {
    this.GetSystemPath?.resolves(undefined)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.called).to.equal(false)
  }

  @test
  async 'it should abort if real path resolves to empty' () {
    this.GetSystemPath?.resolves('')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.called).to.equal(false)
  }

  @test
  async 'it should proceed if real path resolves to string' () {
    this.GetSystemPath?.resolves('/foo/bar')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.GetPaths?.called).to.equal(true)
  }

  @test
  async 'it should get paths for requested path' () {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.GetPaths?.calledWith('bar')).to.equal(true)
  }

  @test
  async 'it should log start compile' () {
    this.GetSystemPath?.resolves('/foo/bar')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.Logger?.calledWith('Begin compiling /foo/bar')).to.equal(true)
  }

  @test
  async 'it should trigger compile requested path' () {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.CompileBundleStub?.calledWith('/foo/bar')).to.equal(true)
  }

  @test
  async 'it should save compile result for .js path' () {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified['bar.js']).to.equal('some code')
  }

  @test
  async 'it should save compile result for .ts path' () {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified['bar.ts']).to.equal('some code')
  }

  @test
  async 'it should save compile result for path' () {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified.bar).to.equal('some code')
  }

  @test
  async 'it should log compile complete' () {
    this.GetSystemPath?.resolves('/foo/bar')
    this.GetPaths?.returns(['bar.js', 'bar.ts', 'bar'])
    this.CompileBundleStub?.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(this.Logger?.calledWith('Compiled successfully /foo/bar')).to.equal(true)
  }

  @test
  async 'it should log error if GetPaths throws' () {
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
  async 'it should log error if compile rejects' () {
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
    send: sinon.stub().returnsThis()
  }

  FakeResponse = this.StubResponse as unknown as Response
  CompileAndCacheStub?: Sinon.SinonStub

  before () {
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache')
    this.CompileAndCacheStub.resolves()
    Functions.browserified = {}
  }

  after () {
    this.CompileAndCacheStub?.restore()
  }

  @test
  async 'it should set status OK on precompiled script' () {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
  }

  @test
  async 'it should set content-type on precompiled script' () {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.contentType.calledWith('application/javascript')).to.equal(true)
  }

  @test
  async 'it should send script on precompiled script' () {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.send.calledWith('test script')).to.equal(true)
  }

  @test
  async 'it should set status OK on fresh compiled script' () {
    this.CompileAndCacheStub?.callsFake((_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
  }

  @test
  async 'it should set content-type on fresh compiled script' () {
    this.CompileAndCacheStub?.callsFake((_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.contentType.calledWith('application/javascript')).to.equal(true)
  }

  @test
  async 'it should send script on fresh compiled script' () {
    this.CompileAndCacheStub?.callsFake((_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.send.calledWith('test script')).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script compiles to null' () {
    Functions.browserified['/foo'] = Promise.resolve(null)
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(this.StubResponse.render.calledWith('error', {
      message: 'Not Found: /foo'
    })).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script compiles to empty' () {
    Functions.browserified['/foo'] = Promise.resolve('')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(this.StubResponse.render.calledWith('error', {
      message: 'Not Found: /foo'
    })).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script rejects as MODULE_NOT_FOUND' () {
    // eslint-disable-next-line prefer-promise-reject-errors
    Functions.browserified['/foo'] = Promise.reject({
      code: 'MODULE_NOT_FOUND'
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(this.StubResponse.render.calledWith('error', {
      message: 'Not Found: /foo'
    })).to.equal(true)
  }

  @test
  async 'it should set NOT_FOUND response when script rejects as ENOENT' () {
    // eslint-disable-next-line prefer-promise-reject-errors
    Functions.browserified['/foo'] = Promise.reject({
      code: 'ENOENT'
    })
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(this.StubResponse.render.calledWith('error', {
      message: 'Not Found: /foo'
    })).to.equal(true)
  }

  @test
  async 'it should set INTERNAL_SERVER_ERROR response when script rejects non Error' () {
    // eslint-disable-next-line prefer-promise-reject-errors
    Functions.browserified['/foo'] = Promise.reject('SOMETHING BAD')
    await Functions.SendScript('/root', '/foo', this.FakeResponse)
    expect(this.StubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(this.StubResponse.render.calledWith('error', {
      message: 'INTERNAL SERVER ERROR'
    })).to.equal(true)
  }

  @test
  async 'it should set INTERNAL_SERVER_ERROR response when script rejects' () {
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

  before () {
    this.LoggerStub = sinon.stub(Functions, 'logger')
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache')
    this.CompileAndCacheStub.resolves()
    this.DebounceStub = sinon.stub(Functions.debouncer, 'debounce')
    this.WatchStub = sinon.stub(Imports, 'watch')
    this.WatchStub.returns([])
  }

  after () {
    this.LoggerStub?.restore()
    this.CompileAndCacheStub?.restore()
    this.DebounceStub?.restore()
    this.WatchStub?.restore()
  }

  @test
  async 'it should watch for changes' () {
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.WatchStub?.calledWith('/foo/bar', { persistent: false })).to.equal(true)
  }

  @test
  async 'it should log watch starting' () {
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('Watching /bar for Scripts')).to.equal(true)
  }

  @test
  async 'it should log error on MODULE_NOT_FOUND' () {
    this.WatchStub?.throws({
      code: 'MODULE_NOT_FOUND'
    })
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on MODULE_NOT_FOUND in iterate' () {
    // eslint-disable-next-line prefer-promise-reject-errors
    const err = Promise.reject({
      code: 'MODULE_NOT_FOUND'
    })
    this.WatchStub?.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on ENOENT' () {
    this.WatchStub?.throws({
      code: 'ENOENT'
    })
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on ENOENT in iterate' () {
    // eslint-disable-next-line prefer-promise-reject-errors
    const err = Promise.reject({
      code: 'ENOENT'
    })
    this.WatchStub?.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('/bar does not exist to watch')).to.equal(true)
  }

  @test
  async 'it should log error on exception' () {
    this.WatchStub?.throws('SOMETHING BAD')
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('Watcher for /bar exited unexpectedly')).to.equal(true)
  }

  @test
  async 'it should log error on exception in iterate' () {
    const err = Promise.reject(new Error('SOMETHING BAD'))
    this.WatchStub?.returns([err])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.LoggerStub?.calledWith('Watcher for /bar exited unexpectedly')).to.equal(true)
  }

  @test
  async 'it should debounce non folder event on iteration' () {
    this.WatchStub?.returns([{
      filename: '/baz',
      eventType: 'change'
    }])
    await Functions.WatchFolder('/foo', '/bar', false)
    expect(this.DebounceStub?.calledWith('/bar/baz')).to.equal(true)
  }

  @test
  async 'it should debounce folder event on iteration' () {
    this.WatchStub?.returns([{
      filename: '/baz',
      eventType: 'change'
    }])
    await Functions.WatchFolder('/foo', '/bar', true)
    expect(this.DebounceStub?.calledWith('/bar')).to.equal(true)
  }

  @test
  async 'it should compile scripts for non folder event on iteration' () {
    this.WatchStub?.returns([{
      filename: '/baz',
      eventType: 'change'
    }])
    await Functions.WatchFolder('/foo', '/bar', false)
    const fn = this.DebounceStub?.firstCall.args[1]
    await fn()
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/baz')).to.equal(true)
  }

  @test
  async 'it should compile scripts for folder event on iteration' () {
    this.WatchStub?.returns([{
      filename: '/baz',
      eventType: 'change'
    }])
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

  before () {
    this.ReaddirStub = sinon.stub(Imports, 'readdir').resolves([])
    this.CompileAndCacheStub = sinon.stub(Functions, 'CompileAndCache')
    this.WatchFolderStub = sinon.stub(Functions, 'WatchFolder')
    this.LoggerStub = sinon.stub(Functions, 'logger')
  }

  after () {
    this.ReaddirStub?.restore()
    this.CompileAndCacheStub?.restore()
    this.WatchFolderStub?.restore()
    this.LoggerStub?.restore()
  }

  @test
  async 'it should read each folder in the list of watchdirs' () {
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.ReaddirStub?.calledWith('/foo/bar', { withFileTypes: true })).to.equal(true)
    expect(this.ReaddirStub?.calledWith('/foo/baz', { withFileTypes: true })).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should watch each folder in the list of watchdirs' () {
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.WatchFolderStub?.calledWith('/foo', '/bar', false)).to.equal(true)
    expect(this.WatchFolderStub?.calledWith('/foo', '/baz', false)).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore dotfiles when scanning for scripts to compile' () {
    this.ReaddirStub?.resolves([{
      name: '.eslintrc.js',
      isDirectory: () => false
    }])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.called).to.equal(false)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore dotfolders when scanning for scripts to compile' () {
    this.ReaddirStub?.resolves([{
      name: '.tmp',
      isDirectory: () => true
    }])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.called).to.equal(false)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should ignore file without compileable extension when scanning for scripts to compile' () {
    this.ReaddirStub?.resolves([{
      name: 'eslintrc.yaml',
      isDirectory: () => false
    }])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.called).to.equal(false)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should compile .js file when scanning for scripts to compile' () {
    this.ReaddirStub?.resolves([{
      name: 'application.js',
      isDirectory: () => false
    }])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/application.js')).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should compile .ts file when scanning for scripts to compile' () {
    this.ReaddirStub?.resolves([{
      name: 'application.ts',
      isDirectory: () => false
    }])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/application.ts')).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should compile folder when scanning for scripts to compile' () {
    this.ReaddirStub?.resolves([{
      name: 'application',
      isDirectory: () => true
    }])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.CompileAndCacheStub?.calledWith('/foo', '/bar/application')).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should watch contents of folders when scanning for scripts to compile' () {
    this.ReaddirStub?.resolves([{
      name: 'application',
      isDirectory: () => true
    }])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.WatchFolderStub?.calledWith('/foo', '/bar/application', true)).to.equal(true)
    expect(this.LoggerStub?.called).to.equal(false)
  }

  @test
  async 'it should complain about folder not existing when erroring with MODULE_NOT_FOUND' () {
    this.ReaddirStub?.rejects({
      code: 'MODULE_NOT_FOUND'
    })
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.LoggerStub?.calledWith('/bar does not exist to precompile scripts')).to.equal(true)
  }

  @test
  async 'it should complain about folder not existing when erroring with ENOENT' () {
    this.ReaddirStub?.rejects({
      code: 'ENOENT'
    })
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.LoggerStub?.calledWith('/bar does not exist to precompile scripts')).to.equal(true)
  }

  @test
  async 'it should handle unexpected error gracefully' () {
    this.ReaddirStub?.rejects('SOMETHING BAD')
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(this.LoggerStub?.calledWith('Unexpected Error while precompiling /bar scripts')).to.equal(true)
  }

  @test
  async 'it should continue processing other folders after getting one error' () {
    this.ReaddirStub?.onFirstCall().rejects('SOMETHING_BAD')
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(this.ReaddirStub?.calledWith('/foo/bar', { withFileTypes: true })).to.equal(true)
    expect(this.ReaddirStub?.calledWith('/foo/baz', { withFileTypes: true })).to.equal(true)
  }
}

@suite
export class BrowserifyMiddlewareTests {
  StubRequest = {
    method: 'GET',
    path: '/'
  }

  StubResponse = {
    status: sinon.stub().returnsThis(),
    render: sinon.stub().returnsThis()
  }

  FakeRequest = this.StubRequest as unknown as Request
  FakeResponse = this.StubResponse as unknown as Response

  WatchAllFoldersStub?: Sinon.SinonStub
  SendScriptStub?: Sinon.SinonStub

  before () {
    this.WatchAllFoldersStub = sinon.stub(Functions, 'WatchAllFolders')
    this.SendScriptStub = sinon.stub(Functions, 'SendScript')
  }

  after () {
    this.WatchAllFoldersStub?.restore()
    this.SendScriptStub?.restore()
  }

  @test
  'it should return a callable' () {
    const result = browserifyMiddleware({
      basePath: '/'
    })
    expect(result).to.be.a('function')
  }

  @test
  'it should not watch when paths not specified' () {
    browserifyMiddleware({
      basePath: '/'
    })
    expect(this.WatchAllFoldersStub?.called).to.equal(false)
  }

  @test
  'it should not watch when paths empty' () {
    browserifyMiddleware({
      basePath: '/',
      watchPaths: []
    })
    expect(this.WatchAllFoldersStub?.called).to.equal(false)
  }

  @test
  'it should watch when paths provided' () {
    browserifyMiddleware({
      basePath: '/foo',
      watchPaths: ['/bar', '/baz']
    })
    expect(this.WatchAllFoldersStub?.calledWith('/foo', ['/bar', '/baz'])).to.equal(true)
  }

  @test
  async 'it should pass request to next for POST request' () {
    const result = browserifyMiddleware({
      basePath: '/'
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
  async 'it should pass request to next for HEAD request' () {
    const result = browserifyMiddleware({
      basePath: '/'
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
  async 'it should pass request to next for PATCH request' () {
    const result = browserifyMiddleware({
      basePath: '/'
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
  async 'it should pass request to next for DELETE request' () {
    const result = browserifyMiddleware({
      basePath: '/'
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
  async 'it should pass request to next for non compileable request' () {
    const result = browserifyMiddleware({
      basePath: '/'
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
  async 'it should pass render forbidden error for directory traversal' () {
    const result = browserifyMiddleware({
      basePath: '/'
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'GET'
    this.StubRequest.path = '/../script.js'
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(this.StubResponse.status.calledWith(StatusCodes.FORBIDDEN)).to.equal(true)
    expect(this.StubResponse.render.calledWith(
      'error', { message: 'Directory Traversal Not Allowed!' }
    )).to.equal(true)
    expect(this.SendScriptStub?.called).to.equal(false)
  }

  @test
  async 'it should send file for valid request' () {
    const result = browserifyMiddleware({
      basePath: '/foo'
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
  async 'it should pass render Internal Server error for send file failure' () {
    const result = browserifyMiddleware({
      basePath: '/'
    })
    const spy = sinon.stub()
    this.StubRequest.method = 'GET'
    this.StubRequest.path = '/script.js'
    this.SendScriptStub?.rejects('SOMETHING BAD')
    await result(this.FakeRequest, this.FakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(this.StubResponse.status.called).to.equal(true)
    expect(this.StubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(this.StubResponse.render.calledWith(
      'error', { message: 'INTERNAL_SERVER_ERROR' }
    )).to.equal(true)
    expect(this.SendScriptStub?.called).to.equal(true)
  }
}
