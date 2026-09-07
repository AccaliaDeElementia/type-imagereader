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
  endEmitted: () => Promise<void>
}

export interface CopyStreamFakeOptions {
  emitOnEnd?: 'finish' | { error: Error }
  writeAcceptsMore?: boolean
}

export function createCopyStreamFake(opts: CopyStreamFakeOptions = {}): CopyStreamFake {
  const ee = new EventEmitter()
  const writeSpy = vi.fn().mockReturnValue(opts.writeAcceptsMore ?? true)
  const destroySpy = vi.fn()
  const endSpy = vi.fn()
  const onEnd = opts.emitOnEnd
  let pendingEmit: Promise<void> = Promise.resolve()
  if (onEnd !== undefined) {
    endSpy.mockImplementation(() => {
      pendingEmit = onEnd === 'finish' ? scheduleEmit(ee, 'finish') : scheduleEmit(ee, 'error', onEnd.error)
    })
  }
  Object.assign(ee, { write: writeSpy, end: endSpy, destroy: destroySpy })
  return {
    stream: cast<CopyStreamQuery>(ee),
    ee,
    writeSpy,
    endSpy,
    destroySpy,
    endEmitted: async (): Promise<void> => {
      await pendingEmit
    },
  }
}

export async function scheduleEmit(ee: EventEmitter, event: string, ...args: unknown[]): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  queueMicrotask(() => {
    ee.emit(event, ...args)
    resolve(undefined)
  })
  await promise
}
