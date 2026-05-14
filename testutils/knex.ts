'use sanity'

import { vi, type Mock } from 'vitest'
import { cast, stubToKnex } from './typeGuards.js'

type KnexQueryStub = Record<string, Mock>

export function createKnexChainFake<C extends readonly string[], T extends readonly string[]>(
  chainMethods: C,
  terminalMethods: T,
  defaultValue: unknown = [],
): {
  instance: Record<C[number] | T[number], Mock>
  stub: Mock
  fake: ReturnType<typeof stubToKnex>
} {
  const instance: KnexQueryStub = {}
  for (const method of chainMethods) {
    instance[method] = vi.fn().mockImplementation(function (this: object): unknown {
      return this
    })
  }
  for (const method of terminalMethods) {
    instance[method] = vi.fn().mockResolvedValue(defaultValue)
  }
  const stub = vi.fn().mockReturnValue(instance)
  return {
    instance: cast<Record<C[number] | T[number], Mock>>(instance),
    stub,
    fake: stubToKnex(stub),
  }
}
