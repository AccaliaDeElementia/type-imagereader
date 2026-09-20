'use sanity'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Internals, getRouter, ImageData, Imports } from '#routes/images.js'
import type { ImageCache } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

interface CachedRouteCase {
  kind: string
  cache: () => ImageCache
  width: number
  height: number
}

const cachedRoutes: CachedRouteCase[] = [
  { kind: 'kiosk', cache: () => CacheStorage.kioskCache, width: 1280, height: 800 },
  { kind: 'original', cache: () => CacheStorage.originalCache, width: 0, height: 0 },
]

describe.each(cachedRoutes)(
  'routes/images route /$kind/*-image.webp',
  ({ kind, cache, width, height }: CachedRouteCase) => {
    const imageCachesAtLoad = { ...CacheStorage }
    afterAll(() => {
      Object.assign(CacheStorage, imageCachesAtLoad)
    })
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
      routerFake = {
        get: vi.fn().mockImplementation(function (this: object): unknown {
          return this
        }),
      }
      vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerFake))
      loggerStub = vi.spyOn(Imports, 'logger').mockReturnValue(undefined)
      vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<RequestHandler>(action))
      await getRouter(cast<Application>({}), cast<Server>({}), cast<WebSocketServer>({}))
      const [fn] = routerFake.get.mock.calls
        .filter((call) => call[0] === `/${kind}/*path-image.webp`)
        .map((call) => call[1] as unknown)
      router = cast<(req: Request, res: Response) => Promise<void>>(fn)
      fetchImageStub = vi.spyOn(cache(), 'fetch').mockResolvedValue(cast<ImageData>(undefined))
      sendImageStub = vi.spyOn(Internals, 'sendImage').mockResolvedValue(undefined)
      requestStub = {
        params: { path: undefined },
        body: '',
        originalUrl: '',
      }
      requestFake = cast<Request>(requestStub)
      ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    })

    const pathVariants: Array<[string, string | string[]]> = [
      ['by string', `${kind}/image.png`],
      ['by string array', [kind, 'image.png']],
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
          expect(loggerStub.mock.calls[0]?.[0]).toBe(`GET /images/${kind} %s`)
        })
        it('should log invocation with filename', () => {
          expect(loggerStub.mock.calls[0]?.[1]).toBe(`/${kind}/image.png`)
        })
        it('should fetch image from cache', () => {
          expect(fetchImageStub.mock.calls.length).toBe(1)
        })
        it('should fetch image filename from cache', () => {
          expect(fetchImageStub.mock.calls[0]?.[0]).toBe(`/${kind}/image.png`)
        })
        it(`should fetch the image at width ${width}`, () => {
          expect(fetchImageStub.mock.calls[0]?.[1]).toBe(width)
        })
        it(`should fetch the image at height ${height}`, () => {
          expect(fetchImageStub.mock.calls[0]?.[2]).toBe(height)
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
  },
)
