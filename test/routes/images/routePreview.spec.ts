'use sanity'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Internals, getRouter, ImageData, Imports } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

describe('routes/images route /preview/*-image.webp', () => {
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
  let readImageStub: MockInstance = vi.fn()
  let rescaleImageStub: MockInstance = vi.fn()
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
      .filter((call) => call[0] === '/preview/*path-image.webp')
      .map((call) => call[1] as unknown)
    router = cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = vi.spyOn(Internals, 'readImage').mockResolvedValue(cast<ImageData>(undefined))
    rescaleImageStub = vi.spyOn(Internals, 'rescaleImage').mockResolvedValue(undefined)
    sendImageStub = vi.spyOn(Internals, 'sendImage').mockResolvedValue(undefined)
    requestStub = {
      params: { path: undefined },
      body: '',
      originalUrl: '',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterAll(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })

  const pathVariants: Array<[string, string | string[]]> = [
    ['by string', 'foo/bar.png'],
    ['by string array', ['foo', 'bar.png']],
  ]
  pathVariants.forEach(([label, pathValue]) => {
    describe(`when path is provided ${label}`, () => {
      let img: ImageData = new ImageData()
      beforeEach(async () => {
        img = new ImageData()
        readImageStub.mockResolvedValue(img)
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
        expect(loggerStub.mock.calls[0]?.[0]).toBe('GET /images/preview %s')
      })
      it('should log invocation with filename', () => {
        expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo/bar.png')
      })
      it('should read image', () => {
        expect(readImageStub.mock.calls.length).toBe(1)
      })
      it('should read image with provided filename', () => {
        expect(readImageStub.mock.calls[0]).toEqual(['/foo/bar.png'])
      })
      it('should rescale image', () => {
        expect(rescaleImageStub.mock.calls.length).toBe(1)
      })
      it('should rescale read ImageData', () => {
        expect(rescaleImageStub.mock.calls[0]?.[0]).toBe(img)
      })
      it('should rescale image to preview width', () => {
        expect(rescaleImageStub.mock.calls[0]?.[1]).toBe(240)
      })
      it('should rescale image to preview height', () => {
        expect(rescaleImageStub.mock.calls[0]?.[2]).toBe(320)
      })
      it('should rescale image without animation', () => {
        expect(rescaleImageStub.mock.calls[0]?.[3]).toBe(false)
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
