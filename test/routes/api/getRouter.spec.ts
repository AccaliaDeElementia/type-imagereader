'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '../../../routes/api'
import persistance from '../../../utils/persistance'
import { Cast } from '../../testutils/TypeGuards'
import assert from 'node:assert'

describe('routes/api function getRouter()', () => {
  let applicationFake = Cast<Application>({ App: Math.random() })
  let serverFake = Cast<Server>({ Server: Math.random() })
  let socketServerFake = Cast<WebSocketServer>({ Sockets: Math.random() })
  let initializeStub = Sinon.stub()
  let routerStub = {
    get: Sinon.stub(),
    post: Sinon.stub(),
  }
  let makeRouterStub = Sinon.stub()
  beforeEach(() => {
    applicationFake = Cast<Application>({ App: Math.random() })
    serverFake = Cast<Server>({ Server: Math.random() })
    socketServerFake = Cast<WebSocketServer>({ Sockets: Math.random() })
    routerStub = {
      get: Sinon.stub(),
      post: Sinon.stub(),
    }
    initializeStub = Sinon.stub(persistance, 'initialize').resolves()
    makeRouterStub = Sinon.stub(Imports, 'Router').returns(Cast<Router>(routerStub))
  })
  afterEach(() => {
    initializeStub.restore()
    makeRouterStub.restore()
  })
  it('should resolve to created router', async () => {
    const result = await getRouter(applicationFake, serverFake, socketServerFake)
    expect(result).to.equal(routerStub)
  })
  it('should attach handler for get `/`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.get.calledWith('/')).to.equal(true)
  })
  it('should attach handler for get `/healthcheck`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.get.calledWith('/')).to.equal(true)
  })
  it('should attach handler for get `/listing/*`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.get.calledWith('/listing/*')).to.equal(true)
  })
  it('should attach handler for get `/listing`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.get.calledWith('/listing')).to.equal(true)
  })
  it('should use same handler for `/listing/` and `/listing/*`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    const fn1 = routerStub.get.getCalls().find((call) => call.args[0] === '/listing')?.args[1] as unknown
    const fn2 = routerStub.get.getCalls().find((call) => call.args[0] === '/listing/*')?.args[1] as unknown
    assert(fn1 !== undefined)
    assert(fn2 !== undefined)
    expect(fn1).to.equal(fn2)
  })
  it('should attach handler for post `/navigate/latest`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.post.calledWith('/navigate/latest')).to.equal(true)
  })
  it('should attach handler for post `/mark/read`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.post.calledWith('/mark/read')).to.equal(true)
  })
  it('should attach handler for post `/mark/unread`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.post.calledWith('/mark/unread')).to.equal(true)
  })
  it('should attach handler for get `/bookmarks/*`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.get.calledWith('/bookmarks/*')).to.equal(true)
  })
  it('should attach handler for get `/bookmarks/`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.get.calledWith('/bookmarks')).to.equal(true)
  })
  it('should use same handler for `/bookmarks/` and `/bookmarks/*`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    const fn1 = routerStub.get.getCalls().find((call) => call.args[0] === '/bookmarks')?.args[1] as unknown
    const fn2 = routerStub.get.getCalls().find((call) => call.args[0] === '/bookmarks/*')?.args[1] as unknown
    assert(fn1 !== undefined)
    assert(fn2 !== undefined)
    expect(fn1).to.equal(fn2)
  })
  it('should attach handler for post `/bookmarks/add`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.post.calledWith('/bookmarks/add')).to.equal(true)
  })
  it('should attach handler for post `/bookmarks/remove`', async () => {
    await getRouter(applicationFake, serverFake, socketServerFake)
    expect(routerStub.post.calledWith('/bookmarks/remove')).to.equal(true)
  })
})
