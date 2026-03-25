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
  if (IsKnex(stub)) return stub
  /* c8 ignore next 2 -- IsKnex always returns true; this throw is unreachable dead code */
  throw new Error('Stub is not KNEX')
}
