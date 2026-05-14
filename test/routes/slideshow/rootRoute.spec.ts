'use sanity'

import type { Request } from 'express'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { rootRoute, Internals, Imports, type SlideshowRoom } from '#routes/slideshow.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

describe('routes/slideshow rootRoute', () => {
  let reqStub = {
    params: { path: undefined as string | undefined },
  }
  let { stub: resStub, fake: responseFake } = createResponseFake()
  let requestFake = cast<Request>(reqStub)
  let knexFake = stubToKnex({})
  let roomData = { images: [''], uriSafeImage: '' }
  let getRoomStub = vi.fn().mockResolvedValue(undefined)
  let isPathTraversalStub: MockInstance = vi.fn()
  let noImages = [] as string[]
  let fullImages = ['1', '2', '3', '4', '5', '6', '7', '8']
  let getRoomError = new Error('Error Fetching Room!')
  beforeEach(() => {
    reqStub = {
      params: { path: undefined },
    }
    ;({ stub: resStub, fake: responseFake } = createResponseFake())
    requestFake = cast<Request>(reqStub)
    knexFake = stubToKnex({})
    noImages = []
    fullImages = ['1', '2', '3', '4', '5', '6', '7', '8']
    roomData = { images: noImages, uriSafeImage: '/foo/bar/baz.png' }
    getRoomStub = vi.spyOn(Internals, 'getRoomAndIncrementImage').mockResolvedValue(cast<SlideshowRoom>(roomData))
    isPathTraversalStub = vi.spyOn(Imports, 'isPathTraversal').mockReturnValue(false)
    getRoomError = new Error('Error Fetching Room!')
  })
  const eTraverse = {
    title: 'ERROR',
    code: 'E_NO_TRAVERSE',
    message: 'Directory Traversal is not Allowed!',
  }
  const eNotFound = {
    title: 'ERROR',
    code: 'E_NOT_FOUND',
    message: 'Not Found',
  }
  const eGeneric = {
    title: 'ERROR',
    code: 'INTERNAL_SERVER_ERROR',
    message: getRoomError,
  }
  const getArgs = (stub: MockInstance): unknown[] => stub.mock.calls[0] ?? []

  describe('when isPathTraversal returns true', () => {
    beforeEach(async () => {
      isPathTraversalStub.mockReturnValue(true)
      await rootRoute(knexFake, requestFake, responseFake)
    })
    it('should return FORBIDDEN status', () => {
      expect(getArgs(resStub.status)[0]).toBe(403)
    })
    it('should render error template', () => {
      expect(getArgs(resStub.render)[0]).toBe('error')
    })
    it('should render E_NO_TRAVERSE error data', () => {
      expect(getArgs(resStub.render)[1]).toEqual(eTraverse)
    })
    it('should not get room', () => {
      expect(getRoomStub.mock.calls.length).toBe(0)
    })
  })

  describe('with undefined path', () => {
    beforeEach(async () => {
      roomData.images = fullImages
      getRoomStub.mockResolvedValue(roomData)
      await rootRoute(knexFake, requestFake, responseFake)
    })
    it('should get room', () => {
      expect(getRoomStub.mock.calls.length).toBe(1)
    })
  })

  describe('with valid path and full images', () => {
    beforeEach(async () => {
      reqStub.params.path = 'foo'
      roomData.images = fullImages
      getRoomStub.mockResolvedValue(roomData)
      await rootRoute(knexFake, requestFake, responseFake)
    })
    it('should get room', () => {
      expect(getRoomStub.mock.calls.length).toBe(1)
    })
    it('should not set success status', () => {
      expect(resStub.status.mock.calls.length).toBe(0)
    })
    it('should render', () => {
      expect(resStub.render.mock.calls.length).toBe(1)
    })
    it('should render slideshow template', () => {
      expect(getArgs(resStub.render)[0]).toBe('slideshow')
    })
    it('should render slideshow data', () => {
      const successData = {
        title: '/foo',
        folder: '/foo',
        image: roomData.uriSafeImage,
      }
      expect(getArgs(resStub.render)[1]).toEqual(successData)
    })
  })

  describe('with valid path and empty images', () => {
    beforeEach(async () => {
      reqStub.params.path = 'foo'
      roomData.images = noImages
      getRoomStub.mockResolvedValue(roomData)
      await rootRoute(knexFake, requestFake, responseFake)
    })
    it('should set not-found status', () => {
      expect(resStub.status.mock.calls.length).toBe(1)
    })
    it('should set 404 status code', () => {
      expect(getArgs(resStub.status)[0]).toBe(404)
    })
    it('should render error template', () => {
      expect(getArgs(resStub.render)[0]).toEqual('error')
    })
    it('should render not-found error data', () => {
      expect(getArgs(resStub.render)[1]).toEqual(eNotFound)
    })
  })

  describe('when getRoom rejects', () => {
    beforeEach(async () => {
      reqStub.params.path = 'foo'
      getRoomStub.mockRejectedValue(getRoomError)
      await rootRoute(knexFake, requestFake, responseFake)
    })
    it('should set server error status', () => {
      expect(resStub.status.mock.calls.length).toBe(1)
    })
    it('should set 500 status code', () => {
      expect(getArgs(resStub.status)[0]).toBe(500)
    })
    it('should render', () => {
      expect(resStub.render.mock.calls.length).toBe(1)
    })
    it('should render error template', () => {
      expect(getArgs(resStub.render)[0]).toBe('error')
    })
    it('should render server-error data', () => {
      expect(getArgs(resStub.render)[1]).toEqual(eGeneric)
    })
  })

  describe('logging', () => {
    let loggerStub: MockInstance = vi.fn()
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    })

    it('should log GET-format on rootRoute invocation', async () => {
      reqStub.params.path = 'foo'
      roomData.images = fullImages
      getRoomStub.mockResolvedValue(roomData)
      await rootRoute(knexFake, requestFake, responseFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('GET /slideshow %s')
    })

    it('should log the folder path on rootRoute invocation', async () => {
      reqStub.params.path = 'foo'
      roomData.images = fullImages
      getRoomStub.mockResolvedValue(roomData)
      await rootRoute(knexFake, requestFake, responseFake)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo')
    })

    it('should log path-traversal-blocked when isPathTraversal returns true', async () => {
      isPathTraversalStub.mockReturnValue(true)
      reqStub.params.path = 'evil'
      await rootRoute(knexFake, requestFake, responseFake)
      const hasTraversalLog = loggerStub.mock.calls.some((c) => c[0] === 'path traversal blocked: %s')
      expect(hasTraversalLog).toBe(true)
    })

    it('should log slideshow-folder-empty when room has no images', async () => {
      reqStub.params.path = 'foo'
      roomData.images = noImages
      getRoomStub.mockResolvedValue(roomData)
      await rootRoute(knexFake, requestFake, responseFake)
      const hasEmptyLog = loggerStub.mock.calls.some((c) => c[0] === 'slideshow folder empty: %s')
      expect(hasEmptyLog).toBe(true)
    })

    it('should log slideshow-render-error when getRoomAndIncrementImage rejects', async () => {
      reqStub.params.path = 'foo'
      getRoomStub.mockRejectedValue(getRoomError)
      await rootRoute(knexFake, requestFake, responseFake)
      const hasRenderErrorLog = loggerStub.mock.calls.some((c) => c[0] === 'slideshow render error: %s')
      expect(hasRenderErrorLog).toBe(true)
    })

    it('should log a string fallback when getRoomAndIncrementImage rejects with a non-Error', async () => {
      reqStub.params.path = 'foo'
      getRoomStub.mockRejectedValue(cast<Error>({ toString: () => 'rejection-token' }))
      await rootRoute(knexFake, requestFake, responseFake)
      const renderErrorCall = loggerStub.mock.calls.find((c) => c[0] === 'slideshow render error: %s')
      expect(renderErrorCall?.[1]).toBe('rejection-token')
    })
  })
})
