'use sanity'

import type { Request, Response, Application, Router } from 'express'
import type { Socket, Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { Config, Internals, getRouter, Imports } from '#routes/slideshow.js'
import type { MockInstance } from 'vitest'

describe('routes/slideshow getRouter', () => {
  let routerStub = { get: vi.fn() }
  let knexFake = stubToKnex({})
  vi.fn().mockResolvedValue(knexFake)
  let rootRouteStub: MockInstance = vi.fn()
  let handleSocketStub: MockInstance = vi.fn()
  let setIntervalStub: MockInstance = vi.fn()
  let tickCountdownStub: MockInstance = vi.fn()
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let ioStub = {
    on: vi.fn(),
  }
  let socketsFake = cast<WebSocketServer>(ioStub)
  let requestFake = cast<Request>({})
  let responseStub = { json: vi.fn() }
  let responseFake = cast<Response>(responseStub)
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(3141592)
    routerStub = { get: vi.fn() }
    vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerStub))
    knexFake = stubToKnex({})
    vi.spyOn(Imports, 'initialize').mockResolvedValue(knexFake)
    rootRouteStub = vi.spyOn(Internals, 'rootRoute').mockResolvedValue(undefined)
    handleSocketStub = vi.spyOn(Internals, 'handleSocket').mockReturnValue(cast(undefined))
    setIntervalStub = vi.spyOn(global, 'setInterval').mockReturnValue(cast(undefined))
    tickCountdownStub = vi.spyOn(Internals, 'tickCountdown').mockResolvedValue(undefined)
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    ioStub = {
      on: vi.fn(),
    }
    socketsFake = cast<WebSocketServer>(ioStub)
    Config.launchId = -1
    requestFake = cast<Request>({})
    responseStub = { json: vi.fn() }
    responseFake = cast<Response>(responseStub)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const routes = ['/launchId', '/', '/*path']
  const getArgs = (stub: MockInstance): unknown[] => stub.mock.calls[0] ?? []
  const invokeRouteHandler = (path: string): void => {
    const fn = cast<(req: Request, res: Response) => void>(
      routerStub.get.mock.calls.find((call) => call[0] === path)?.[1],
    )
    fn(requestFake, responseFake)
  }

  describe('when getRouter() runs', () => {
    beforeEach(async () => {
      await getRouter(applicationFake, serverFake, socketsFake)
    })

    it('should set launch Id to current time', () => {
      expect(Config.launchId).toBe(3141592)
    })
    it('should register correct route count', () => {
      expect(routerStub.get.mock.calls.length).toBe(routes.length)
    })
    routes.forEach((route) => {
      it(`should register get handler for route '${route}'`, () => {
        expect(routerStub.get).toHaveBeenCalledWith(route, expect.anything())
      })
    })

    describe('GET /launchId handler', () => {
      beforeEach(() => {
        invokeRouteHandler('/launchId')
      })
      it('should respond with json', () => {
        expect(responseStub.json.mock.calls.length).toBe(1)
      })
      it('should respond with obj', () => {
        expect(getArgs(responseStub.json)[0]).toBeInstanceOf(Object)
      })
      it('should respond with keys', () => {
        expect(Object.keys(cast<object>(getArgs(responseStub.json)[0]))).toEqual(['launchId'])
      })
      it('should send launchId', () => {
        expect(getArgs(responseStub.json)[0]).toEqual({ launchId: 3141592 })
      })
    })

    describe('GET / handler', () => {
      beforeEach(() => {
        invokeRouteHandler('/')
      })
      it('should call rootRoute', () => {
        expect(rootRouteStub.mock.calls.length).toBe(1)
      })
      it('should call rootRoute with knex', () => {
        expect(getArgs(rootRouteStub)[0]).toBe(knexFake)
      })
      it('should call rootRoute with request', () => {
        expect(getArgs(rootRouteStub)[1]).toBe(requestFake)
      })
      it('should call rootRoute with response', () => {
        expect(getArgs(rootRouteStub)[2]).toBe(responseFake)
      })
    })

    describe('GET /*path handler', () => {
      beforeEach(() => {
        invokeRouteHandler('/*path')
      })
      it('should call rootRoute with knex', () => {
        expect(getArgs(rootRouteStub)[0]).toBe(knexFake)
      })
      it('should call rootRoute with request', () => {
        expect(getArgs(rootRouteStub)[1]).toBe(requestFake)
      })
      it('should call rootRoute with response', () => {
        expect(getArgs(rootRouteStub)[2]).toBe(responseFake)
      })
    })

    describe('socket.io', () => {
      it('should listen to socketIo events', () => {
        expect(ioStub.on.mock.calls.length).toBe(1)
      })
      it('should listen to new websocket connections', () => {
        expect(ioStub.on.mock.calls[0]?.[0]).toBe('connection')
      })

      describe('on connection', () => {
        let socket = cast<Socket>({})
        beforeEach(() => {
          socket = cast<Socket>({})
          cast<(s: Socket) => void>(ioStub.on.mock.calls[0]?.[1])(socket)
        })
        it('should handle socket', () => {
          expect(handleSocketStub.mock.calls.length).toBe(1)
        })
        it('should handle socket with knex', () => {
          expect(handleSocketStub.mock.calls[0]?.[0]).toBe(knexFake)
        })
        it('should handle socket with socket.io server', () => {
          expect(handleSocketStub.mock.calls[0]?.[1]).toBe(socketsFake)
        })
        it('should handle socket with socket', () => {
          expect(handleSocketStub.mock.calls[0]?.[2]).toBe(socket)
        })
      })
    })

    describe('periodic processing interval', () => {
      it('should set interval', () => {
        expect(setIntervalStub.mock.calls.length).toBe(1)
      })
      it('should set interval with a function callback', () => {
        const callback = setIntervalStub.mock.calls[0]?.[0] as unknown
        expect(callback).toBeTypeOf('function')
      })
      it('should set interval of expected length (1000ms)', () => {
        expect(setIntervalStub.mock.calls[0]?.[1]).toBe(1000)
      })

      describe('when interval fires', () => {
        beforeEach(async () => {
          const callback = cast<() => Promise<void>>(setIntervalStub.mock.calls[0]?.[0])
          await callback()
        })
        it('should process tickCountdown', () => {
          expect(tickCountdownStub.mock.calls.length).toBe(1)
        })
        it('should process tickCountdown with knex', () => {
          expect(tickCountdownStub.mock.calls[0]?.[0]).toBe(knexFake)
        })
        it('should process tickCountdown with websocket server', () => {
          expect(tickCountdownStub.mock.calls[0]?.[1]).toBe(socketsFake)
        })
      })
    })
  })
})
