'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import type { Application, Router, Request, Response } from 'express'
import type { Server } from 'http'
import type { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'
import persistance from '../../utils/persistance'

import { isReqWithBodyData, getRouter, Imports, ReadBody } from '../../routes/api'
import { Functions, ModCount } from '../../routes/apiFunctions'

import assert from 'assert'
import type { Debugger } from 'debug'
import { Cast, ForceCastTo, StubToKnex, StubToRequestHandler } from '../testutils/TypeGuards'

@suite
export class ApiIsbodyDataTests {
  @test
  'it should reject null object'(): void {
    const obj = null
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject undefined object'(): void {
    const obj = undefined
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject non object object'(): void {
    const obj = 42
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject null object body'(): void {
    const obj = {
      body: null,
    }
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject undefined object body'(): void {
    const obj = {
      body: undefined,
    }
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject missing object body'(): void {
    const obj = {}
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject null object path'(): void {
    const obj = {
      body: {
        path: null,
      },
    }
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject undefined object path'(): void {
    const obj = {
      body: {
        path: undefined,
      },
    }
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject missing object path'(): void {
    const obj = {
      body: {},
    }
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject non string object path'(): void {
    const obj = {
      body: {
        path: {},
      },
    }
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should reject non number modCount'(): void {
    const obj = {
      body: {
        path: '',
        modCount: {},
      },
    }
    expect(isReqWithBodyData(obj)).to.equal(false)
  }

  @test
  'it should accept minimum object'(): void {
    const obj = {
      body: {
        path: '',
      },
    }
    expect(isReqWithBodyData(obj)).to.equal(true)
  }

  @test
  'it should accept full object'(): void {
    const obj = {
      body: {
        modCount: 0,
        path: '',
      },
    }
    expect(isReqWithBodyData(obj)).to.equal(true)
  }
}

@suite
export class ApiReadBodyTests {
  @test
  'it should return body when successful parse'(): void {
    const obj = {
      body: {
        path: 'this is my path',
        rand: Math.random(),
      },
    }
    expect(ReadBody(obj)).to.equal(obj.body)
  }

  @test
  'it should throw when body does not parse'(): void {
    try {
      ReadBody({})
      expect.fail('should not have succeeded in function call')
    } catch (e: unknown) {
      if (!(e instanceof Error)) expect.fail('non error should not have been thrown')
      expect(e.message).to.equal('Invalid JSON Object provided as input')
    }
  }
}

@suite
export class ApiGetRouterTests {
  ApplicationFake = ForceCastTo<Application>({ App: Math.random() })
  ServerFake = ForceCastTo<Server>({ Server: Math.random() })
  SocketServerFake = ForceCastTo<WebSocketServer>({ Sockets: Math.random() })
  InitializeStub?: Sinon.SinonStub

  RouterStub = {
    get: sinon.stub(),
    post: sinon.stub(),
  }

  MakeRouterStub?: Sinon.SinonStub

  before(): void {
    this.InitializeStub = sinon.stub(persistance, 'initialize').resolves()
    this.MakeRouterStub = sinon.stub(Imports, 'Router').returns(ForceCastTo<Router>(this.RouterStub))
  }

  after(): void {
    this.InitializeStub?.restore()
    this.MakeRouterStub?.restore()
  }

  @test
  async 'it should resolve to created router'(): Promise<void> {
    const result = await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(result).to.equal(this.RouterStub)
  }

  @test
  async 'it should attach handler for get `/`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/healthcheck`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/listing/*`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/listing/*')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/listing`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/listing')).to.equal(true)
  }

  @test
  async 'it should use same handler for `/listing/` and `/listing/*`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    const fn1 = this.RouterStub.get.getCalls().find((call) => call.args[0] === '/listing')?.args[1] as unknown
    const fn2 = this.RouterStub.get.getCalls().find((call) => call.args[0] === '/listing/*')?.args[1] as unknown
    assert(fn1 !== undefined)
    assert(fn2 !== undefined)
    expect(fn1).to.equal(fn2)
  }

  @test
  async 'it should attach handler for post `/navigate/latest`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/navigate/latest')).to.equal(true)
  }

  @test
  async 'it should attach handler for post `/mark/read`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/mark/read')).to.equal(true)
  }

  @test
  async 'it should attach handler for post `/mark/unread`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/mark/unread')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/bookmarks/*`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/bookmarks/*')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/bookmarks/`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/bookmarks')).to.equal(true)
  }

  @test
  async 'it should use same handler for `/bookmarks/` and `/bookmarks/*`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    const fn1 = this.RouterStub.get.getCalls().find((call) => call.args[0] === '/bookmarks')?.args[1] as unknown
    const fn2 = this.RouterStub.get.getCalls().find((call) => call.args[0] === '/bookmarks/*')?.args[1] as unknown
    assert(fn1 !== undefined)
    assert(fn2 !== undefined)
    expect(fn1).to.equal(fn2)
  }

  @test
  async 'it should attach handler for post `/bookmarks/add`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/bookmarks/add')).to.equal(true)
  }

  @test
  async 'it should attach handler for post `/bookmarks/remove`'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/bookmarks/remove')).to.equal(true)
  }
}

type RequestHandler = (req: Request, res: Response) => Promise<void>

@suite
export class ApiGetRootRouteTests {
  RequestStub = {
    body: { Body: -1 },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  async before(): Promise<void> {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves()
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        get: getFn,
        post: sinon.stub(),
      }),
    )

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    this.RouteHandler = ForceCastTo<RequestHandler>(getFn.getCalls().find((call) => call.args[0] === '/')?.args[1])

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should return JSON data'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{ title: 'API' }])
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(2)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    const bodyData = { Body: Math.random() }
    this.RequestStub.body = bodyData
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(bodyData)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiGetHealthcheckRouteTests {
  RequestStub = {
    body: { Body: -1 },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  async before(): Promise<void> {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves()
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        get: getFn,
        post: sinon.stub(),
      }),
    )

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    this.RouteHandler = ForceCastTo<RequestHandler>(
      getFn.getCalls().find((call) => call.args[0] === '/healthcheck')?.args[1],
    )

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should return `OK`'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['OK'])
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(2)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    const bodyData = { Body: Math.random() }
    this.RequestStub.body = bodyData
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(bodyData)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiGetListingRouteTests {
  GetListingStub?: Sinon.SinonStub

  RequestStub = {
    params: [] as string[],
    body: { Body: -1 },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before(): Promise<void> {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(StubToKnex(this.KnexFake))
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        get: getFn,
        post: sinon.stub(),
      }),
    )
    this.GetListingStub = sinon.stub(Functions, 'GetListing').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    this.RouteHandler = ForceCastTo<RequestHandler>(
      getFn.getCalls().find((call) => call.args[0] === '/listing')?.args[1],
    )

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
    this.GetListingStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    this.GetListingStub?.resolves({})
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should json send listing response'(): Promise<void> {
    const listing = { listing: Math.random() }
    this.GetListingStub?.resolves(listing)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.equal(listing)
  }

  @test
  async 'it should call GetListingStub with Knex from initialize'(): Promise<void> {
    this.RequestStub.params = []
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[0]).to.equal(this.KnexFake)
  }

  @test
  async 'it should call GetListingStub to retrieve implicit root listing'(): Promise<void> {
    this.RequestStub.params = []
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[1]).to.equal('/')
  }

  @test
  async 'it should call GetListingStub to retrieve empty path listing'(): Promise<void> {
    this.RequestStub.params = ['']
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[1]).to.equal('/')
  }

  @test
  async 'it should call GetListingStub to retrieve explicit root listing'(): Promise<void> {
    this.RequestStub.params = ['/']
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[1]).to.equal('/')
  }

  @test
  async 'it should call GetListingStub to retrieve web path listing'(): Promise<void> {
    this.RequestStub.params = ['foo/a bar/baz']
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt'(): Promise<void> {
    this.RequestStub.params = ['/foo/../bar/']
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt'(): Promise<void> {
    this.RequestStub.params = ['/foo/../bar/']
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt'(): Promise<void> {
    this.RequestStub.params = ['/foo/../bar/']
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/',
      },
    }
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should return status NOT_FOUND for missing folder'(): Promise<void> {
    this.GetListingStub?.resolves(null)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.NOT_FOUND])
  }

  @test
  async 'it should json error for missing folder'(): Promise<void> {
    const err = {
      error: {
        code: 'E_NOT_FOUND',
        message: 'Directory Not Found!',
        path: '/',
      },
    }
    this.GetListingStub?.resolves(null)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.GetListingStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.GetListingStub?.rejects(err)
    const bodyData = { Body: Math.random() }
    this.RequestStub.body = bodyData
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(bodyData)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.GetListingStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiNavigateLatestRouteTests {
  SetLatestPictureStub?: Sinon.SinonStub
  ValidateModcountStub?: Sinon.SinonStub
  IncrementModcountStub?: Sinon.SinonStub
  GetModcountStub?: Sinon.SinonStub

  RequestStub = {
    body: {
      modCount: 0,
      path: '/image.png',
    },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before(): Promise<void> {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(StubToKnex(this.KnexFake))
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        post: postFn,
        get: sinon.stub(),
      }),
    )
    this.SetLatestPictureStub = sinon.stub(Functions, 'SetLatestPicture').resolves()
    this.ValidateModcountStub = sinon.stub(ModCount, 'Validate').returns(true)
    this.IncrementModcountStub = sinon.stub(ModCount, 'Increment').returns(1)
    this.GetModcountStub = sinon.stub(ModCount, 'Get').returns(69)

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    this.RouteHandler = ForceCastTo<RequestHandler>(
      postFn.getCalls().find((call) => call.args[0] === '/navigate/latest')?.args[1],
    )

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
    this.SetLatestPictureStub?.restore()
    this.ValidateModcountStub?.restore()
    this.IncrementModcountStub?.restore()
    this.GetModcountStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should accept missing modcount and handle as invalid modcount'(): Promise<void> {
    this.ValidateModcountStub?.returns(false)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['-1'])
  }

  @test
  async 'it should return new modcount when validate passes'(): Promise<void> {
    this.ValidateModcountStub?.returns(true)
    this.IncrementModcountStub?.returns(5050)
    const req = ForceCastTo<Request>({
      body: {
        path: '/image.png',
      },
      originalUrl: '/',
    })
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(req, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['5050'])
  }

  @test
  async 'it should return Status OK when validate is bypassed'(): Promise<void> {
    this.RequestStub.body.modCount = -1
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should return invalid modcount when validate is bypassed'(): Promise<void> {
    this.RequestStub.body.modCount = -1
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['-1'])
  }

  @test
  async 'it should call SetLatestPicture when validate is bypassed'(): Promise<void> {
    this.ValidateModcountStub?.returns(false)
    this.RequestStub.body.modCount = -1
    this.RequestStub.body.path = 'foo/bar/a%20image.png'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(1)
    expect(this.SetLatestPictureStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SetLatestPictureStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.SetLatestPictureStub?.firstCall.args[1]).to.equal('/foo/bar/a image.png')
  }

  @test
  async 'it should ignore modcount when validate is bypassed'(): Promise<void> {
    this.RequestStub.body.modCount = -1
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ValidateModcountStub?.callCount).to.equal(0)
    expect(this.GetModcountStub?.callCount).to.equal(0)
    expect(this.IncrementModcountStub?.callCount).to.equal(0)
  }

  @test
  async 'it should call SetLatestPicture when validate passes'(): Promise<void> {
    this.ValidateModcountStub?.returns(true)
    this.RequestStub.body.path = 'foo/bar/a%20image.png'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(1)
    expect(this.SetLatestPictureStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SetLatestPictureStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.SetLatestPictureStub?.firstCall.args[1]).to.equal('/foo/bar/a image.png')
  }

  @test
  async 'it should set status BAD_REQUEST when validate fails'(): Promise<void> {
    this.ValidateModcountStub?.returns(false)
    this.GetModcountStub?.returns(69_420)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
  }

  @test
  async 'it should return invalid when validate fails'(): Promise<void> {
    this.ValidateModcountStub?.returns(false)
    this.GetModcountStub?.returns(69_420)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['-1'])
  }

  @test
  async 'it should not call SetLatestPicture when validate fails'(): Promise<void> {
    this.ValidateModcountStub?.returns(false)
    this.RequestStub.body.path = 'foo/bar/a%20image.png'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(0)
  }

  @test
  async 'it should not retrieve listing directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/',
      },
    }
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.SetLatestPictureStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.SetLatestPictureStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.SetLatestPictureStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiMarkReadRouteTests {
  MarkFolderReadStub?: Sinon.SinonStub

  RequestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before(): Promise<void> {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(StubToKnex(this.KnexFake))
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        post: postFn,
        get: sinon.stub(),
      }),
    )
    this.MarkFolderReadStub = sinon.stub(Functions, 'MarkFolderRead').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    this.RouteHandler = ForceCastTo<RequestHandler>(
      postFn.getCalls().find((call) => call.args[0] === '/mark/read')?.args[1],
    )

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
    this.MarkFolderReadStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead'(): Promise<void> {
    this.RequestStub.body.path = 'foo/a%20bar/baz'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderReadStub?.callCount).to.equal(1)
    expect(this.MarkFolderReadStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.MarkFolderReadStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.MarkFolderReadStub?.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderReadStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/',
      },
    }
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.MarkFolderReadStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.MarkFolderReadStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.MarkFolderReadStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiMarkUnreadRouteTests {
  MarkFolderUnreadStub?: Sinon.SinonStub

  RequestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before(): Promise<void> {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(StubToKnex(this.KnexFake))
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        post: postFn,
        get: sinon.stub(),
      }),
    )
    this.MarkFolderUnreadStub = sinon.stub(Functions, 'MarkFolderUnread').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    const fn = postFn.getCalls().find((call) => call.args[0] === '/mark/unread')?.args[1] as unknown
    this.RouteHandler = Cast(fn, (fn): fn is RequestHandler => typeof fn === 'function')

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
    this.MarkFolderUnreadStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead'(): Promise<void> {
    this.RequestStub.body.path = 'foo/a%20bar/baz'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderUnreadStub?.callCount).to.equal(1)
    expect(this.MarkFolderUnreadStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.MarkFolderUnreadStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.MarkFolderUnreadStub?.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderUnreadStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/',
      },
    }
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.MarkFolderUnreadStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.MarkFolderUnreadStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.MarkFolderUnreadStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiGetBookmarksRouteTests {
  GetBookmarkStub?: Sinon.SinonStub

  RequestStub = {
    body: {},
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before(): Promise<void> {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(StubToKnex(this.KnexFake))
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        get: getFn,
        post: sinon.stub(),
      }),
    )
    this.GetBookmarkStub = sinon.stub(Functions, 'GetBookmarks').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    const fn = getFn.getCalls().find((call) => call.args[0] === '/bookmarks')?.args[1] as unknown
    this.RouteHandler = Cast(fn, (fn): fn is RequestHandler => typeof fn === 'function')

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
    this.GetBookmarkStub?.restore()
  }

  @test
  async 'it should return bookmarks'(): Promise<void> {
    const bookmarks = { Bookmarks: Math.random() }
    this.GetBookmarkStub?.resolves(bookmarks)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.equal(bookmarks)
  }

  @test
  async 'it should call GetBookmarks'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetBookmarkStub?.callCount).to.equal(1)
    expect(this.GetBookmarkStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.GetBookmarkStub?.firstCall.args[0]).to.equal(this.KnexFake)
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.GetBookmarkStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.GetBookmarkStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.GetBookmarkStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiAddBookmarkRouteTests {
  AddBookmarkStub?: Sinon.SinonStub

  RequestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before(): Promise<void> {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(StubToKnex(this.KnexFake))
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        post: postFn,
        get: sinon.stub(),
      }),
    )
    this.AddBookmarkStub = sinon.stub(Functions, 'AddBookmark').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    const fn = postFn.getCalls().find((call) => call.args[0] === '/bookmarks/add')?.args[1] as unknown
    this.RouteHandler = ForceCastTo<RequestHandler>(fn)

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
    this.AddBookmarkStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead'(): Promise<void> {
    this.RequestStub.body.path = 'foo/a%20bar/baz.gif'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.AddBookmarkStub?.callCount).to.equal(1)
    expect(this.AddBookmarkStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.AddBookmarkStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.AddBookmarkStub?.firstCall.args[1]).to.equal('/foo/a bar/baz.gif')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.AddBookmarkStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar.gif'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar.gif',
      },
    }
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.AddBookmarkStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.AddBookmarkStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.AddBookmarkStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiRemoveBookmarkRouteTests {
  RemoveBookmarkStub?: Sinon.SinonStub

  RequestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }

  RequestFake = ForceCastTo<Request>(this.RequestStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
  }

  ResponseFake = ForceCastTo<Response>(this.ResponseStub)

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before(): Promise<void> {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(StubToKnex(this.KnexFake))
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns(
      ForceCastTo<Router>({
        post: postFn,
        get: sinon.stub(),
      }),
    )
    this.RemoveBookmarkStub = sinon.stub(Functions, 'RemoveBookmark').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(ForceCastTo<Debugger>(this.LoggerStub))

    await getRouter(ForceCastTo<Application>(null), ForceCastTo<Server>(null), ForceCastTo<WebSocketServer>(null))

    const fn = postFn.getCalls().find((call) => call.args[0] === '/bookmarks/remove')?.args[1] as unknown
    this.RouteHandler = StubToRequestHandler(fn)

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after(): void {
    this.DebuggerStub?.restore()
    this.RemoveBookmarkStub?.restore()
  }

  @test
  async 'it should return status OK'(): Promise<void> {
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead'(): Promise<void> {
    this.RequestStub.body.path = 'foo/a%20bar/baz.gif'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.RemoveBookmarkStub?.callCount).to.equal(1)
    expect(this.RemoveBookmarkStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.RemoveBookmarkStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.RemoveBookmarkStub?.firstCall.args[1]).to.equal('/foo/a bar/baz.gif')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.RemoveBookmarkStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt'(): Promise<void> {
    this.RequestStub.body.path = '/foo/../bar.gif'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar.gif',
      },
    }
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.RemoveBookmarkStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  }

  @test
  async 'it should log message on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.RemoveBookmarkStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error'(): Promise<void> {
    const err = new Error('Evil Error!')
    this.RemoveBookmarkStub?.rejects(err)
    assert(this.RouteHandler !== undefined)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}
