'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { Functions, Imports } from '../../../utils/sass-middleware'
import { Cast } from '../../testutils/TypeGuards'
import { EventuallyRejects } from '../../testutils/Errors'

describe('utils/sass-middleware function CompileCss()', () => {
  let compileAsyncStub = Sinon.stub()
  let loggingStub = Sinon.stub()
  beforeEach(() => {
    compileAsyncStub = Sinon.stub(Imports.sass, 'compileAsync').resolves({
      css: '',
      loadedUrls: [],
    })
    loggingStub = Sinon.stub(Functions, 'logger')
  })
  afterEach(() => {
    compileAsyncStub.restore()
    loggingStub.restore()
  })
  it('should log start of processing', async () => {
    await Functions.CompileCss('/foo', '/bar.css')
    expect(loggingStub.calledWith('Begin compiling /bar.css')).to.equal(true)
  })
  it('should compile using sass', async () => {
    await Functions.CompileCss('/foo', '/bar.css')
    expect(
      compileAsyncStub.calledWith('/foo/bar.css', {
        style: 'compressed',
        sourceMap: true,
      }),
    ).to.equal(true)
  })
  it('should log completion of processing', async () => {
    await Functions.CompileCss('/foo', '/bar.css')
    expect(loggingStub.calledWith('/bar.css compiled successfully')).to.equal(true)
  })
  it('should return the compiled css', async () => {
    compileAsyncStub.resolves({
      css: 'THIS IS MY CSS',
      loadedUrls: [],
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.css).to.equal('THIS IS MY CSS')
  })
  it('should return the sourceMap with default version', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.version).to.equal(0)
  })
  it('should return the sourceMap with calculated version', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        version: '42',
      },
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.version).to.equal(42)
  })
  it('should return the sourceMap with NaN for invalid version', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        version: 'qq',
      },
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(isNaN(result.map.version)).to.equal(true)
  })
  it('should return the sourceMap with filename', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {},
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.file).to.equal('/bar.css')
  })
  it('should return the sourceMap with default names array', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {},
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.names).to.deep.equal([])
  })
  it('should return the sourceMap with sourceMap Names', async () => {
    const names = ['foo', 'bar', 'baz']
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        names,
      },
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.names).to.equal(names)
  })
  it('should return the sourceMap with default sources array', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {},
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.sources).to.deep.equal([])
  })
  it('should return the sourceMap with sources array', async () => {
    const sources = ['foo', 'bar', 'baz']
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        sources,
      },
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.sources).to.equal(sources)
  })
  it('should return the sourceMap with default mappings', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {},
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.mappings).to.equal('')
  })
  it('should return the sourceMap with mappings', async () => {
    compileAsyncStub.resolves({
      css: '',
      loadedUrls: [],
      sourceMap: {
        mappings: 'SOME MAPPINGS',
      },
    })
    const result = await Functions.CompileCss('/foo', '/bar.css')
    expect(result.map.mappings).to.equal('SOME MAPPINGS')
  })
  it('should log error message when non Error is thrown', async () => {
    compileAsyncStub.callsFake(() => {
      throw Cast<Error>('SOMETHING BAD')
    })
    await Functions.CompileCss('/foo', '/bar.css').catch(() => 0)
    expect(loggingStub.calledWith('Error Compiling /bar.css:')).to.equal(true)
  })
  it('should log error message when non Error is rejected', async () => {
    compileAsyncStub.rejects('SOMETHING BAD')
    await Functions.CompileCss('/foo', '/bar.css').catch(() => 0)
    expect(loggingStub.calledWith('Error Compiling /bar.css:')).to.equal(true)
  })
  it('should log error message when Error is thrown', async () => {
    const err = new Error('SOMETHING BAD')
    compileAsyncStub.rejects(err)
    await Functions.CompileCss('/foo', '/bar.css').catch(() => 0)
    expect(loggingStub.calledWith('Error Compiling /bar.css:', err)).to.equal(true)
  })
  it('should throw generic error when non Error is thrown', async () => {
    compileAsyncStub.callsFake(() => {
      throw Cast<Error>('SOMETHING BAD')
    })
    const err = await EventuallyRejects(Functions.CompileCss('/foo', '/bar.css'))
    expect(`${err}`).to.equal('Error: Unexpected Error Encountered Compiling CSS')
  })
  it('should rethrow error when non Error is rejected', async () => {
    compileAsyncStub.rejects('SOMETHING BAD')
    const err = await EventuallyRejects(Functions.CompileCss('/foo', '/bar.css'))
    expect(`${err}`).to.equal('SOMETHING BAD')
  })
  it('should rethrow error when Error is thrown', async () => {
    const expected = new Error('SOMETHING BAD')
    compileAsyncStub.rejects(expected)
    const err = await EventuallyRejects(Functions.CompileCss('/foo', '/bar.css'))
    expect(err).to.equal(expected)
  })
})
