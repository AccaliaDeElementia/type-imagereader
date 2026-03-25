'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions, GetAlmanac } from '#public/scripts/slideshow/weather'
import type { WeatherResults } from '#contracts/weather'
import { expect } from 'chai'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/weather SetAlmanac()', () => {
  let weather: WeatherResults = {}
  beforeEach(() => {
    weather = {}
    const date = new Date(2024, 5, 12, 12, 0, 0, 0)
    sandbox.useFakeTimers({ now: date.getTime() })
  })
  afterEach(() => {
    sandbox.restore()
  })

  it('should set sunrise when sunrise occurs after minimum value', () => {
    const date = new Date(2024, 5, 12, 9, 0, 0, 0)
    weather.sunrise = date.getTime()
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunrise).to.equal(date.getTime())
  })

  it('should set sunrise when sunrise at minimum time', () => {
    const date = new Date(2024, 5, 12, 6, 15, 0, 0)
    weather.sunrise = date.getTime()
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunrise).to.equal(date.getTime())
  })

  it('should override sunrise when sunrise before minimum time', () => {
    weather.sunrise = new Date(2024, 5, 12, 5, 0, 0, 0).getTime()
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunrise).to.equal(new Date(2024, 5, 12, 6, 15, 0, 0).getTime())
  })

  it('should set sunset when sunset occurs before maximum value', () => {
    weather.sunset = new Date(2024, 5, 12, 20, 40, 0, 0).getTime()
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunset).to.equal(new Date(2024, 5, 12, 20, 40, 0, 0).getTime())
  })

  it('should set sunset when sunset at maximum time', () => {
    weather.sunset = new Date(2024, 5, 12, 21, 0, 0, 0).getTime()
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunset).to.equal(new Date(2024, 5, 12, 21, 0, 0, 0).getTime())
  })

  it('should override sunset when sunset after maximum time', () => {
    weather.sunset = new Date(2024, 5, 12, 21, 14, 0, 0).getTime()
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunset).to.equal(new Date(2024, 5, 12, 21, 0, 0, 0).getTime())
  })
  it('should set sunrise to minimum time when sunrise is undefined', () => {
    weather.sunrise = undefined
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunrise).to.equal(new Date(2024, 5, 12, 6, 15, 0, 0).getTime())
  })
  it('should set sunset to maximum time when sunset is undefined', () => {
    weather.sunset = undefined
    Functions.SetAlmanac(weather)
    expect(GetAlmanac().sunset).to.equal(new Date(2024, 5, 12, 21, 0, 0, 0).getTime())
  })
})
