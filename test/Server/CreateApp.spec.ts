'use sanity'

import { expect } from 'chai'
import type { Express } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards.js'
import { CreateApp, Imports } from '#Server.js'

const sandbox = Sinon.createSandbox()

describe('Server CreateApp', () => {
  let serverFake = Cast<Server>({})
  let socketsFake = Cast<WebSocketServer>({})
  let socketsServerStub = sandbox.stub()
  let appFake = Cast<Express>({})
  let expressStub = sandbox.stub().returns(appFake)
  let createServerStub = sandbox.stub().returns(serverFake)
  beforeEach(() => {
    serverFake = Cast<Server>({})
    socketsFake = Cast<WebSocketServer>({})
    appFake = Cast<Express>({})
    expressStub = sandbox.stub(Imports, 'express').returns(appFake)
    createServerStub = sandbox.stub(Imports, 'createServer').returns(serverFake)
    socketsServerStub = sandbox.stub(Imports, 'WebSocketServer').returns(socketsFake)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should construct express app', () => {
    CreateApp()
    expect(expressStub.callCount).to.equal(1)
  })
  it('should construct express app with default config', () => {
    CreateApp()
    expect(expressStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should create an http server wrapping the express app', () => {
    CreateApp()
    expect(createServerStub.callCount).to.equal(1)
  })
  it('should delegate incoming requests to the express app via the createServer listener', () => {
    const appCallStub = sandbox.stub()
    expressStub.returns(Cast<Express>(appCallStub))
    CreateApp()
    const listener = Cast<(req: unknown, res: unknown) => void>(createServerStub.firstCall.args[0])
    const reqFake = { req: true }
    const resFake = { res: true }
    listener(reqFake, resFake)
    expect(appCallStub.firstCall.args).to.deep.equal([reqFake, resFake])
  })
  it('should not start listening from CreateApp', () => {
    CreateApp()
    // CreateApp must stay passive — listening is deferred to ListenOnPort at the end of start()
    // so requests cannot reach handlers until every router is registered.
    expect(serverFake).to.not.have.property('listen')
  })
  it('should create websocket server', () => {
    CreateApp()
    expect(socketsServerStub.callCount).to.equal(1)
  })
  it('should create websocket server from the http server', () => {
    CreateApp()
    expect(socketsServerStub.firstCall.args[0]).to.equal(serverFake)
  })
  it('should return tuple of [express app, http server, websocket server]', () => {
    const result = CreateApp()
    expect(result).to.deep.equal([appFake, serverFake, socketsFake])
  })
})
