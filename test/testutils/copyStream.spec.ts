'use sanity'

import { EventEmitter } from 'node:events'
import { setImmediate as yieldMacro } from 'node:timers/promises'
import Sinon from 'sinon'

import { createCopyStreamFake, scheduleEmit } from '#testutils/copyStream.js'

const sandbox = Sinon.createSandbox()

describe('testutils createCopyStreamFake()', () => {
  afterEach(() => {
    sandbox.restore()
  })
  it('should return an object exposing the typed stream', () => {
    expect(createCopyStreamFake(sandbox).stream).toBeTypeOf('object')
  })
  it('should return an EventEmitter handle', () => {
    expect(createCopyStreamFake(sandbox).ee).toBeInstanceOf(EventEmitter)
  })
  it('should record stream.write() calls on writeSpy', () => {
    const { stream, writeSpy } = createCopyStreamFake(sandbox)
    stream.write('payload')
    expect(writeSpy.callCount).toBe(1)
  })
  it('should pass write() arguments through to writeSpy', () => {
    const { stream, writeSpy } = createCopyStreamFake(sandbox)
    stream.write('payload')
    expect(writeSpy.firstCall.args[0]).toBe('payload')
  })
  it('should make stream.write() return true by default', () => {
    const { stream } = createCopyStreamFake(sandbox)
    expect(stream.write('x')).toBe(true)
  })
  it('should honour writeReturns when overridden to false', () => {
    const { stream } = createCopyStreamFake(sandbox, { writeReturns: false })
    expect(stream.write('x')).toBe(false)
  })
  it('should record stream.end() calls on endSpy', () => {
    const { stream, endSpy } = createCopyStreamFake(sandbox)
    stream.end()
    expect(endSpy.callCount).toBe(1)
  })
  it('should record stream.destroy() calls on destroySpy', () => {
    const { stream, destroySpy } = createCopyStreamFake(sandbox)
    stream.destroy(new Error('boom'))
    expect(destroySpy.callCount).toBe(1)
  })
  it('should not auto-emit anything on end() by default', async () => {
    const { stream, ee } = createCopyStreamFake(sandbox)
    const finishSpy = sandbox.stub()
    ee.on('finish', finishSpy)
    stream.end()
    await yieldMacro()
    expect(finishSpy.callCount).toBe(0)
  })
  it('should emit "finish" on the next microtask when emitOnEnd is "finish"', async () => {
    const { stream, ee } = createCopyStreamFake(sandbox, { emitOnEnd: 'finish' })
    const finishSpy = sandbox.stub()
    ee.once('finish', finishSpy)
    stream.end()
    await yieldMacro()
    expect(finishSpy.callCount).toBe(1)
  })
  it('should emit "error" with the supplied error when emitOnEnd is { error }', async () => {
    const err = new Error('boom')
    const { stream, ee } = createCopyStreamFake(sandbox, { emitOnEnd: { error: err } })
    const errorSpy = sandbox.stub()
    ee.once('error', errorSpy)
    stream.end()
    await yieldMacro()
    expect(errorSpy.firstCall.args[0]).toBe(err)
  })
})

describe('testutils scheduleEmit()', () => {
  it('should emit the event on the next microtask', async () => {
    const ee = new EventEmitter()
    const drainSpy = sandbox.stub()
    ee.once('drain', drainSpy)
    scheduleEmit(ee, 'drain')
    await yieldMacro()
    expect(drainSpy.callCount).toBe(1)
  })
  it('should pass extra arguments through to the listener', async () => {
    const ee = new EventEmitter()
    const payloadSpy = sandbox.stub()
    ee.once('payload', payloadSpy)
    scheduleEmit(ee, 'payload', 'first', 42)
    await yieldMacro()
    expect(payloadSpy.firstCall.args).toEqual(['first', 42])
  })
})
