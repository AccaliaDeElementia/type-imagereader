'use sanity'

import type { Debugger } from 'debug'

import { stubInjectedLogger, noopLogger, stubLoggerFactory } from '#testutils/debug.js'
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

describe('testutils stubInjectedLogger()', () => {
  it('should return an object with a stub property', () => {
    expect(stubInjectedLogger().stub).toBeTypeOf('function')
  })
  it('should return an object with a fake property', () => {
    expect(stubInjectedLogger().fake).toBeTypeOf('function')
  })
  it('should record a call on stub when fake is invoked', () => {
    const { stub, fake } = stubInjectedLogger()
    fake('hello')
    expect(stub.mock.calls.length).toBe(1)
  })
  it('should pass arguments through fake to stub', () => {
    const { stub, fake } = stubInjectedLogger()
    fake('hello %s', 'world')
    expect(stub.mock.calls[0]).toEqual(['hello %s', 'world'])
  })
  it('should return independent stubs across calls', () => {
    const a = stubInjectedLogger()
    const b = stubInjectedLogger()
    a.fake('only-a')
    expect(b.stub.mock.calls.length).toBe(0)
  })
})

describe('testutils stubLoggerFactory()', () => {
  it('should replace the debug property with a stub', () => {
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    stubLoggerFactory(target)
    expect(target.debug).toBeTypeOf('function')
  })
  it('should make target.debug return the loggerStub', () => {
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { loggerStub } = stubLoggerFactory(target)
    expect(target.debug('any:prefix')).toBe(loggerStub)
  })
  it('should return the same loggerStub whichever prefix the subject passes to debug()', () => {
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    stubLoggerFactory(target)
    expect(target.debug('one:prefix')).toBe(target.debug('another:prefix'))
  })
  it('should record calls to target.debug on debugStub', () => {
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { debugStub } = stubLoggerFactory(target)
    target.debug('the:prefix')
    expect(debugStub.mock.calls[0]).toEqual(['the:prefix'])
  })
  it('should record calls made through the returned logger on loggerStub', () => {
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { loggerStub } = stubLoggerFactory(target)
    const logger = target.debug('prefix')
    logger('a message')
    expect(loggerStub.mock.calls[0]).toEqual(['a message'])
  })
  it('should return the same logger regardless of which prefix is passed', () => {
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    stubLoggerFactory(target)
    expect(target.debug('first')).toBe(target.debug('second'))
  })
  it('should return the loggerStub itself when target.debug is invoked', () => {
    const target = { debug: cast<(n: string) => Debugger>(() => undefined) }
    const { loggerStub } = stubLoggerFactory(target)
    expect(target.debug('any')).toBe(loggerStub)
  })
  it('should restore target.debug when restoreAllMocks runs', () => {
    const original = cast<(n: string) => Debugger>(() => undefined)
    const target = { debug: original }
    stubLoggerFactory(target)
    vi.restoreAllMocks()
    expect(target.debug).toBe(original)
  })
})
