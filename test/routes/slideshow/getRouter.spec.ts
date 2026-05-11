'use sanity'

import Sinon from 'sinon'
import type { Request, Response, Application, Router } from 'express'
import type { Socket, Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { Config, Internals, getRouter, Imports } from '#routes/slideshow.js'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow getRouter', () => {
  let routerStub = { get: sandbox.stub() }
  let knexFake = stubToKnex({})
  sandbox.stub().resolves(knexFake)
  let rootRouteStub = sandbox.stub()
  let handleSocketStub = sandbox.stub()
  let setIntervalStub = sandbox.stub()
  let tickCountdownStub = sandbox.stub()
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let ioStub = {
    on: sandbox.stub(),
  }
  let socketsFake = cast<WebSocketServer>(ioStub)
  let requestFake = cast<Request>({})
  let responseStub = { json: sandbox.stub() }
  let responseFake = cast<Response>(responseStub)
  beforeEach(() => {
    sandbox.useFakeTimers({ now: 3141592 })
    routerStub = { get: sandbox.stub() }
    sandbox.stub(Imports, 'Router').returns(cast<Router>(routerStub))
    knexFake = stubToKnex({})
    sandbox.stub(Imports, 'initialize').resolves(knexFake)
    rootRouteStub = sandbox.stub(Internals, 'rootRoute').resolves()
    handleSocketStub = sandbox.stub(Internals, 'handleSocket')
    setIntervalStub = sandbox.stub(global, 'setInterval')
    tickCountdownStub = sandbox.stub(Internals, 'tickCountdown').resolves()
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    ioStub = {
      on: sandbox.stub(),
    }
    socketsFake = cast<WebSocketServer>(ioStub)
    Config.launchId = -1
    requestFake = cast<Request>({})
    responseStub = { json: sandbox.stub() }
    responseFake = cast<Response>(responseStub)
  })
  afterEach(() => {
    sandbox.restore()
  })

  const routes = ['/launchId', '/', '/*path']
  const getArgs = (stub: Sinon.SinonStub): unknown[] => stub.firstCall.args
  const invokeRouteHandler = (path: string): void => {
    const fn = cast<(req: Request, res: Response) => void>(
      routerStub.get.getCalls().find((call) => call.args[0] === path)?.args[1],
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
      expect(routerStub.get.callCount).toBe(routes.length)
    })
    routes.forEach((route) => {
      it(`should register get handler for route '${route}'`, () => {
        expect(routerStub.get.calledWith(route)).toBe(true)
      })
    })

    describe('GET /launchId handler', () => {
      beforeEach(() => {
        invokeRouteHandler('/launchId')
      })
      it('should respond with json', () => {
        expect(responseStub.json.callCount).toBe(1)
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
        expect(rootRouteStub.callCount).toBe(1)
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
        expect(ioStub.on.callCount).toBe(1)
      })
      it('should listen to new websocket connections', () => {
        expect(ioStub.on.firstCall.args[0]).toBe('connection')
      })

      describe('on connection', () => {
        let socket = cast<Socket>({})
        beforeEach(() => {
          socket = cast<Socket>({})
          cast<(s: Socket) => void>(ioStub.on.firstCall.args[1])(socket)
        })
        it('should handle socket', () => {
          expect(handleSocketStub.callCount).toBe(1)
        })
        it('should handle socket with knex', () => {
          expect(handleSocketStub.firstCall.args[0]).toBe(knexFake)
        })
        it('should handle socket with socket.io server', () => {
          expect(handleSocketStub.firstCall.args[1]).toBe(socketsFake)
        })
        it('should handle socket with socket', () => {
          expect(handleSocketStub.firstCall.args[2]).toBe(socket)
        })
      })
    })

    describe('periodic processing interval', () => {
      it('should set interval', () => {
        expect(setIntervalStub.callCount).toBe(1)
      })
      it('should set interval with a function callback', () => {
        const callback = setIntervalStub.firstCall.args[0] as unknown
        expect(callback).toBeTypeOf('function')
      })
      it('should set interval of expected length (1000ms)', () => {
        expect(setIntervalStub.firstCall.args[1]).toBe(1000)
      })

      describe('when interval fires', () => {
        beforeEach(async () => {
          const callback = cast<() => Promise<void>>(setIntervalStub.firstCall.args[0])
          await callback()
        })
        it('should process tickCountdown', () => {
          expect(tickCountdownStub.callCount).toBe(1)
        })
        it('should process tickCountdown with knex', () => {
          expect(tickCountdownStub.firstCall.args[0]).toBe(knexFake)
        })
        it('should process tickCountdown with websocket server', () => {
          expect(tickCountdownStub.firstCall.args[1]).toBe(socketsFake)
        })
      })
    })
  })
})
