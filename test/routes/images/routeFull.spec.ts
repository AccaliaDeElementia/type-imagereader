'use sanity'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Internals, getRouter, ImageData, Imports } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

describe('routes/images route /full/*', () => {
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
    const [fn] = routerFake.get.mock.calls.filter((call) => call[0] === '/full/*path').map((call) => call[1] as unknown)
    router = cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = vi.spyOn(Internals, 'readImage').mockResolvedValue(cast<ImageData>(undefined))
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

  const testPaths = ['', 'foo/bar.png']
  testPaths.forEach((path) => {
    describe(`for path '${path}'`, () => {
      let img: ImageData = new ImageData()
      beforeEach(async () => {
        requestStub.params.path = path
        img = new ImageData()
        readImageStub.mockResolvedValue(img)
        await router(requestFake, responseFake)
      })
      it('should not generate error status call', () => {
        expect(responseStub.status.mock.calls.length).toBe(0)
      })
      it('should not generate error json call', () => {
        expect(responseStub.json.mock.calls.length).toBe(0)
      })
      it('should log invocation once', () => {
        expect(loggerStub.mock.calls.length).toBe(1)
      })
      it('should log invocation with GET-format', () => {
        expect(loggerStub.mock.calls[0]?.[0]).toBe('GET /images/full %s')
      })
      it('should log invocation with filename', () => {
        expect(loggerStub.mock.calls[0]?.[1]).toBe(`/${path}`)
      })
      it('should read image using readImage()', () => {
        expect(readImageStub.mock.calls.length).toBe(1)
      })
      it('should read image with filename', () => {
        expect(readImageStub.mock.calls[0]).toEqual([`/${path}`])
      })
      it('should send retrieved image with sendImage()', () => {
        expect(sendImageStub.mock.calls.length).toBe(1)
      })
      it('should send retrieved imageData', () => {
        expect(sendImageStub.mock.calls[0]).toEqual([img, responseFake])
      })
    })
  })
})
