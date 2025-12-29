'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/browserify-middleware'
import Sinon from 'sinon'
import { EventuallyRejects } from '../../testutils/Errors'

class ErrorWithCode extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}
describe('utils/browserify-middleware function CompileBundle()', () => {
  let accessStub = Sinon.stub()
  let minifyStub = Sinon.stub()
  let browserifyStub = Sinon.stub()
  const browser = {
    plugin: Sinon.stub(),
    transform: Sinon.stub(),
    add: Sinon.stub(),
    bundle: Sinon.stub(),
  }
  beforeEach(() => {
    accessStub = Sinon.stub(Imports, 'access').resolves()
    browser.plugin.reset()
    browser.transform.reset()
    browser.add.reset()
    browser.bundle.reset()
    browser.bundle.callsFake((fn: (a: unknown, b: unknown) => void) => {
      fn(null, Buffer.from('browserified', 'utf8'))
    })
    browserifyStub = Sinon.stub(Imports, 'browserify')
    browserifyStub.returns(browser)
    minifyStub = Sinon.stub(Imports, 'minify')
    minifyStub.callsFake(async (src: string) => await Promise.resolve({ code: src }))
  })
  afterEach(() => {
    minifyStub.restore()
    browserifyStub.restore()
    accessStub.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should add tsify plugin', async () => {
    expect(browser.plugin.calledWith('tsify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(browser.plugin.calledWith('tsify')).to.equal(true)
  })
  it('should add common-shakeify plugin', async () => {
    expect(browser.plugin.calledWith('common-shakeify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(browser.plugin.calledWith('common-shakeify')).to.equal(true)
  })
  it('should add common-shakeify configuration for ecma version 14', async () => {
    expect(browser.plugin.calledWith('common-shakeify')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(
      browser.plugin.calledWith('common-shakeify', {
        ecmaVersion: 14,
      }),
    ).to.equal(true)
  })
  it('should add brfs transform', async () => {
    expect(browser.transform.calledWith('brfs')).to.equal(false)
    await Functions.CompileBundle('/foo')
    expect(browser.transform.calledWith('brfs')).to.equal(true)
  })
  it('should add path to bundle', async () => {
    const expected = `/foo/${Math.random()}`
    await Functions.CompileBundle(expected)
    expect(browser.add.calledWith(expected)).to.equal(true)
  })
  it('should resolve to a string on success', async () => {
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal('browserified')
  })
  it('should reject when access rejects', async () => {
    accessStub.rejects()
    await Functions.CompileBundle('/foo').then(
      () => expect.fail('Function did not reject as expected!'),
      () => null,
    )
  })
  it('should reject on generic bundle error', async () => {
    browser.bundle.callsFake((fn: (a: unknown, b: unknown) => void) => {
      fn('ERROR!', null)
    })
    const rej = await EventuallyRejects(Functions.CompileBundle('/foo'))
    expect(rej.message).to.equal('Compile Error')
  })
  it('should resolve to null on MODULE_NOT_FOUND', async () => {
    browser.bundle.callsFake((fn: (a: unknown, b: unknown) => void) => {
      fn(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'), null)
    })
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  })
  it('should resolve to null on ENOENT', async () => {
    browser.bundle.callsFake((fn: (a: unknown, b: unknown) => void) => {
      fn(new ErrorWithCode('OOPS', 'ENOENT'), null)
    })
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  })
  it('should resolve to null when minify fails', async () => {
    minifyStub.callsFake(() => ({}))
    const result = await Functions.CompileBundle('/foo')
    expect(result).to.equal(null)
  })
})
