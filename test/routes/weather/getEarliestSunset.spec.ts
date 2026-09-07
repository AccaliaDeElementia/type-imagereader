'use sanity'

import { Imports } from '#routes/weather.js'

const TEST_YEAR = 2000
const JANUARY = 0
const FIRST_OF_MONTH = 1
const utcTime = (hour: number, minute: number): number => Date.UTC(TEST_YEAR, JANUARY, FIRST_OF_MONTH, hour, minute)

const MIDNIGHT = utcTime(0, 0)
const DEFAULT_SUNSET = utcTime(21, 0)
const FOUR_PM = utcTime(16, 0)
const FOUR_FIFTEEN_PM = utcTime(16, 15)

describe('routes/weather getEarliestSunset()', () => {
  let tz: string | undefined = undefined

  beforeEach(() => {
    tz = process.env.TZ
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(MIDNIGHT)
    delete process.env.NIGHT_NOT_BEFORE
  })
  afterEach(() => {
    vi.useRealTimers()
    process.env.TZ = tz
    delete process.env.NIGHT_NOT_BEFORE
  })

  const tests: Array<[string, string | undefined, number]> = [
    ['default time when env undefined', undefined, DEFAULT_SUNSET],
    ['default time when env blank', '', DEFAULT_SUNSET],
    ['configured time when env specifies hour only', '16', FOUR_PM],
    ['configured time when env specifies hour: only', '16:', FOUR_PM],
    ['configured time when env specifies hour and minute', '16:15', FOUR_FIFTEEN_PM],
    ['default time when env has NaN hour', 'Foo', DEFAULT_SUNSET],
    ['default time when env has NaN: hour', 'Foo:', DEFAULT_SUNSET],
    ['default time when env has NaN:mm hour', 'Foo:15', DEFAULT_SUNSET],
    ['default time when env has negative hour', '-1:15', DEFAULT_SUNSET],
    ['default time when env has out of range hour', '24:15', DEFAULT_SUNSET],
    ['default time when env has NaN minute', '16:Foo', DEFAULT_SUNSET],
    ['default time when env has negative minute', '16:-1', DEFAULT_SUNSET],
    ['default time when env has out of range minute', '16:60', DEFAULT_SUNSET],
  ]
  tests.forEach(([title, env, expected]) => {
    it(`should return ${title}`, () => {
      if (env !== undefined) {
        process.env.NIGHT_NOT_BEFORE = env
      }
      const result = Imports.getEarliestSunset()
      expect(result).toBe(expected)
    })
  })
})
