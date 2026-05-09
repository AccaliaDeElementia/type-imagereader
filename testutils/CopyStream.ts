'use sanity'

import { EventEmitter } from 'node:events'
import type { SinonSandbox, SinonStub } from 'sinon'
import type { CopyStreamQuery } from 'pg-copy-streams'

import { cast } from './TypeGuards.js'

export interface CopyStreamFake {
  stream: CopyStreamQuery
  ee: EventEmitter
  writeSpy: SinonStub
  endSpy: SinonStub
  destroySpy: SinonStub
}

export interface CopyStreamFakeOptions {
  // When `end()` is called, schedule this event on the next microtask.
  // 'finish' simulates successful completion;
  // { error: Error } simulates a downstream-write failure.
  // Default: no auto-emit (caller drives the lifecycle via the `ee` handle).
  emitOnEnd?: 'finish' | { error: Error }
  // Default return for `write()` — true means no backpressure. Default: true.
  writeReturns?: boolean
}

// Build a fake `pg-copy-streams` CopyStreamQuery. Returns the typed `stream`
// to pass to the code under test, the underlying `ee` for tests to dispatch
// 'drain' / 'error' / 'finish' on demand, and named spies for write/end/destroy.
export function createCopyStreamFake(sandbox: SinonSandbox, opts: CopyStreamFakeOptions = {}): CopyStreamFake {
  const ee = new EventEmitter()
  const writeSpy = sandbox.stub().returns(opts.writeReturns ?? true)
  const destroySpy = sandbox.stub()
  const endSpy = sandbox.stub()
  const onEnd = opts.emitOnEnd
  if (onEnd !== undefined) {
    endSpy.callsFake(() => {
      queueMicrotask(() => {
        if (onEnd === 'finish') ee.emit('finish')
        else ee.emit('error', onEnd.error)
      })
    })
  }
  Object.assign(ee, { write: writeSpy, end: endSpy, destroy: destroySpy })
  return { stream: cast<CopyStreamQuery>(ee), ee, writeSpy, endSpy, destroySpy }
}

// Schedule an EventEmitter emit on the next microtask. Used when a test wants
// the runtime to emit 'drain' or 'error' partway through an awaited operation.
export function scheduleEmit(ee: EventEmitter, event: string, ...args: unknown[]): void {
  queueMicrotask(() => {
    ee.emit(event, ...args)
  })
}
