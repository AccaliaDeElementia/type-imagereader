'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Application, Router } from 'express'
import { Server } from 'http'
import { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'

import { getRouter, Imports } from '../../routes/index'

function assert (condition: unknown, msg?: string): asserts condition {
  if (!condition) throw new Error(msg || 'Assertion failure!')
}

@suite
export class ImagesGetRouterTests {
  ApplicationFake = {} as unknown as Application
  ServerFake = {} as unknown as Server
  WebsocketsFake = {} as unknown as WebSocketServer

  RouterFake = {
    get: sinon.stub().returnsThis()
  }

  RequestStub = {
    params: [] as string[]
  }

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    render: sinon.stub().returnsThis(),
    redirect: sinon.stub().returnsThis()
  }

  RouterStub?: Sinon.SinonStub

  before () {
    this.RouterStub = sinon.stub(Imports, 'Router').returns(this.RouterFake as unknown as Router)
  }

  after () {
    this.RouterStub?.restore()
  }

  @test
  async 'it should construct and return router' () {
    const router = await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterStub?.callCount).to.equal(1)
    expect(this.RouterStub?.firstCall.args).to.have.lengthOf(0)
    expect(router).to.equal(this.RouterFake)
  }

  @test
  async 'it should register route /' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/')).to.equal(true)
  }

  @test
  async 'it should redirect route / to /show' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.redirect.callCount).to.equal(1)
    expect(this.ResponseStub.redirect.firstCall.args).to.deep.equal([StatusCodes.MOVED_TEMPORARILY, '/show'])
  }

  @test
  async 'it should register route /show' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/show')).to.equal(true)
  }

  @test
  async 'it should register route /show/*' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/show/*')).to.equal(true)
  }

  @test
  async 'it should use same handler for /show to /show/*' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const show = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/show')
      .map(call => call.args[1])[0]
    assert(show)
    expect(show).to.be.a('function')
    const showStar = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/show/*')
      .map(call => call.args[1])[0]
    assert(showStar)
    expect(showStar).to.be.a('function')
    expect(show).to.equal(showStar)
  }

  @test
  async 'it should render app for default /show request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const show = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/show')
      .map(call => call.args[1])[0]
    assert(show)
    await show(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.render.callCount).to.equal(1)
    expect(this.ResponseStub.render.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.render.firstCall.args[0]).to.equal('app')
  }

  @test
  async 'it should render app for valid /show request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const show = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/show')
      .map(call => call.args[1])[0]
    assert(show)
    this.RequestStub.params = ['foo/bar/baz/']
    await show(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.render.callCount).to.equal(1)
    expect(this.ResponseStub.render.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.render.firstCall.args[0]).to.equal('app')
  }

  @test
  async 'it should render error for /show request with directory traversal' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const show = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/show')
      .map(call => call.args[1])[0]
    assert(show)
    this.RequestStub.params = ['foo/../bar/']
    await show(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
    expect(this.ResponseStub.render.callCount).to.equal(1)
    expect(this.ResponseStub.render.firstCall.args).to.have.lengthOf(2)
    expect(this.ResponseStub.render.firstCall.args[0]).to.equal('error')
    expect(this.ResponseStub.render.firstCall.args[1]).to.deep.equal({
      error: {
        title: 'ERROR',
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!'
      }
    })
  }
}
