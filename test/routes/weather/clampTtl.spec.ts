'use sanity'

import { Internals, MAX_ICON_TTL_MS } from '#routes/weather.js'

describe('routes/weather clampTtl()', () => {
  it('should return the value unchanged when below the cap', () => {
    expect(Internals.clampTtl(60_000)).toBe(60_000)
  })
  it('should return the cap when above the cap', () => {
    expect(Internals.clampTtl(MAX_ICON_TTL_MS + 1)).toBe(MAX_ICON_TTL_MS)
  })
  it('should return the cap when given the cap exactly', () => {
    expect(Internals.clampTtl(MAX_ICON_TTL_MS)).toBe(MAX_ICON_TTL_MS)
  })
  it('should return zero unchanged', () => {
    expect(Internals.clampTtl(0)).toBe(0)
  })
})
