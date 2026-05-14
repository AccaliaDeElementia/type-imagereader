'use sanity'

import type { Express, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import { configureErrorHandler } from '#server.js'

describe('Server configureErrorHandler', () => {
  let appStub = { use: vi.fn() }
  let appFake = cast<Express>(appStub)
  let { stub: responseStub } = createResponseFake()
  beforeEach(() => {
    appStub = { use: vi.fn() }
    appFake = cast<Express>(appStub)
    ;({ stub: responseStub } = createResponseFake())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should register exactly one handler', () => {
    configureErrorHandler(appFake)
    expect(appStub.use.mock.calls.length).toBe(1)
  })
  it('should register a function as the error handler', () => {
    configureErrorHandler(appFake)
    const fn = appStub.use.mock.calls[0]?.[0] as unknown
    expect(fn).toBeTypeOf('function')
  })
  const errorHandlerTests: Array<[string, () => void]> = [
    [
      'set status code once',
      () => {
        expect(responseStub.status.mock.calls.length).toBe(1)
      },
    ],
    [
      'set INTERNAL_SERVER_ERROR status code',
      () => {
        expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.INTERNAL_SERVER_ERROR])
      },
    ],
    [
      'send JSON message',
      () => {
        expect(responseStub.json.mock.calls.length).toBe(1)
      },
    ],
    [
      'send encoded JSON error',
      () => {
        expect(responseStub.json.mock.calls[0]).toEqual([{ error: 'FOO!' }])
      },
    ],
  ]
  errorHandlerTests.forEach(([title, validationFn]) => {
    it(`should ${title} when handling an error`, () => {
      configureErrorHandler(appFake)
      const fn = cast<(err: Error, _: unknown, res: Response, __: unknown) => void>(appStub.use.mock.calls[0]?.[0])
      const err = new Error('FOO!')
      fn(err, null, cast<Response>(responseStub), null)
      validationFn()
    })
  })
})
