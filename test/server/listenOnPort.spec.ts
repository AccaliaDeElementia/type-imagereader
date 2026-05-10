'use sanity'

import { assert } from 'chai'
import type { Server } from 'node:http'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { listenOnPort, Imports } from '#server.js'

const sandbox = Sinon.createSandbox()

describe('Server listenOnPort', () => {
  let listenStub = sandbox.stub()
  let serverFake = cast<Server>({ listen: listenStub })
  let loggerFake = sandbox.stub()
  beforeEach(() => {
    listenStub = sandbox.stub()
    serverFake = cast<Server>({ listen: listenStub })
    loggerFake = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call server.listen once', () => {
    listenOnPort(serverFake, 65535)
    expect(listenStub.callCount).toBe(1)
  })
  it('should listen on the provided port', () => {
    listenOnPort(serverFake, 65535)
    expect(listenStub.firstCall.args[0]).toBe(65535)
  })
  it('should provide a listen callback to the server', () => {
    listenOnPort(serverFake, 1)
    const fn = listenStub.firstCall.args[1] as unknown
    assert.isFunction(fn)
  })
  it('should not log when the callback is invoked without an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<() => unknown>(listenStub.firstCall.args[1])
    fn()
    expect(loggerFake.callCount).toBe(0)
  })
  it('should not log when the callback is invoked with an undefined error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(undefined)
    expect(loggerFake.callCount).toBe(0)
  })
  it('should log twice when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(new Error('FOO!'))
    expect(loggerFake.callCount).toBe(2)
  })
  it('should log a friendly message first when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(new Error('FOO!'))
    expect(loggerFake.firstCall.args).toEqual(['Error encountered creating server'])
  })
  it('should log only the error object when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    fn(new Error("D'OH!"))
    expect(loggerFake.secondCall.args).toHaveLength(1)
  })
  it('should log the error object when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.firstCall.args[1])
    const err = new Error("D'OH!")
    fn(err)
    expect(loggerFake.secondCall.args[0]).toBe(err)
  })
})
