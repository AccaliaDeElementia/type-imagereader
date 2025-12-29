'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { Functions, Imports } from '../../../utils/sass-middleware'

describe('utils/sass-middleware function CompileAndCache()', () => {
  let compileCssStub = Sinon.stub()
  let accessStub = Sinon.stub()
  beforeEach(() => {
    Functions.cache = {}
    compileCssStub = Sinon.stub(Functions, 'CompileCss').resolves(undefined)
    accessStub = Sinon.stub(Imports, 'access').resolves()
  })
  afterEach(() => {
    compileCssStub.restore()
    accessStub.restore()
  })
  it('should test access to full path', async () => {
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(accessStub.calledWith('/foo/bar.scss')).to.equal(true)
  })
  it('should return true on success', async () => {
    const result = await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(result).to.equal(true)
  })
  it('should place cache entry on success', async () => {
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(Functions.cache['/bar.css']).to.not.equal(undefined)
  })
  it('should create compiled cache entry when compile succeeds', async () => {
    const expected = {}
    compileCssStub.resolves(expected)
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(await Functions.cache['/bar.css']).to.equal(expected)
  })
  it('should create compiled cache entry when compile fails', async () => {
    compileCssStub.rejects()
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(await Functions.cache['/bar.css']).to.equal(null)
  })
  it('should return false when access test fails', async () => {
    accessStub.rejects()
    const result = await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(result).to.equal(false)
  })
  it('should not try to compile when access test fails', async () => {
    accessStub.rejects()
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(compileCssStub.called).to.equal(false)
  })
  it('should not place a cache entry when access test fails', async () => {
    accessStub.rejects()
    await Functions.CompileAndCache('/foo', '/bar.scss')
    expect(Functions.cache['/bar.css']).to.equal(undefined)
  })
})
