'use sanity'

import { IconCache } from '#routes/weather.js'

describe('routes/weather IconCache state singleton', () => {
  it('should expose an entries Map', () => {
    expect(IconCache.entries).toBeInstanceOf(Map)
  })
  it('should not pre-warm with any icon entries at module load (lazy fetch)', () => {
    expect(IconCache.entries.size).toBe(0)
  })
})
