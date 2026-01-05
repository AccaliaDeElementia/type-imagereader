'use sanity'

import { expect } from 'chai'
import { Imports } from '../../../routes/weather'
import Sinon from 'sinon'

describe('routes/weather function getNightNotBefore()', () => {
  let clock: Sinon.SinonFakeTimers | undefined = undefined
  let tz: string | undefined = undefined

  beforeEach(() => {
    tz = process.env.TZ
    process.env.TZ = 'UTC'
    clock = Sinon.useFakeTimers(946684800000) // 2000-01-01T00:00:00.000Z
    delete process.env.NIGHT_NOT_BEFORE
  })
  afterEach(() => {
    clock?.restore()
    process.env.TZ = tz
    delete process.env.NIGHT_NOT_BEFORE
  })

  const tests: Array<[string, string | undefined, number]> = [
    ['default time when env undefined', undefined, 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env blank', '', 946760400000], // 2000-01-01T21:00:00.000
    ['configured time when env specifies hour only', '16', 946742400000], // 2000-01-01T16:00:00.000
    ['configured time when env specifies hour: only', '16:', 946742400000], // 2000-01-01T16:00:00.000
    ['configured time when env specifies hour and minute', '16:15', 946743300000], // 2000-01-01T16:00:00.000
    ['default time when env has NaN hour', 'Foo', 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env has NaN: hour', 'Foo:', 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env has NaN:mm hour', 'Foo:15', 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env has negative hour', '-1:15', 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env has out of range hour', '24:15', 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env has NaN minute', '16:Foo', 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env has negative minute', '16:-1', 946760400000], // 2000-01-01T21:00:00.000
    ['default time when env has out of range minute', '16:60', 946760400000], // 2000-01-01T21:00:00.000
  ]
  tests.forEach(([title, env, expected]) => {
    it(`should return ${title}`, () => {
      if (env != null) {
        process.env.NIGHT_NOT_BEFORE = env
      }
      const result = Imports.getNightNotBefore()
      expect(result).to.equal(expected)
    })
  })
})
