'use sanity'

import type { Debugger } from 'debug'
import { vi, type Mock, type MockInstance } from 'vitest'

import { cast } from './typeGuards.js'

export const noopLogger: Debugger = cast<Debugger>(() => undefined)

export function stubInjectedLogger(): { stub: Mock; fake: Debugger } {
  const stub = vi.fn()
  return { stub, fake: cast<Debugger>(stub) }
}

// The same loggerStub comes back whichever prefix the subject passes to debug().
export function stubLoggerFactory(target: { debug: (namespace: string) => Debugger }): {
  debugStub: MockInstance
  loggerStub: MockInstance
} {
  const loggerStub = vi.fn()
  const debugStub = vi.spyOn(target, 'debug').mockReturnValue(cast<Debugger>(loggerStub))
  return { debugStub, loggerStub }
}
