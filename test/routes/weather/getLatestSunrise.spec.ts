'use sanity'

import { Imports } from '#routes/weather.js'

const TEST_YEAR = 2000
const JANUARY = 0
const FIRST_OF_MONTH = 1
const utcTime = (hour: number, minute: number): number => Date.UTC(TEST_YEAR, JANUARY, FIRST_OF_MONTH, hour, minute)

const MIDNIGHT = utcTime(0, 0)
const DEFAULT_SUNRISE = utcTime(6, 15)
const SEVEN_AM = utcTime(7, 0)
const SEVEN_FIFTEEN_AM = utcTime(7, 15)

describe('routes/weather getLatestSunrise()', () => {
  let tz: string | undefined = undefined

  beforeEach(() => {
    tz = process.env.TZ
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(MIDNIGHT)
    delete process.env.NIGHT_NOT_AFTER
  })
  afterEach(() => {
    vi.useRealTimers()
    process.env.TZ = tz
    delete process.env.NIGHT_NOT_AFTER
  })

  const tests: Array<[string, string | undefined, number]> = [
    ['default time when env undefined', undefined, DEFAULT_SUNRISE],
    ['default time when env blank', '', DEFAULT_SUNRISE],
    ['requested time when env has only hour', '07', SEVEN_AM],
    ['requested time when env has only hour:', '07:', SEVEN_AM],
    ['requested time when env has hour and minute', '07:15', SEVEN_FIFTEEN_AM],
    ['default time when env has NaN Hour', 'Foo', DEFAULT_SUNRISE],
    ['default time when env has NaN: Hour', 'Foo:', DEFAULT_SUNRISE],
    ['default time when env has NaN:mm Hour', 'Foo:30', DEFAULT_SUNRISE],
    ['default time when env has negative Hour', '-1:30', DEFAULT_SUNRISE],
    ['default time when env has out of range Hour', '24:30', DEFAULT_SUNRISE],
    ['default time when env has NaN minute', '06:Foo', DEFAULT_SUNRISE],
    ['default time when env has negative minute', '06:-1', DEFAULT_SUNRISE],
    ['default time when env has out of range minute', '06:60', DEFAULT_SUNRISE],
  ]
  tests.forEach(([title, env, expected]) => {
    it(`should return ${title}`, () => {
      if (env !== undefined) {
        process.env.NIGHT_NOT_AFTER = env
      }
      const result = Imports.getLatestSunrise()
      expect(result).toBe(expected)
    })
  })
})
