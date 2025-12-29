'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/browserify-middleware'
import Sinon from 'sinon'

describe('utils/browserify-middleware function GetSystemPath()', () => {
  let accessStub = Sinon.stub()
  beforeEach(() => {
    accessStub = Sinon.stub(Imports, 'access').resolves()
  })
  afterEach(() => {
    accessStub.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('accepts leading slashes', async () => {
    await Functions.GetSystemPath('/foo', '/bar')
    expect(accessStub.calledWith('/foo/bar.js')).to.equal(true)
  })
  it('tests acccess to path + .js', async () => {
    await Functions.GetSystemPath('/foo', 'bar')
    expect(accessStub.calledWith('/foo/bar.js')).to.equal(true)
  })
  it('tests acccess to path + .ts', async () => {
    await Functions.GetSystemPath('/foo', 'bar')
    expect(accessStub.calledWith('/foo/bar.ts')).to.equal(true)
  })
  it('tests acccess to path', async () => {
    await Functions.GetSystemPath('/foo', 'bar')
    expect(accessStub.calledWith('/foo/bar')).to.equal(true)
  })
  it('resolves to null if no file matches', async () => {
    accessStub.rejects('ERROR!')
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal(null)
  })
  it('resolves to .js if if all file matches', async () => {
    accessStub.callsFake(async (_: string) => {
      await Promise.resolve()
    })
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar.js')
  })
  it('resolves to .ts if no .js matches', async () => {
    accessStub.callsFake(async (path: string) => {
      ;/\.js$/i.test(path) ? await Promise.reject(new Error('ERROR')) : await Promise.resolve()
    })
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar.ts')
  })
  it('resolves to path if no .js/.ts matches', async () => {
    accessStub.callsFake(async (path: string) => {
      ;/\.[jt]s$/.test(path) ? await Promise.reject(new Error('ERROR')) : await Promise.resolve()
    })
    const result = await Functions.GetSystemPath('/foo', 'bar')
    expect(result).to.equal('/foo/bar')
  })
})
