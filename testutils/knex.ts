'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from './typeGuards.js'

type KnexQueryStub = Record<string, Sinon.SinonStub>

export function createKnexChainFake<C extends readonly string[], T extends readonly string[]>(
  chainMethods: C,
  terminalMethods: T,
  defaultValue: unknown = [],
): {
  instance: Record<C[number] | T[number], Sinon.SinonStub>
  stub: Sinon.SinonStub
  fake: ReturnType<typeof stubToKnex>
} {
  const instance: KnexQueryStub = {}
  for (const method of chainMethods) {
    instance[method] = Sinon.stub().returnsThis()
  }
  for (const method of terminalMethods) {
    instance[method] = Sinon.stub().resolves(defaultValue)
  }
  const stub = Sinon.stub().returns(instance)
  return {
    instance: cast<Record<C[number] | T[number], Sinon.SinonStub>>(instance),
    stub,
    fake: stubToKnex(stub),
  }
}
