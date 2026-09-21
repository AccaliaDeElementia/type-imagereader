'use sanity'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Internals, getRouter, ImageData, Imports } from '#routes/images.js'
import { UNBOUNDED } from '#contracts/scaledImage.js'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

interface ReqParams {
  path: string | string[] | undefined
  width?: unknown
  height?: unknown
}

interface Req {
  params: ReqParams
  body: string
  originalUrl: string
}

describe('routes/images route /scaled/:width/:height/*-image.webp', () => {
  const imageCachesAtLoad = { ...CacheStorage }
  afterAll(() => {
    Object.assign(CacheStorage, imageCachesAtLoad)
  })
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let websocketsFake = cast<WebSocketServer>({})
  let requestStub: Req = {
    params: {
      path: undefined,
      width: 0,
      height: 0,
    },
    body: '',
    originalUrl: '',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routerFake = {
    get: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
  }
  let loggerStub: MockInstance = vi.fn()
  let router = cast<(req: Request, res: Response) => Promise<void>>(vi.fn())
  let fetchImageStub: MockInstance = vi.fn()
  let sendImageStub: MockInstance = vi.fn()
  beforeEach(async () => {
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    websocketsFake = cast<WebSocketServer>({})
    routerFake = {
      get: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
    }
    vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerFake))
    loggerStub = vi.spyOn(Imports, 'logger').mockReturnValue(undefined)
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<RequestHandler>(action))
    await getRouter(applicationFake, serverFake, websocketsFake)
    const [fn] = routerFake.get.mock.calls
      .filter((call) => call[0] === '/scaled/:width/:height/*path-image.webp')
      .map((call) => call[1] as unknown)
    router = cast<(req: Request, res: Response) => Promise<void>>(fn)
    fetchImageStub = vi.spyOn(CacheStorage.scaledCache, 'fetch').mockResolvedValue(cast<ImageData>(undefined))
    sendImageStub = vi.spyOn(Internals, 'sendImage').mockResolvedValue(undefined)
    requestStub = {
      params: { path: undefined },
      body: '',
      originalUrl: '',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })

  describe('on successful response', () => {
    let img: ImageData = new ImageData()
    beforeEach(async () => {
      img = new ImageData()
      fetchImageStub.mockResolvedValue(img)
      requestStub.params = { path: 'full/image/test.png', width: '123', height: '456' }
      await router(requestFake, responseFake)
    })
    it('should not set response status', () => {
      expect(responseStub.status.mock.calls.length).toBe(0)
    })
    it('should not send json data response', () => {
      expect(responseStub.json.mock.calls.length).toBe(0)
    })
    it('should log invocation once', () => {
      expect(loggerStub.mock.calls.length).toBe(1)
    })
    it('should log invocation with GET-format', () => {
      expect(loggerStub.mock.calls[0]?.[0]).toBe('GET /images/scaled %dx%d %s')
    })
    it('should log invocation with width arg', () => {
      expect(loggerStub.mock.calls[0]?.[1]).toBe(123)
    })
    it('should log invocation with height arg', () => {
      expect(loggerStub.mock.calls[0]?.[2]).toBe(456)
    })
    it('should log invocation with filename arg', () => {
      expect(loggerStub.mock.calls[0]?.[3]).toBe('/full/image/test.png')
    })
    it('should call fetch on the cache', () => {
      expect(fetchImageStub.mock.calls.length).toBe(1)
    })
    it('should fetch with expected path', () => {
      expect(fetchImageStub.mock.calls[0]?.[0]).toBe('/full/image/test.png')
    })
    it('should fetch with expected width', () => {
      expect(fetchImageStub.mock.calls[0]?.[1]).toBe(123)
    })
    it('should fetch with expected height', () => {
      expect(fetchImageStub.mock.calls[0]?.[2]).toBe(456)
    })
    it('should send image with sendImage()', () => {
      expect(sendImageStub.mock.calls.length).toBe(1)
    })
    it('should send image data with sendImage()', () => {
      expect(sendImageStub.mock.calls[0]?.[0]).toBe(img)
    })
    it('should send to response with sendImage()', () => {
      expect(sendImageStub.mock.calls[0]?.[1]).toBe(responseFake)
    })
  })

  describe.each([
    ['width', { path: 'full/image/test.png', width: 'auto', height: '456' }, UNBOUNDED, 456],
    ['height', { path: 'full/image/test.png', width: '123', height: 'auto' }, 123, UNBOUNDED],
  ])('when %s is auto', (_axis, params, expectedWidth, expectedHeight) => {
    beforeEach(async () => {
      fetchImageStub.mockResolvedValue(new ImageData())
      requestStub.params = params
      await router(requestFake, responseFake)
    })
    it('should fetch with the bounded dimension', () => {
      expect(fetchImageStub.mock.calls[0]?.[1]).toBe(expectedWidth)
    })
    it('should fetch with the unbounded dimension', () => {
      expect(fetchImageStub.mock.calls[0]?.[2]).toBe(expectedHeight)
    })
    it('should send the image', () => {
      expect(sendImageStub.mock.calls.length).toBe(1)
    })
  })

  describe('when both dimensions are auto', () => {
    beforeEach(async () => {
      requestStub.params = { path: 'full/image/test.png', width: 'auto', height: 'auto' }
      await router(requestFake, responseFake)
    })
    it('should not fetch image', () => {
      expect(fetchImageStub.mock.calls.length).toBe(0)
    })
    it('should send BAD_REQUEST status code', () => {
      expect(responseStub.status.mock.calls[0]).toEqual([400])
    })
    it('should name /images/original as the route for an unbounded image', () => {
      expect(responseStub.json.mock.calls[0]).toEqual([
        {
          error: {
            code: 'E_BAD_REQUEST',
            message: 'at least one of width and height must be bounded; use /images/original for neither',
          },
        },
      ])
    })
  })

  const eWidthMissing = 'width parameter must be provided'
  const eWidthBad = 'width parameter must be a positive integer or auto'
  const eHeightMissing = 'height parameter must be provided'
  const eHeightBad = 'height parameter must be a positive integer or auto'
  const validationErrors: Array<[string, ReqParams, string]> = [
    ['missing width', { path: '', height: '10' }, eWidthMissing],
    ['null width', { path: '', width: null, height: '10' }, eWidthBad],
    ['undefined width', { path: '', width: undefined, height: '10' }, eWidthMissing],
    ['blank width', { path: '', width: '', height: '10' }, eWidthBad],
    ['non number width', { path: '', width: 'foo', height: '10' }, eWidthBad],
    ['leading zeros width', { path: '', width: '0100', height: '10' }, eWidthBad],
    ['decimal width', { path: '', width: '3.14159', height: '10' }, eWidthBad],
    ['negative width', { path: '', width: '-100', height: '10' }, eWidthBad],
    ['explicit positive width', { path: '', width: '+100', height: '10' }, eWidthBad],
    ['zero width', { path: '', width: '0', height: '10' }, eWidthBad],
    ['missing height', { path: '', width: '10' }, eHeightMissing],
    ['null height', { path: '', height: null, width: '10' }, eHeightBad],
    ['undefined height', { path: '', height: undefined, width: '10' }, eHeightMissing],
    ['blank height', { path: '', height: '', width: '10' }, eHeightBad],
    ['non number height', { path: '', height: 'foo', width: '10' }, eHeightBad],
    ['leading zeros height', { path: '', height: '0100', width: '10' }, eHeightBad],
    ['decimal height', { path: '', height: '3.14159', width: '10' }, eHeightBad],
    ['zero height', { path: '', height: '0', width: '10' }, eHeightBad],
    ['negative height', { path: '', height: '-100', width: '10' }, eHeightBad],
    ['explicit positive height', { path: '', height: '+100', width: '10' }, eHeightBad],
  ]
  validationErrors.forEach(([conditionTitle, params, message]) => {
    describe(`when ${conditionTitle}`, () => {
      beforeEach(async () => {
        requestStub.params = params
        requestStub.params.path = 'foo/bar/baz.txt'
        requestStub.originalUrl = '/full/image.png'
        requestStub.body = 'REQUEST BODY'
        await router(requestFake, responseFake)
      })
      it('should respond BAD_REQUEST exactly once', () => {
        expect(responseStub.status.mock.calls).toEqual([[400]])
      })
      it(`should report '${message}' as the json error`, () => {
        expect(responseStub.json.mock.calls).toEqual([[{ error: { code: 'E_BAD_REQUEST', message } }]])
      })
      it('should return before doing any work', () => {
        expect({
          fetched: fetchImageStub.mock.calls.length,
          sent: sendImageStub.mock.calls.length,
          logged: loggerStub.mock.calls.length,
        }).toEqual({ fetched: 0, sent: 0, logged: 0 })
      })
    })
  })
})
