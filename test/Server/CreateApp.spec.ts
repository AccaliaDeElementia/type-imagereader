'use sanity'

import { assert, expect } from 'chai'
import type { Express } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import Sinon from 'sinon'
import { Cast } from '../testutils/TypeGuards'
import { Functions, Imports } from '../../Server'

describe('Server function CreateApp', () => {
  let serverFake = Cast<Server>({})
  let socketsFake = Cast<WebSocketServer>({})
  let socketsServerStub = Sinon.stub()
  let appStub = { listen: Sinon.stub().returns(serverFake) }
  let appFake = Cast<Express>(appStub)
  let expressStub = Sinon.stub().returns(appFake)
  let loggerFake = Sinon.stub()
  beforeEach(() => {
    serverFake = Cast<Server>({})
    socketsFake = Cast<WebSocketServer>({})
    appStub = { listen: Sinon.stub().returns(serverFake) }
    appFake = Cast<Express>(appStub)
    expressStub = Sinon.stub(Imports, 'express').returns(appFake)
    socketsServerStub = Sinon.stub(Imports, 'WebSocketServer').returns(socketsFake)
    loggerFake = Sinon.stub(Imports, 'logger')
  })
  afterEach(() => {
    loggerFake.restore()
    expressStub.restore()
    socketsServerStub.restore()
  })
  it('should construct express app', () => {
    Functions.CreateApp(1)
    expect(expressStub.callCount).to.equal(1)
  })
  it('should construct express app with default config', () => {
    Functions.CreateApp(1)
    expect(expressStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should listen from created app', () => {
    Functions.CreateApp(1)
    expect(appStub.listen.callCount).to.equal(1)
  })
  it('should listen to provided port id', () => {
    Functions.CreateApp(65536)
    expect(appStub.listen.firstCall.args[0]).to.equal(65536)
  })
  it('should provide listen callback to app', () => {
    Functions.CreateApp(1)
    const fn = appStub.listen.firstCall.args[1] as unknown
    assert.isFunction(fn)
  })
  it('should return undefined from listen callback', () => {
    Functions.CreateApp(1)
    const fn = Cast<() => unknown>(appStub.listen.firstCall.args[1])
    expect(fn()).to.equal(undefined)
  })
  it('should not log message when callback is called without error parameter', () => {
    Functions.CreateApp(1)
    const fn = Cast<() => unknown>(appStub.listen.firstCall.args[1])
    fn()
    expect(loggerFake.callCount).to.equal(0)
  })
  it('should not log message when callback is called with undefined error parameter', () => {
    Functions.CreateApp(1)
    const fn = Cast<(err: Error | undefined) => unknown>(appStub.listen.firstCall.args[1])
    fn(undefined)
    expect(loggerFake.callCount).to.equal(0)
  })
  it('should log messages when callback is called with error parameter', () => {
    Functions.CreateApp(1)
    const fn = Cast<(err: Error | undefined) => unknown>(appStub.listen.firstCall.args[1])
    fn(new Error('FOO!'))
    expect(loggerFake.callCount).to.equal(2)
  })
  it('should log friendly message first when callback is called with error parameter', () => {
    Functions.CreateApp(1)
    const fn = Cast<(err: Error | undefined) => unknown>(appStub.listen.firstCall.args[1])
    fn(new Error('FOO!'))
    expect(loggerFake.firstCall.args).to.deep.equal(['Error encountered creating server'])
  })
  it('should log error object when callback is called with error parameter', () => {
    Functions.CreateApp(1)
    const fn = Cast<(err: Error | undefined) => unknown>(appStub.listen.firstCall.args[1])
    const err = new Error("D'OH!")
    fn(err)
    expect(loggerFake.secondCall.args).to.have.lengthOf(1)
    expect(loggerFake.secondCall.args[0]).to.equal(err)
  })
  it('should create websocket server', () => {
    Functions.CreateApp(1)
    expect(socketsServerStub.callCount).to.equal(1)
  })
  it('should create websocket server from listened http server', () => {
    Functions.CreateApp(1)
    expect(socketsServerStub.firstCall.args[0]).to.equal(serverFake)
  })
  it('should return tuple of created servers', () => {
    const result = Functions.CreateApp(1)
    assert.isArray(result)
  })
  it('should return correctly sized tuple of created servers', () => {
    const result = Functions.CreateApp(1)
    expect(result).to.have.lengthOf(3)
  })
  it('should return express app server', () => {
    const result = Functions.CreateApp(1)
    expect(result[0]).to.equal(appFake)
  })
  it('should return http server', () => {
    const result = Functions.CreateApp(1)
    expect(result[1]).to.equal(serverFake)
  })
  it('should return websocket server', () => {
    const result = Functions.CreateApp(1)
    expect(result[2]).to.equal(socketsFake)
  })
})
