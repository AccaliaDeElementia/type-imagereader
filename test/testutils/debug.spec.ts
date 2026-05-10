'use sanity'

import Sinon from 'sinon'
import type { Debugger } from 'debug'

import { createLoggerFake, noopLogger, stubDebug } from '#testutils/debug.js'
import { cast } from '#testutils/typeGuards.js'

describe('testutils/Debug noopLogger', () => {
  it('should be a function (satisfying the Debugger callable shape)', () => {
    expect(noopLogger).toBeTypeOf('function')
  })
  it('should not throw when invoked with a message', () => {
    expect(() => {
      noopLogger('msg')
    }).not.toThrow()
  })
  it('should not throw when invoked with a format string and arguments', () => {
    expect(() => {
      noopLogger('hello %s', 'world', { x: 2 })
    }).not.toThrow()
  })
})

describe('testutils createLoggerFake()', () => {
  it('should return an object with a stub property', () => {
    const sandbox = Sinon.createSandbox()
    expect(createLoggerFake(sandbox).stub).toBeTypeOf('function')
  })
  it('should return an object with a fake property', () => {
    const sandbox = Sinon.createSandbox()
    expect(createLoggerFake(sandbox).fake).toBeTypeOf('function')
  })
  it('should record a call on stub when fake is invoked', () => {
    const sandbox = Sinon.createSandbox()
    const { stub, fake } = createLoggerFake(sandbox)
    fake('hello')
    expect(stub.callCount).toBe(1)
  })
  it('should pass arguments through fake to stub', () => {
    const sandbox = Sinon.createSandbox()
    const { stub, fake } = createLoggerFake(sandbox)
    fake('hello %s', 'world')
    expect(stub.firstCall.args).toEqual(['hello %s', 'world'])
  })
  it('should return independent stubs across calls', () => {
    const sandbox = Sinon.createSandbox()
    const a = createLoggerFake(sandbox)
    const b = createLoggerFake(sandbox)
    a.fake('only-a')
    expect(b.stub.callCount).toBe(0)
  })
})

describe('testutils stubDebug()', () => {
  it('should replace the debug property with a stub', () => {
    const sandbox = Sinon.createSandbox()
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { debugStub } = stubDebug(sandbox, target)
    expect(target.debug).toBe(debugStub)
  })
  it('should make target.debug return the loggerStub', () => {
    const sandbox = Sinon.createSandbox()
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { loggerStub } = stubDebug(sandbox, target)
    expect(target.debug('any:prefix')).toBe(loggerStub)
  })
  it('should record calls to target.debug on debugStub', () => {
    const sandbox = Sinon.createSandbox()
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { debugStub } = stubDebug(sandbox, target)
    target.debug('the:prefix')
    expect(debugStub.firstCall.args).toEqual(['the:prefix'])
  })
  it('should record calls made through the returned logger on loggerStub', () => {
    const sandbox = Sinon.createSandbox()
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { loggerStub } = stubDebug(sandbox, target)
    const logger = target.debug('prefix')
    logger('a message')
    expect(loggerStub.firstCall.args).toEqual(['a message'])
  })
  it('should return the same logger regardless of which prefix is passed', () => {
    const sandbox = Sinon.createSandbox()
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    stubDebug(sandbox, target)
    expect(target.debug('first')).toBe(target.debug('second'))
  })
  it('should return the loggerStub itself when target.debug is invoked', () => {
    const sandbox = Sinon.createSandbox()
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { loggerStub } = stubDebug(sandbox, target)
    expect(target.debug('any')).toBe(loggerStub)
  })
  it('should restore target.debug when the sandbox is restored', () => {
    const sandbox = Sinon.createSandbox()
    const original = cast<(n: string) => Debugger>(() => undefined)
    const target = { debug: original }
    stubDebug(sandbox, target)
    sandbox.restore()
    expect(target.debug).toBe(original)
  })
})
