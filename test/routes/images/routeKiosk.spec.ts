'use sanity'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Internals, getRouter, ImageData, Imports } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

describe('routes/images route /kiosk/*-image.webp', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let websocketsFake = cast<WebSocketServer>({})
  let requestStub = {
    params: { path: undefined as string | string[] | undefined },
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
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<RequestHandler>(action))
    await getRouter(applicationFake, serverFake, websocketsFake)
    const [fn] = routerFake.get.mock.calls
      .filter((call) => call[0] === '/kiosk/*path-image.webp')
      .map((call) => call[1] as unknown)
    router = cast<(req: Request, res: Response) => Promise<void>>(fn)
    fetchImageStub = vi.spyOn(CacheStorage.kioskCache, 'fetch').mockResolvedValue(cast<ImageData>(undefined))
    sendImageStub = vi.spyOn(Internals, 'sendImage').mockResolvedValue(undefined)
    requestStub = {
      params: { path: undefined },
      body: '',
      originalUrl: '',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })

  const pathVariants: Array<[string, string | string[]]> = [
    ['by string', 'kiosk/image.png'],
    ['by string array', ['kiosk', 'image.png']],
  ]
  pathVariants.forEach(([label, pathValue]) => {
    describe(`when path is provided ${label}`, () => {
      let img: ImageData = new ImageData()
      beforeEach(async () => {
        img = new ImageData()
        fetchImageStub.mockResolvedValue(img)
        requestStub.params.path = pathValue
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
        expect(loggerStub.mock.calls[0]?.[0]).toBe('GET /images/kiosk %s')
      })
      it('should log invocation with filename', () => {
        expect(loggerStub.mock.calls[0]?.[1]).toBe('/kiosk/image.png')
      })
      it('should fetch image from cache', () => {
        expect(fetchImageStub.mock.calls.length).toBe(1)
      })
      it('should fetch image filename from cache', () => {
        expect(fetchImageStub.mock.calls[0]?.[0]).toBe('/kiosk/image.png')
      })
      it('should rescale image to preview width', () => {
        expect(fetchImageStub.mock.calls[0]?.[1]).toBe(1280)
      })
      it('should rescale image to preview height', () => {
        expect(fetchImageStub.mock.calls[0]?.[2]).toBe(800)
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
  })
})
