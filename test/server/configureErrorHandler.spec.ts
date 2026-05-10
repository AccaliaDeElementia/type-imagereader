'use sanity'

import { assert } from 'chai'
import type { Express, Response } from 'express'
import Sinon from 'sinon'
import { StatusCodes } from 'http-status-codes'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import { configureErrorHandler } from '#server.js'

const sandbox = Sinon.createSandbox()

describe('Server configureErrorHandler', () => {
  let appStub = { use: sandbox.stub() }
  let appFake = cast<Express>(appStub)
  let { stub: responseStub } = createResponseFake()
  beforeEach(() => {
    appStub = { use: sandbox.stub() }
    appFake = cast<Express>(appStub)
    ;({ stub: responseStub } = createResponseFake())
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should register exactly one handler', () => {
    configureErrorHandler(appFake)
    expect(appStub.use.callCount).toBe(1)
  })
  it('should register a function as the error handler', () => {
    configureErrorHandler(appFake)
    const fn = appStub.use.firstCall.args[0] as unknown
    assert.isFunction(fn)
  })
  const errorHandlerTests: Array<[string, () => void]> = [
    [
      'set status code once',
      () => {
        expect(responseStub.status.callCount).toBe(1)
      },
    ],
    [
      'set INTERNAL_SERVER_ERROR status code',
      () => {
        expect(responseStub.status.firstCall.args).toEqual([StatusCodes.INTERNAL_SERVER_ERROR])
      },
    ],
    [
      'send JSON message',
      () => {
        expect(responseStub.json.callCount).toBe(1)
      },
    ],
    [
      'send encoded JSON error',
      () => {
        expect(responseStub.json.firstCall.args).toEqual([{ error: 'FOO!' }])
      },
    ],
  ]
  errorHandlerTests.forEach(([title, validationFn]) => {
    it(`should ${title} when handling an error`, () => {
      configureErrorHandler(appFake)
      const fn = cast<(err: Error, _: unknown, res: Response, __: unknown) => void>(appStub.use.firstCall.args[0])
      const err = new Error('FOO!')
      fn(err, null, cast<Response>(responseStub), null)
      validationFn()
    })
  })
})
