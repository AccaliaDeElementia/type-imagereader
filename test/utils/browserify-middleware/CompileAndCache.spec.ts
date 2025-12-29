'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/browserify-middleware'
import Sinon from 'sinon'

describe('utils/browserify-middleware function CompileAndCache()', () => {
  let getSystemPathStub = Sinon.stub()
  let getPathsStub = Sinon.stub()
  let compileBundleStub = Sinon.stub()
  let loggerStub = Sinon.stub()
  beforeEach(() => {
    getPathsStub = Sinon.stub(Functions, 'GetPaths').returns([])
    getSystemPathStub = Sinon.stub(Functions, 'GetSystemPath').resolves(null)
    compileBundleStub = Sinon.stub(Functions, 'CompileBundle').resolves()
    loggerStub = Sinon.stub(Functions, 'logger')
    Functions.browserified = {}
  })
  afterEach(() => {
    loggerStub.restore()
    compileBundleStub.restore()
    getSystemPathStub.restore()
    getPathsStub.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should abort if real path resolves to null', async () => {
    getSystemPathStub.resolves(null)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(compileBundleStub.called).to.equal(false)
  })
  it('should abort if real path resolves to undefined', async () => {
    getSystemPathStub.resolves(undefined)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(compileBundleStub.called).to.equal(false)
  })
  it('should abort if real path resolves to empty', async () => {
    getSystemPathStub.resolves('')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(compileBundleStub.called).to.equal(false)
  })
  it('should proceed if real path resolves to string', async () => {
    getSystemPathStub.resolves('/foo/bar')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(getPathsStub.called).to.equal(true)
  })
  it('should get paths for requested path', async () => {
    getSystemPathStub.resolves('/foo/bar')
    getPathsStub.returns(['bar.js', 'bar.ts', 'bar'])
    await Functions.CompileAndCache('/foo', 'bar')
    expect(getPathsStub.calledWith('bar')).to.equal(true)
  })
  it('should log start compile', async () => {
    getSystemPathStub.resolves('/foo/bar')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(loggerStub.calledWith('Begin compiling /foo/bar')).to.equal(true)
  })
  it('should trigger compile requested path', async () => {
    getSystemPathStub.resolves('/foo/bar')
    getPathsStub.returns(['bar.js', 'bar.ts', 'bar'])
    compileBundleStub.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(compileBundleStub.calledWith('/foo/bar')).to.equal(true)
  })
  it('should save compile result for .js path', async () => {
    getSystemPathStub.resolves('/foo/bar')
    getPathsStub.returns(['bar.js', 'bar.ts', 'bar'])
    compileBundleStub.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified['bar.js']).to.equal('some code')
  })
  it('should save compile result for .ts path', async () => {
    getSystemPathStub.resolves('/foo/bar')
    getPathsStub.returns(['bar.js', 'bar.ts', 'bar'])
    compileBundleStub.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified['bar.ts']).to.equal('some code')
  })
  it('should save compile result for path', async () => {
    getSystemPathStub.resolves('/foo/bar')
    getPathsStub.returns(['bar.js', 'bar.ts', 'bar'])
    compileBundleStub.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(await Functions.browserified.bar).to.equal('some code')
  })
  it('should log compile complete', async () => {
    getSystemPathStub.resolves('/foo/bar')
    getPathsStub.returns(['bar.js', 'bar.ts', 'bar'])
    compileBundleStub.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(loggerStub.calledWith('Compiled successfully /foo/bar')).to.equal(true)
  })
  it('should log error if GetPaths throws', async () => {
    getSystemPathStub.resolves('/foo/bar')
    const err = new Error('ERROR')
    getPathsStub.throws(err)
    compileBundleStub.resolves('some code')
    await Functions.CompileAndCache('/foo', 'bar')
    expect(loggerStub.calledWith('Begin compiling /foo/bar')).to.equal(false)
    expect(loggerStub.calledWith('Compiled successfully /foo/bar')).to.equal(false)
    expect(loggerStub.calledWith('Compile for /foo/bar failed:', err)).to.equal(true)
  })
  it('should log error if compile rejects', async () => {
    getSystemPathStub.resolves('/foo/bar')
    const err = new Error('ERROR')
    getPathsStub.returns(['bar'])
    compileBundleStub.rejects(err)
    await Functions.CompileAndCache('/foo', 'bar')
    expect(loggerStub.calledWith('Begin compiling /foo/bar')).to.equal(true)
    expect(loggerStub.calledWith('Compiled successfully /foo/bar')).to.equal(false)
    expect(loggerStub.calledWith('Compile for /foo/bar failed:', err)).to.equal(true)
  })
})
