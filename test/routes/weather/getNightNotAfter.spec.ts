'use sanity'

import { expect } from 'chai'
import { Imports } from '../../../routes/weather'
import Sinon from 'sinon'

describe('routes/weather function getNightNotAfter()', () => {
  let clock: Sinon.SinonFakeTimers | undefined = undefined
  let tz: string | undefined = undefined

  beforeEach(() => {
    tz = process.env.TZ
    process.env.TZ = 'UTC'
    clock = Sinon.useFakeTimers(946684800000) // 2000-01-01T00:00:00.000Z
    delete process.env.NIGHT_NOT_AFTER
  })
  afterEach(() => {
    clock?.restore()
    process.env.TZ = tz
    delete process.env.NIGHT_NOT_AFTER
  })

  const tests: Array<[string, string | undefined, number]> = [
    ['default time when env undefined', undefined, 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env blank', '', 946707300000], // 2000-01-01T06:15:00.000Z
    ['requested time when env has only hour', '07', 946710000000], // 2000-01-01T07:00:00.000Z
    ['requested time when env has only hour:', '07:', 946710000000], // 2000-01-01T07:00:00.000Z
    ['requested time when env has hour and minute', '07:15', 946710900000], // 2000-01-01T07:00:00.000Z
    ['default time when env has NaN Hour', 'Foo', 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env has NaN: Hour', 'Foo:', 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env has NaN:mm Hour', 'Foo:30', 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env has negative Hour', '-1:30', 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env has out of range Hour', '24:30', 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env has NaN minute', '06:Foo', 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env has negative minute', '06:-1', 946707300000], // 2000-01-01T06:15:00.000Z
    ['default time when env has out of range minute', '06:60', 946707300000], // 2000-01-01T06:15:00.000Z
  ]
  tests.forEach(([title, env, expected]) => {
    it(`should return ${title}`, () => {
      if (env != null) {
        process.env.NIGHT_NOT_AFTER = env
      }
      const result = Imports.getNightNotAfter()
      expect(result).to.equal(expected)
    })
  })
})
