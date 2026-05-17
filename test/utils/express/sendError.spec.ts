'use sanity'

import { StatusCodes } from 'http-status-codes'
import { sendError } from '#utils/express.js'
import { createResponseFake } from '#testutils/express.js'

describe('utils/express sendError', () => {
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  beforeEach(() => {
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })

  describe('without path', () => {
    beforeEach(() => {
      sendError(responseFake, { code: 'E_TEST', statusCode: StatusCodes.BAD_REQUEST, message: 'something failed' })
    })
    it('should call status once', () => {
      expect(responseStub.status.mock.calls.length).toBe(1)
    })
    it('should set the provided status code', () => {
      expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.BAD_REQUEST])
    })
    it('should call json once', () => {
      expect(responseStub.json.mock.calls.length).toBe(1)
    })
    it('should send the error payload without a path field', () => {
      expect(responseStub.json.mock.calls[0]?.[0]).toEqual({
        error: { code: 'E_TEST', message: 'something failed' },
      })
    })
  })

  describe('with path', () => {
    beforeEach(() => {
      sendError(responseFake, {
        code: 'E_TEST',
        statusCode: StatusCodes.NOT_FOUND,
        message: 'no such thing',
        path: '/foo/bar',
      })
    })
    it('should set the provided status code', () => {
      expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.NOT_FOUND])
    })
    it('should send the error payload including the path field', () => {
      expect(responseStub.json.mock.calls[0]?.[0]).toEqual({
        error: { code: 'E_TEST', message: 'no such thing', path: '/foo/bar' },
      })
    })
  })
})
