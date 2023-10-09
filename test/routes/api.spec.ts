'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Application, Router, Request, Response } from 'express'
import { Server } from 'http'
import { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'
import persistance from '../../utils/persistance'

import { getRouter, Imports } from '../../routes/api'
import { Functions, ModCount } from '../../routes/apiFunctions'

import assert from 'assert'
import { Debugger } from 'debug'
import { Knex } from 'knex'

@suite
export class ApiGetRouterTests {
  ApplicationFake = { App: Math.random() } as unknown as Application
  ServerFake = { Server: Math.random() } as unknown as Server
  SocketServerFake = { Sockets: Math.random() } as unknown as WebSocketServer
  InitializeStub?: Sinon.SinonStub

  RouterStub = {
    get: sinon.stub(),
    post: sinon.stub()
  }

  MakeRouterStub?: Sinon.SinonStub

  before () {
    this.InitializeStub = sinon.stub(persistance, 'initialize').resolves()
    this.MakeRouterStub = sinon.stub(Imports, 'Router').returns(this.RouterStub as unknown as Router)
  }

  after () {
    this.InitializeStub?.restore()
    this.MakeRouterStub?.restore()
  }

  @test
  async 'it should resolve to created router' () {
    const result = await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(result).to.equal(this.RouterStub)
  }

  @test
  async 'it should attach handler for get `/`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/healthcheck`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/listing/*`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/listing/*')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/listing`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/listing')).to.equal(true)
  }

  @test
  async 'it should use same handler for `/listing/` and `/listing/*`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    const fn1 = this.RouterStub.get.getCalls().filter(call => call.args[0] === '/listing')[0]?.args[1]
    const fn2 = this.RouterStub.get.getCalls().filter(call => call.args[0] === '/listing/*')[0]?.args[1]
    assert(fn1)
    assert(fn2)
    expect(fn1).to.equal(fn2)
  }

  @test
  async 'it should attach handler for post `/navigate/latest`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/navigate/latest')).to.equal(true)
  }

  @test
  async 'it should attach handler for post `/mark/read`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/mark/read')).to.equal(true)
  }

  @test
  async 'it should attach handler for post `/mark/unread`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/mark/unread')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/bookmarks/*`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/bookmarks/*')).to.equal(true)
  }

  @test
  async 'it should attach handler for get `/bookmarks/`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.get.calledWith('/bookmarks')).to.equal(true)
  }

  @test
  async 'it should use same handler for `/bookmarks/` and `/bookmarks/*`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    const fn1 = this.RouterStub.get.getCalls().filter(call => call.args[0] === '/bookmarks')[0]?.args[1]
    const fn2 = this.RouterStub.get.getCalls().filter(call => call.args[0] === '/bookmarks/*')[0]?.args[1]
    assert(fn1)
    assert(fn2)
    expect(fn1).to.equal(fn2)
  }

  @test
  async 'it should attach handler for post `/bookmarks/add`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/bookmarks/add')).to.equal(true)
  }

  @test
  async 'it should attach handler for post `/bookmarks/remove`' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.SocketServerFake)
    expect(this.RouterStub.post.calledWith('/bookmarks/remove')).to.equal(true)
  }
}

type RequestHandler = (req: Request, res: Response) => Promise<void>

@suite
export class ApiGetRootRouteTests {
  RequestStub = {
    body: '' as any,
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  async before () {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves()
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      get: getFn,
      post: sinon.stub()
    } as unknown as Router)

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = getFn.getCalls().filter(call => call.args[0] === '/')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should return JSON data' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{ title: 'API' }])
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(2)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    const bodyData = { Body: Math.random() }
    this.RequestStub.body = bodyData
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(bodyData)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}

@suite
export class ApiGetHealthcheckRouteTests {
  RequestStub = {
    body: '' as any,
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  async before () {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves()
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      get: getFn,
      post: sinon.stub()
    } as unknown as Router)

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = getFn.getCalls().filter(call => call.args[0] === '/healthcheck')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should return `OK`' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['OK'])
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(2)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    const bodyData = { Body: Math.random() }
    this.RequestStub.body = bodyData
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(bodyData)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.ResponseStub.status.onFirstCall().throws(err)
    assert(this.RouteHandler)
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
    body: '' as any,
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before () {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake as unknown as Knex)
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      get: getFn,
      post: sinon.stub()
    } as unknown as Router)
    this.GetListingStub = sinon.stub(Functions, 'GetListing').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = getFn.getCalls().filter(call => call.args[0] === '/listing')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
    this.GetListingStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    this.GetListingStub?.resolves({})
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should json send listing response' () {
    const listing = { listing: Math.random() }
    this.GetListingStub?.resolves(listing)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.equal(listing)
  }

  @test
  async 'it should call GetListingStub with Knex from initialize' () {
    this.RequestStub.params = []
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[0]).to.equal(this.KnexFake)
  }

  @test
  async 'it should call GetListingStub to retrieve implicit root listing' () {
    this.RequestStub.params = []
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[1]).to.equal('/')
  }

  @test
  async 'it should call GetListingStub to retrieve explicit root listing' () {
    this.RequestStub.params = ['/']
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[1]).to.equal('/')
  }

  @test
  async 'it should call GetListingStub to retrieve web path listing' () {
    this.RequestStub.params = ['foo/a bar/baz']
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(1)
    expect(this.GetListingStub?.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt' () {
    this.RequestStub.params = ['/foo/../bar/']
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetListingStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt' () {
    this.RequestStub.params = ['/foo/../bar/']
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt' () {
    this.RequestStub.params = ['/foo/../bar/']
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/'
      }
    }
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should return status NOT_FOUND for missing folder' () {
    this.GetListingStub?.resolves(null)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.NOT_FOUND])
  }

  @test
  async 'it should json error for missing folder' () {
    const err = {
      error: {
        code: 'E_NOT_FOUND',
        message: 'Directory Not Found!',
        path: '/'
      }
    }
    this.GetListingStub?.resolves(null)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.GetListingStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.GetListingStub?.rejects(err)
    const bodyData = { Body: Math.random() }
    this.RequestStub.body = bodyData
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(bodyData)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.GetListingStub?.rejects(err)
    assert(this.RouteHandler)
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
      path: '/image.png'
    },
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before () {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake as unknown as Knex)
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      post: postFn,
      get: sinon.stub()
    } as unknown as Router)
    this.SetLatestPictureStub = sinon.stub(Functions, 'SetLatestPicture').resolves()
    this.ValidateModcountStub = sinon.stub(ModCount, 'Validate').returns(true)
    this.IncrementModcountStub = sinon.stub(ModCount, 'Increment').returns(1)
    this.GetModcountStub = sinon.stub(ModCount, 'Get').returns(69)

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = postFn.getCalls().filter(call => call.args[0] === '/navigate/latest')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
    this.SetLatestPictureStub?.restore()
    this.ValidateModcountStub?.restore()
    this.IncrementModcountStub?.restore()
    this.GetModcountStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should return new modcount when validate passes' () {
    this.ValidateModcountStub?.returns(true)
    this.IncrementModcountStub?.returns(5050)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['5050'])
  }

  @test
  async 'it should return Status OK when validate is bypassed' () {
    this.RequestStub.body.modCount = -1
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  }

  @test
  async 'it should return invalid modcount when validate is bypassed' () {
    this.RequestStub.body.modCount = -1
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['-1'])
  }

  @test
  async 'it should call SetLatestPicture when validate is bypassed' () {
    this.ValidateModcountStub?.returns(false)
    this.RequestStub.body.modCount = -1
    this.RequestStub.body.path = 'foo/bar/a%20image.png'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(1)
    expect(this.SetLatestPictureStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SetLatestPictureStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.SetLatestPictureStub?.firstCall.args[1]).to.equal('/foo/bar/a image.png')
  }

  @test
  async 'it should ignore modcount when validate is bypassed' () {
    this.RequestStub.body.modCount = -1
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ValidateModcountStub?.callCount).to.equal(0)
    expect(this.GetModcountStub?.callCount).to.equal(0)
    expect(this.IncrementModcountStub?.callCount).to.equal(0)
  }

  @test
  async 'it should call SetLatestPicture when validate passes' () {
    this.ValidateModcountStub?.returns(true)
    this.RequestStub.body.path = 'foo/bar/a%20image.png'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(1)
    expect(this.SetLatestPictureStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SetLatestPictureStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.SetLatestPictureStub?.firstCall.args[1]).to.equal('/foo/bar/a image.png')
  }

  @test
  async 'it should set status BAD_REQUEST when validate fails' () {
    this.ValidateModcountStub?.returns(false)
    this.GetModcountStub?.returns(69_420)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
  }

  @test
  async 'it should return invalid when validate fails' () {
    this.ValidateModcountStub?.returns(false)
    this.GetModcountStub?.returns(69_420)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.deep.equal(['-1'])
  }

  @test
  async 'it should not call SetLatestPicture when validate fails' () {
    this.ValidateModcountStub?.returns(false)
    this.RequestStub.body.path = 'foo/bar/a%20image.png'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(0)
  }

  @test
  async 'it should not retrieve listing directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.SetLatestPictureStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/'
      }
    }
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.SetLatestPictureStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.SetLatestPictureStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.SetLatestPictureStub?.rejects(err)
    assert(this.RouteHandler)
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
      path: '/image.png'
    },
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before () {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake as unknown as Knex)
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      post: postFn,
      get: sinon.stub()
    } as unknown as Router)
    this.MarkFolderReadStub = sinon.stub(Functions, 'MarkFolderRead').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = postFn.getCalls().filter(call => call.args[0] === '/mark/read')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
    this.MarkFolderReadStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead' () {
    this.RequestStub.body.path = 'foo/a%20bar/baz'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderReadStub?.callCount).to.equal(1)
    expect(this.MarkFolderReadStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.MarkFolderReadStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.MarkFolderReadStub?.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderReadStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/'
      }
    }
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.MarkFolderReadStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.MarkFolderReadStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.MarkFolderReadStub?.rejects(err)
    assert(this.RouteHandler)
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
      path: '/image.png'
    },
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before () {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake as unknown as Knex)
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      post: postFn,
      get: sinon.stub()
    } as unknown as Router)
    this.MarkFolderUnreadStub = sinon.stub(Functions, 'MarkFolderUnread').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = postFn.getCalls().filter(call => call.args[0] === '/mark/unread')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
    this.MarkFolderUnreadStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead' () {
    this.RequestStub.body.path = 'foo/a%20bar/baz'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderUnreadStub?.callCount).to.equal(1)
    expect(this.MarkFolderUnreadStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.MarkFolderUnreadStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.MarkFolderUnreadStub?.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.MarkFolderUnreadStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/'
      }
    }
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.MarkFolderUnreadStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.MarkFolderUnreadStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.MarkFolderUnreadStub?.rejects(err)
    assert(this.RouteHandler)
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
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before () {
    const getFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake as unknown as Knex)
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      get: getFn,
      post: sinon.stub()
    } as unknown as Router)
    this.GetBookmarkStub = sinon.stub(Functions, 'GetBookmarks').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = getFn.getCalls().filter(call => call.args[0] === '/bookmarks')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
    this.GetBookmarkStub?.restore()
  }

  @test
  async 'it should return bookmarks' () {
    const bookmarks = { Bookmarks: Math.random() }
    this.GetBookmarkStub?.resolves(bookmarks)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.equal(bookmarks)
  }

  @test
  async 'it should call GetBookmarks' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.GetBookmarkStub?.callCount).to.equal(1)
    expect(this.GetBookmarkStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.GetBookmarkStub?.firstCall.args[0]).to.equal(this.KnexFake)
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.GetBookmarkStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.GetBookmarkStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.GetBookmarkStub?.rejects(err)
    assert(this.RouteHandler)
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
      path: '/image.png'
    },
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before () {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake as unknown as Knex)
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      post: postFn,
      get: sinon.stub()
    } as unknown as Router)
    this.AddBookmarkStub = sinon.stub(Functions, 'AddBookmark').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = postFn.getCalls().filter(call => call.args[0] === '/bookmarks/add')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
    this.AddBookmarkStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead' () {
    this.RequestStub.body.path = 'foo/a%20bar/baz.gif'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.AddBookmarkStub?.callCount).to.equal(1)
    expect(this.AddBookmarkStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.AddBookmarkStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.AddBookmarkStub?.firstCall.args[1]).to.equal('/foo/a bar/baz.gif')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.AddBookmarkStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar.gif'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar.gif'
      }
    }
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.AddBookmarkStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.AddBookmarkStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.AddBookmarkStub?.rejects(err)
    assert(this.RouteHandler)
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
      path: '/image.png'
    },
    originalUrl: '/'
  }

  RequestFake = this.RequestStub as unknown as Request

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  RouteHandler?: RequestHandler

  LoggerStub = sinon.stub()

  DebuggerStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() }

  async before () {
    const postFn = sinon.stub()
    const InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake as unknown as Knex)
    const MakeRouterStub = sinon.stub(Imports, 'Router').returns({
      post: postFn,
      get: sinon.stub()
    } as unknown as Router)
    this.RemoveBookmarkStub = sinon.stub(Functions, 'RemoveBookmark').resolves()

    this.DebuggerStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)

    await getRouter(null as unknown as Application, null as unknown as Server, null as unknown as WebSocketServer)

    this.RouteHandler = postFn.getCalls().filter(call => call.args[0] === '/bookmarks/remove')[0]?.args[1] as unknown as RequestHandler

    InitializeStub.restore()
    MakeRouterStub.restore()
  }

  after () {
    this.DebuggerStub?.restore()
    this.RemoveBookmarkStub?.restore()
  }

  @test
  async 'it should return status OK' () {
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.end.callCount).to.equal(1)
    expect(this.ResponseStub.end.firstCall.args).to.have.lengthOf(0)
  }

  @test
  async 'it should call MarkFolderRead' () {
    this.RequestStub.body.path = 'foo/a%20bar/baz.gif'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.RemoveBookmarkStub?.callCount).to.equal(1)
    expect(this.RemoveBookmarkStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.RemoveBookmarkStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.RemoveBookmarkStub?.firstCall.args[1]).to.equal('/foo/a bar/baz.gif')
  }

  @test
  async 'it should not retrieve listing directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.RemoveBookmarkStub?.callCount).to.equal(0)
  }

  @test
  async 'it should return status FORBIDDEN for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar.gif'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  }

  @test
  async 'it should json error for directory traversal attempt' () {
    this.RequestStub.body.path = '/foo/../bar.gif'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar.gif'
      }
    }
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal(err)
  }

  @test
  async 'it should respond with error message on error' () {
    const err = new Error('Evil Error!')
    this.RemoveBookmarkStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(this.ResponseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.lastCall.args).to.deep.equal([{
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    }])
  }

  @test
  async 'it should log message on error' () {
    const err = new Error('Evil Error!')
    this.RemoveBookmarkStub?.rejects(err)
    this.RequestStub.originalUrl = '/'
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.firstCall.args).to.have.lengthOf(2)
    expect(this.LoggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(this.LoggerStub.firstCall.args[1]).to.equal(this.RequestStub.body)
  }

  @test
  async 'it should log error on error' () {
    const err = new Error('Evil Error!')
    this.RemoveBookmarkStub?.rejects(err)
    assert(this.RouteHandler)
    await this.RouteHandler(this.RequestFake, this.ResponseFake)
    expect(this.LoggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.LoggerStub.lastCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.lastCall.args[0]).to.equal(err)
  }
}
