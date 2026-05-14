'use sanity'

import type { NextFunction, Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import { handleErrors } from '#utils/express.js'
import { createLoggerFake } from '#testutils/debug.js'

describe('utils/Express handleErrors', () => {
  let requestStub = {
    body: { Body: -1 },
    originalUrl: '/test',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()

  beforeEach(() => {
    requestStub = {
      body: { Body: -1 },
      originalUrl: '/test',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call the action with request and response', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(action.mock.calls.length).toBe(1)
  })
  it('should pass request as first argument to action', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(action.mock.calls[0]?.[0]).toBe(requestFake)
  })
  it('should pass response as second argument to action', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(action.mock.calls[0]?.[1]).toBe(responseFake)
  })
  it('should not call logger when action succeeds', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(loggerStub.mock.calls.length).toBe(0)
  })
  it('should call response status with INTERNAL_SERVER_ERROR on error', async () => {
    const action = vi.fn().mockRejectedValue(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.INTERNAL_SERVER_ERROR])
  })
  it('should set E_INTERNAL_ERROR json payload on error', async () => {
    const action = vi.fn().mockRejectedValue(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(responseStub.json.mock.calls[0]).toEqual([
      { error: { code: 'E_INTERNAL_ERROR', message: 'Internal Server Error' } },
    ])
  })
  it('should log two arguments on first log call on error', async () => {
    const action = vi.fn().mockRejectedValue(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(loggerStub.mock.calls[0]).toHaveLength(2)
  })
  it('should log rendered url as first log argument on error', async () => {
    requestStub.originalUrl = '/test-path'
    const action = vi.fn().mockRejectedValue(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(loggerStub.mock.calls[0]?.[0]).toBe('Error rendering: /test-path')
  })
  it('should log request body as second log argument on error', async () => {
    const bodyData = { Body: Math.random() }
    requestStub.body = bodyData
    const action = vi.fn().mockRejectedValue(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(loggerStub.mock.calls[0]?.[1]).toBe(bodyData)
  })
  it('should log error object as last log argument on error', async () => {
    const err = new Error('test error')
    const action = vi.fn().mockRejectedValue(err)
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(loggerStub.mock.lastCall?.[0]).toBe(err)
  })
  it('should call logger twice on error', async () => {
    const action = vi.fn().mockRejectedValue(new Error('test error'))
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(loggerStub.mock.calls.length).toBe(2)
  })
  it('should handle synchronous throws from action', async () => {
    const err = new Error('sync error')
    const action = vi.fn().mockImplementation(() => {
      throw err
    })
    const handler = handleErrors(loggerFake, action)
    await handler(requestFake, responseFake, cast<NextFunction>(vi.fn()))
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.INTERNAL_SERVER_ERROR])
  })
})
