'use sanity'

import type { SinonSpyCall, SinonStub } from 'sinon'

// Find the first call to `stub` whose arguments match `predicate`.
// Returns the SpyCall (whose `.args`, `.thisValue`, `.returnValue` etc. can
// be asserted on) or undefined if no call matches.
export function findStubCall(stub: SinonStub, predicate: (args: unknown[]) => boolean): SinonSpyCall | undefined {
  return stub.getCalls().find((c) => predicate(c.args))
}
