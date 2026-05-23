'use sanity'

import { Internals } from '#routes/weather.js'

describe('routes/weather parseCacheControlMaxAge()', () => {
  it('should return milliseconds for "max-age=N"', () => {
    expect(Internals.parseCacheControlMaxAge('max-age=600')).toBe(600_000)
  })
  it('should extract max-age from compound directives', () => {
    expect(Internals.parseCacheControlMaxAge('public, max-age=3600, must-revalidate')).toBe(3_600_000)
  })
  it('should be insensitive to whitespace around max-age', () => {
    expect(Internals.parseCacheControlMaxAge('public,  max-age=120 , must-revalidate')).toBe(120_000)
  })
  it('should return undefined when header is null', () => {
    expect(Internals.parseCacheControlMaxAge(null)).toBeUndefined()
  })
  it('should return undefined when header has no max-age', () => {
    expect(Internals.parseCacheControlMaxAge('public, must-revalidate')).toBeUndefined()
  })
  it('should return undefined when directive is no-store', () => {
    expect(Internals.parseCacheControlMaxAge('no-store')).toBeUndefined()
  })
  it('should return undefined when directive is no-cache', () => {
    expect(Internals.parseCacheControlMaxAge('no-cache')).toBeUndefined()
  })
  it('should return undefined when directive is no-store even if max-age present', () => {
    expect(Internals.parseCacheControlMaxAge('no-store, max-age=600')).toBeUndefined()
  })
  it('should return undefined when max-age value is not numeric', () => {
    expect(Internals.parseCacheControlMaxAge('max-age=foo')).toBeUndefined()
  })
  it('should return undefined when max-age value is negative', () => {
    expect(Internals.parseCacheControlMaxAge('max-age=-30')).toBeUndefined()
  })
  it('should handle zero max-age as zero ms', () => {
    expect(Internals.parseCacheControlMaxAge('max-age=0')).toBe(0)
  })
})
