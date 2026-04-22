'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { NextFunction, Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Cast } from '#testutils/TypeGuards'
import { createResponseFake } from '#testutils/Express'
import { handleErrors } from '#utils/Express'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/Express handleErrors', () => {
  let requestStub = {
    body: { Body: -1 },
    originalUrl: '/test',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let loggerStub = sandbox.stub()
  let loggerFake = Cast<Debugger>(loggerStub)

  beforeEach(() => {
    requestStub = {
      body: { Body: -1 },
      originalUrl: '/test',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    loggerStub = sandbox.stub()
    loggerFake = Cast<Debugger>(loggerStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call the action with request and response', async () => {
    const action = sandbox.stub().resolves()
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(action.callCount).to.equal(1)
  })
  it('should pass request as first argument to action', async () => {
    const action = sandbox.stub().resolves()
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(action.firstCall.args[0]).to.equal(requestFake)
  })
  it('should pass response as second argument to action', async () => {
    const action = sandbox.stub().resolves()
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(action.firstCall.args[1]).to.equal(responseFake)
  })
  it('should not call logger when action succeeds', async () => {
    const action = sandbox.stub().resolves()
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(loggerStub.callCount).to.equal(0)
  })
  it('should call response status with INTERNAL_SERVER_ERROR on error', async () => {
    const action = sandbox.stub().rejects(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
  })
  it('should set E_INTERNAL_ERROR json payload on error', async () => {
    const action = sandbox.stub().rejects(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(responseStub.json.firstCall.args).to.deep.equal([
      { error: { code: 'E_INTERNAL_ERROR', message: 'Internal Server Error' } },
    ])
  })
  it('should log two arguments on first log call on error', async () => {
    const action = sandbox.stub().rejects(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should log rendered url as first log argument on error', async () => {
    requestStub.originalUrl = '/test-path'
    const action = sandbox.stub().rejects(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /test-path')
  })
  it('should log request body as second log argument on error', async () => {
    const bodyData = { Body: Math.random() }
    requestStub.body = bodyData
    const action = sandbox.stub().rejects(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(loggerStub.firstCall.args[1]).to.equal(bodyData)
  })
  it('should log error object as last log argument on error', async () => {
    const err = new Error('test error')
    const action = sandbox.stub().rejects(err)
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
  it('should call logger twice on error', async () => {
    const action = sandbox.stub().rejects(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(loggerStub.callCount).to.equal(2)
  })
  it('should handle synchronous throws from action', async () => {
    const err = new Error('sync error')
    const action = sandbox.stub().throws(err)
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, Cast<NextFunction>(sandbox.stub()))
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
  })
})
