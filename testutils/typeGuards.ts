'use sanity'

import type { Knex } from 'knex'
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Allow Knex Tests, Use the default Knex typing
type KnexDefault = Knex<{}, unknown>

export function cast<T>(obj: unknown, isT: (o: unknown) => o is T = (_: unknown): _ is T => true): T {
  if (isT(obj)) return obj
  throw new Error('Object is not correct type to cast')
}

export function stubToKnex(stub: unknown): KnexDefault {
  // Dialect probes read knex.client.config.client, which is absent on a bare
  // stub; postgresql is the project's primary target.
  if (typeof stub === 'function') {
    Object.assign(stub, { client: { config: { client: 'postgresql' } } })
  }
  return cast<KnexDefault>(stub)
}
