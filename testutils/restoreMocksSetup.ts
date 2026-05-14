'use sanity'

import { afterEach, vi } from 'vitest'

// Restore every spy/mock between tests so describe-scope lets and beforeEach
// stubs reset back to their original implementations. Spec files no longer
// need their own `afterEach(() => vi.restoreAllMocks())` — this setup runs
// after every test in every spec.
//
// Vitest hook order: setup-file afterEach hooks run AFTER per-file afterEach
// hooks, so any spec-level cleanup that still depends on stubs being live
// runs first, then this restores everything.
afterEach(() => {
  vi.restoreAllMocks()
})
