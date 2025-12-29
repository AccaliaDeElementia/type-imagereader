'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { Functions, Imports } from '../../../utils/sass-middleware'

describe('utils/sass-middleware function CompileFolder()', () => {
  let readdirStub = Sinon.stub()
  let compileAndCacheStub = Sinon.stub()
  beforeEach(() => {
    readdirStub = Sinon.stub(Imports, 'readdir').resolves([])
    compileAndCacheStub = Sinon.stub(Functions, 'CompileAndCache').resolves(undefined)
  })
  afterEach(() => {
    readdirStub.restore()
    compileAndCacheStub.restore()
  })
  it('should handle empty directory gracefully', async () => {
    await Functions.CompileFolder('/foo', '/bar')
    expect(compileAndCacheStub.called).to.equal(false)
  })
  it('should ignore non saas file', async () => {
    readdirStub.resolves([{ name: 'styles.css' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(compileAndCacheStub.called).to.equal(false)
  })
  it('should ignore dotfiles', async () => {
    readdirStub.resolves([{ name: '.styles.scss' }, { name: '/.styles.scss' }, { name: '/.baz/styles.scss' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(compileAndCacheStub.called).to.equal(false)
  })
  it('should compile sass files', async () => {
    readdirStub.resolves([{ name: 'styles.sass' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(compileAndCacheStub.calledWith('/foo', '/bar/styles.sass')).to.equal(true)
  })
  it('should compile scss files', async () => {
    readdirStub.resolves([{ name: 'styles.scss' }])
    await Functions.CompileFolder('/foo', '/bar')
    expect(compileAndCacheStub.calledWith('/foo', '/bar/styles.scss')).to.equal(true)
  })
  it('should tolerate CompileAndCache rejecting', async () => {
    const awaiter = Promise.resolve(true)
    const rejecter = async (): Promise<boolean> => await Promise.reject(new Error('FOO'))
    compileAndCacheStub.callsFake(async () => await awaiter.then(rejecter))
    readdirStub.resolves([{ name: 'styles.scss' }, { name: 'styles2.scss' }])
    await Functions.CompileFolder('/foo', '/bar')
    await awaiter
    expect(compileAndCacheStub.callCount).to.equal(2)
  })
})
