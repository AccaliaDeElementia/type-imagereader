'use sanity'

import { EventEmitter } from 'node:events'
import { vi, type Mock } from 'vitest'
import type { CopyStreamQuery } from 'pg-copy-streams'

import { cast } from './typeGuards.js'

export interface CopyStreamFake {
  stream: CopyStreamQuery
  ee: EventEmitter
  writeSpy: Mock
  endSpy: Mock
  destroySpy: Mock
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
export function createCopyStreamFake(opts: CopyStreamFakeOptions = {}): CopyStreamFake {
  const ee = new EventEmitter()
  const writeSpy = vi.fn().mockReturnValue(opts.writeReturns ?? true)
  const destroySpy = vi.fn()
  const endSpy = vi.fn()
  const onEnd = opts.emitOnEnd
  if (onEnd !== undefined) {
    endSpy.mockImplementation(() => {
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
