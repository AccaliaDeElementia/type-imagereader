'use sanity'

import { afterEach, vi } from 'vitest'

// Vitest runs setup-file afterEach hooks AFTER per-file afterEach hooks, so
// spec-level cleanup that still depends on live stubs runs before this.
afterEach(() => {
  vi.restoreAllMocks()
})
