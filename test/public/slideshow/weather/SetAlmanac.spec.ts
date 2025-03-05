'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions, GetAlmanac } from '../../../../public/scripts/slideshow/weather'
import type { WeatherResults } from '../../../../contracts/weather'
import { expect } from 'chai'
import Sinon from 'sinon'

describe('slideshow/weather SetAlmanac()', () => {
  let clocks: Sinon.SinonFakeTimers | null = null
  let weather: WeatherResults = {}
  beforeEach(() => {
    weather = {}
    clocks = Sinon.useFakeTimers({ now: 1741134126910 })
  })
  afterEach(() => {
    clocks?.restore()
  })

  it('should set sunrise when sunrise occurs after minimum value', () => {
    weather.sunrise = 1741093920000
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunrise).to.equal(1741093920000)
  })

  it('should set sunrise when sunrise at minimum time', () => {
    weather.sunrise = 1741086900000
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunrise).to.equal(1741086900000)
  })

  it('should override sunrise when sunrise before minimum time', () => {
    weather.sunrise = 1741086700000
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunrise).to.equal(1741086900000)
  })

  it('should set sunset when sunset occurs before maximum value', () => {
    weather.sunset = 1741093920000
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunset).to.equal(1741093920000)
  })

  it('should set sunset when sunset at maximum time', () => {
    weather.sunset = 1741140000000
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunset).to.equal(1741140000000)
  })

  it('should override sunset when sunset after maximum time', () => {
    weather.sunset = 1742096900000
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunset).to.equal(1741140000000)
  })
})
