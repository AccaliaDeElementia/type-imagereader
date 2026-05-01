import type { Knex } from 'knex'
//eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Allow Knex Tests, Use the default Knex typing
type KnexDefault = Knex<{}, unknown>

export function Cast<T>(obj: unknown, isT: (o: unknown) => o is T = (_: unknown): _ is T => true): T {
  if (isT(obj)) return obj
  throw new Error('Object is not correct type to cast')
}

export function IsKnex(_: unknown): _ is KnexDefault {
  return true
}

export function StubToKnex(stub: unknown): KnexDefault {
  // Mirror knex's runtime shape so dialect probes (e.g. IsPostgres) can read
  // knex.client.config.client without throwing. Default to postgresql since
  // that's the project's primary target; tests that need a different dialect
  // can override per-test by stubbing the relevant Imports.* helper.
  if (typeof stub === 'function') {
    Object.assign(stub, { client: { config: { client: 'postgresql' } } })
  }
  if (IsKnex(stub)) return stub
  /* c8 ignore next 2 -- IsKnex always returns true; this throw is unreachable dead code */
  throw new Error('Stub is not KNEX')
}
