'use sanity'

import { assert, expect } from 'chai'
import type { Server } from 'node:http'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'
import { Functions, Imports } from '#Server'

const sandbox = Sinon.createSandbox()

describe('Server function ListenOnPort', () => {
  let listenStub = Sinon.stub()
  let serverFake = Cast<Server>({ listen: listenStub })
  let loggerFake = Sinon.stub()
  beforeEach(() => {
    listenStub = Sinon.stub()
    serverFake = Cast<Server>({ listen: listenStub })
    loggerFake = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call server.listen once', () => {
    Functions.ListenOnPort(serverFake, 65535)
    expect(listenStub.callCount).to.equal(1)
  })
  it('should listen on the provided port', () => {
    Functions.ListenOnPort(serverFake, 65535)
    expect(listenStub.firstCall.args[0]).to.equal(65535)
  })
  it('should provide a listen callback to the server', () => {
    Functions.ListenOnPort(serverFake, 1)
    const fn = listenStub.firstCall.args[1] as unknown
    assert.isFunction(fn)
  })
  it('should not log when the callback is invoked without an error parameter', () => {
    Functions.ListenOnPort(serverFake, 1)
    const fn = Cast<() => unknown>(listenStub.firstCall.args[1])
    fn()
    expect(loggerFake.callCount).to.equal(0)
  })
  it('should not log when the callback is invoked with an undefined error parameter', () => {
    Functions.ListenOnPort(serverFake, 1)
    const fn = Cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(undefined)
    expect(loggerFake.callCount).to.equal(0)
  })
  it('should log twice when the callback is invoked with an error parameter', () => {
    Functions.ListenOnPort(serverFake, 1)
    const fn = Cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(new Error('FOO!'))
    expect(loggerFake.callCount).to.equal(2)
  })
  it('should log a friendly message first when the callback is invoked with an error parameter', () => {
    Functions.ListenOnPort(serverFake, 1)
    const fn = Cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(new Error('FOO!'))
    expect(loggerFake.firstCall.args).to.deep.equal(['Error encountered creating server'])
  })
  it('should log only the error object when the callback is invoked with an error parameter', () => {
    Functions.ListenOnPort(serverFake, 1)
    const fn = Cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(new Error("D'OH!"))
    expect(loggerFake.secondCall.args).to.have.lengthOf(1)
  })
  it('should log the error object when the callback is invoked with an error parameter', () => {
    Functions.ListenOnPort(serverFake, 1)
    const fn = Cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    const err = new Error("D'OH!")
    fn(err)
    expect(loggerFake.secondCall.args[0]).to.equal(err)
  })
})
