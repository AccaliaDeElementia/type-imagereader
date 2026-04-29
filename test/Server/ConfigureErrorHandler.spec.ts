'use sanity'

import { assert, expect } from 'chai'
import type { Express, Response } from 'express'
import Sinon from 'sinon'
import { StatusCodes } from 'http-status-codes'
import { Cast } from '#testutils/TypeGuards'
import { createResponseFake } from '#testutils/Express'
import { Functions } from '#Server'

const sandbox = Sinon.createSandbox()

describe('Server function ConfigureErrorHandler', () => {
  let appStub = { use: sandbox.stub() }
  let appFake = Cast<Express>(appStub)
  let { stub: responseStub } = createResponseFake()
  beforeEach(() => {
    appStub = { use: sandbox.stub() }
    appFake = Cast<Express>(appStub)
    ;({ stub: responseStub } = createResponseFake())
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should register exactly one handler', () => {
    Functions.ConfigureErrorHandler(appFake)
    expect(appStub.use.callCount).to.equal(1)
  })
  it('should register a function as the error handler', () => {
    Functions.ConfigureErrorHandler(appFake)
    const fn = appStub.use.firstCall.args[0] as unknown
    assert.isFunction(fn)
  })
  const errorHandlerTests: Array<[string, () => void]> = [
    ['set status code once', () => expect(responseStub.status.callCount).to.equal(1)],
    [
      'set INTERNAL_SERVER_ERROR status code',
      () => expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR]),
    ],
    ['send JSON message', () => expect(responseStub.json.callCount).to.equal(1)],
    ['send encoded JSON error', () => expect(responseStub.json.firstCall.args).to.deep.equal([{ error: 'FOO!' }])],
  ]
  errorHandlerTests.forEach(([title, validationFn]) => {
    it(`should ${title} when handling an error`, () => {
      Functions.ConfigureErrorHandler(appFake)
      const fn = Cast<(err: Error, _: unknown, res: Response, __: unknown) => void>(appStub.use.firstCall.args[0])
      const err = new Error('FOO!')
      fn(err, null, Cast<Response>(responseStub), null)
      validationFn()
    })
  })
})
