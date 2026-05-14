'use sanity'

import { EventEmitter } from 'node:events'
import { setImmediate as yieldMacro } from 'node:timers/promises'
import { createCopyStreamFake, scheduleEmit } from '#testutils/copyStream.js'
import { voidFn } from '#testutils/mocks.js'

describe('testutils createCopyStreamFake()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should return an object exposing the typed stream', () => {
    expect(createCopyStreamFake().stream).toBeTypeOf('object')
  })
  it('should return an EventEmitter handle', () => {
    expect(createCopyStreamFake().ee).toBeInstanceOf(EventEmitter)
  })
  it('should record stream.write() calls on writeSpy', () => {
    const { stream, writeSpy } = createCopyStreamFake()
    stream.write('payload')
    expect(writeSpy.mock.calls.length).toBe(1)
  })
  it('should pass write() arguments through to writeSpy', () => {
    const { stream, writeSpy } = createCopyStreamFake()
    stream.write('payload')
    expect(writeSpy.mock.calls[0]?.[0]).toBe('payload')
  })
  it('should make stream.write() return true by default', () => {
    const { stream } = createCopyStreamFake()
    expect(stream.write('x')).toBe(true)
  })
  it('should honour writeReturns when overridden to false', () => {
    const { stream } = createCopyStreamFake({ writeReturns: false })
    expect(stream.write('x')).toBe(false)
  })
  it('should record stream.end() calls on endSpy', () => {
    const { stream, endSpy } = createCopyStreamFake()
    stream.end()
    expect(endSpy.mock.calls.length).toBe(1)
  })
  it('should record stream.destroy() calls on destroySpy', () => {
    const { stream, destroySpy } = createCopyStreamFake()
    stream.destroy(new Error('boom'))
    expect(destroySpy.mock.calls.length).toBe(1)
  })
  it('should not auto-emit anything on end() by default', async () => {
    const { stream, ee } = createCopyStreamFake()
    const finishSpy = voidFn()
    ee.on('finish', finishSpy)
    stream.end()
    await yieldMacro()
    expect(finishSpy.mock.calls.length).toBe(0)
  })
  it('should emit "finish" on the next microtask when emitOnEnd is "finish"', async () => {
    const { stream, ee } = createCopyStreamFake({ emitOnEnd: 'finish' })
    const finishSpy = voidFn()
    ee.once('finish', finishSpy)
    stream.end()
    await yieldMacro()
    expect(finishSpy.mock.calls.length).toBe(1)
  })
  it('should emit "error" with the supplied error when emitOnEnd is { error }', async () => {
    const err = new Error('boom')
    const { stream, ee } = createCopyStreamFake({ emitOnEnd: { error: err } })
    const errorSpy = voidFn()
    ee.once('error', errorSpy)
    stream.end()
    await yieldMacro()
    expect(errorSpy.mock.calls[0]?.[0]).toBe(err)
  })
})

describe('testutils scheduleEmit()', () => {
  it('should emit the event on the next microtask', async () => {
    const ee = new EventEmitter()
    const drainSpy = voidFn()
    ee.once('drain', drainSpy)
    scheduleEmit(ee, 'drain')
    await yieldMacro()
    expect(drainSpy.mock.calls.length).toBe(1)
  })
  it('should pass extra arguments through to the listener', async () => {
    const ee = new EventEmitter()
    const payloadSpy = voidFn()
    ee.once('payload', payloadSpy)
    scheduleEmit(ee, 'payload', 'first', 42)
    await yieldMacro()
    expect(payloadSpy.mock.calls[0]).toEqual(['first', 42])
  })
})
