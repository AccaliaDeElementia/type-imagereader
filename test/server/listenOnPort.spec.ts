'use sanity'

import type { Server } from 'node:http'
import { cast } from '#testutils/typeGuards.js'
import { listenOnPort, Imports } from '#server.js'
import type { MockInstance } from 'vitest'

describe('Server listenOnPort', () => {
  let listenStub: MockInstance = vi.fn()
  let serverFake = cast<Server>({ listen: listenStub })
  let loggerFake: MockInstance = vi.fn()
  beforeEach(() => {
    listenStub = vi.fn()
    serverFake = cast<Server>({ listen: listenStub })
    loggerFake = vi.spyOn(Imports, 'logger').mockImplementation(cast(() => undefined))
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call server.listen once', () => {
    listenOnPort(serverFake, 65535)
    expect(listenStub.mock.calls.length).toBe(1)
  })
  it('should listen on the provided port', () => {
    listenOnPort(serverFake, 65535)
    expect(listenStub.mock.calls[0]?.[0]).toBe(65535)
  })
  it('should provide a listen callback to the server', () => {
    listenOnPort(serverFake, 1)
    const fn = listenStub.mock.calls[0]?.[1] as unknown
    expect(fn).toBeTypeOf('function')
  })
  it('should not log when the callback is invoked without an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<() => unknown>(listenStub.mock.calls[0]?.[1])
    fn()
    expect(loggerFake.mock.calls.length).toBe(0)
  })
  it('should not log when the callback is invoked with an undefined error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.mock.calls[0]?.[1])
    fn(undefined)
    expect(loggerFake.mock.calls.length).toBe(0)
  })
  it('should log twice when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.mock.calls[0]?.[1])
    fn(new Error('FOO!'))
    expect(loggerFake.mock.calls.length).toBe(2)
  })
  it('should log a friendly message first when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.mock.calls[0]?.[1])
    fn(new Error('FOO!'))
    expect(loggerFake.mock.calls[0]).toEqual(['Error encountered creating server'])
  })
  it('should log only the error object when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.mock.calls[0]?.[1])
    fn(new Error("D'OH!"))
    expect(loggerFake.mock.calls[1]).toHaveLength(1)
  })
  it('should log the error object when the callback is invoked with an error parameter', () => {
    listenOnPort(serverFake, 1)
    const fn = cast<(err: Error | undefined) => unknown>(listenStub.mock.calls[0]?.[1])
    const err = new Error("D'OH!")
    fn(err)
    expect(loggerFake.mock.calls[1]?.[0]).toBe(err)
  })
})
