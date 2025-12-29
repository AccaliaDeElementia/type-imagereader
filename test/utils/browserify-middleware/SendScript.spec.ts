'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/browserify-middleware'
import Sinon from 'sinon'

import { StatusCodes } from 'http-status-codes'
import type { Response } from 'express'
import { Cast } from '../../testutils/TypeGuards'
class ErrorWithCode extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}
describe('utils/browserify-middleware function SendScript()', () => {
  const stubResponse = {
    status: Sinon.stub().returnsThis(),
    render: Sinon.stub().returnsThis(),
    contentType: Sinon.stub().returnsThis(),
    send: Sinon.stub().returnsThis(),
  }

  const fakeResponse = Cast<Response>(stubResponse)
  let compileAndCacheStub = Sinon.stub()

  beforeEach(() => {
    stubResponse.status.reset()
    stubResponse.status.returnsThis()
    stubResponse.render.reset()
    stubResponse.render.returnsThis()
    stubResponse.contentType.reset()
    stubResponse.contentType.returnsThis()
    stubResponse.send.reset()
    stubResponse.send.returnsThis()
    compileAndCacheStub = Sinon.stub(Functions, 'CompileAndCache').resolves()
    Functions.browserified = {}
  })
  afterEach(() => {
    compileAndCacheStub.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should set status OK on precompiled script', async () => {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
  })
  it('should set content-type on precompiled script', async () => {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.contentType.calledWith('application/javascript')).to.equal(true)
  })
  it('should send script on precompiled script', async () => {
    Functions.browserified['/foo'] = Promise.resolve('test script')
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.send.calledWith('test script')).to.equal(true)
  })
  it('should set status OK on fresh compiled script', async () => {
    compileAndCacheStub.callsFake(async (_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return await Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
  })
  it('should set content-type on fresh compiled script', async () => {
    compileAndCacheStub.callsFake(async (_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return await Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.contentType.calledWith('application/javascript')).to.equal(true)
  })
  it('should send script on fresh compiled script', async () => {
    compileAndCacheStub.callsFake(async (_, path: string) => {
      Functions.browserified[path] = Promise.resolve('test script')
      return await Functions.browserified[path]
    })
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.send.calledWith('test script')).to.equal(true)
  })
  it('should set NOT_FOUND response when script compiles to null', async () => {
    Functions.browserified['/foo'] = Promise.resolve(null)
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      stubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  })
  it('should set NOT_FOUND response when script compiles to empty', async () => {
    Functions.browserified['/foo'] = Promise.resolve('')
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      stubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  })
  it('should set NOT_FOUND response when script rejects as MODULE_NOT_FOUND', async () => {
    Functions.browserified['/foo'] = Promise.reject(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      stubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  })
  it('should set NOT_FOUND response when script rejects as ENOENT', async () => {
    Functions.browserified['/foo'] = Promise.reject(new ErrorWithCode('OOPS', 'ENOENT'))
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(
      stubResponse.render.calledWith('error', {
        message: 'Not Found: /foo',
      }),
    ).to.equal(true)
  })
  it('should set INTERNAL_SERVER_ERROR response when script rejects non Error', async () => {
    Functions.browserified['/foo'] = Promise.reject(Cast<Error>('SOMETHING BAD'))
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(
      stubResponse.render.calledWith('error', {
        message: 'INTERNAL SERVER ERROR',
      }),
    ).to.equal(true)
  })
  it('should set INTERNAL_SERVER_ERROR response when script rejects', async () => {
    const err = new Error('OOPS')
    Functions.browserified['/foo'] = Promise.reject(err)
    await Functions.SendScript('/root', '/foo', fakeResponse)
    expect(stubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(stubResponse.render.calledWith('error', err)).to.equal(true)
  })
})
