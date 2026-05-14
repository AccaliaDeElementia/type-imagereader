'use sanity'

import { getWeather, WeatherConfigError } from '#routes/weather.js'
import { cast } from '#testutils/typeGuards.js'
import { eventuallyRejects } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

describe('routes/weather getWeather', () => {
  let weatherData = {
    weather: [],
    sys: {
      sunrise: 0,
      sunset: 0,
    },
  }
  let fetchStub: MockInstance = vi.fn()
  let fetchResult = {
    json: vi.fn().mockResolvedValue(weatherData),
  }

  beforeEach(() => {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    weatherData = {
      weather: [],
      sys: {
        sunrise: 0,
        sunset: 0,
      },
    }
    fetchResult = {
      json: vi.fn().mockResolvedValue(weatherData),
    }
    fetchStub = vi.spyOn(global, 'fetch').mockResolvedValue(cast<globalThis.Response>(fetchResult))
  })
  afterEach(() => {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
  })
  it('should reject missing appId', async () => {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
    const err = await eventuallyRejects(getWeather())
    expect(err.message).toBe('no OpenWeather AppId Defined!')
  })
  it('should reject with WeatherConfigError when appId is missing', async () => {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
    const err = await eventuallyRejects(getWeather())
    expect(err).toBeInstanceOf(WeatherConfigError)
  })
  it('should reject missing location', async () => {
    delete process.env.OPENWEATHER_LOCATION
    const err = await eventuallyRejects(getWeather())
    expect(err.message).toBe('no OpenWeather Location Defined!')
  })
  it('should reject with WeatherConfigError when location is missing', async () => {
    delete process.env.OPENWEATHER_LOCATION
    const err = await eventuallyRejects(getWeather())
    expect(err).toBeInstanceOf(WeatherConfigError)
  })
  it('should reject when fetch fails', async () => {
    const err = new Error('FOO')
    fetchStub.mockRejectedValue(err)
    const result = await eventuallyRejects(getWeather())
    expect(result).toBe(err)
  })
  it('should reject when fetch throws', async () => {
    const err = new Error('FOO')
    fetchStub.mockRejectedValue(err)
    const result = await eventuallyRejects(getWeather())
    expect(result).toBe(err)
  })
  it('should request expected openweather api url', async () => {
    await getWeather()
    expect(fetchStub.mock.calls[0]?.[0]).toBe('https://api.openweathermap.org/data/2.5/weather?q=location&appid=appid')
  })
  it('should pass an AbortSignal in the fetch options', async () => {
    const sentinelSignal = cast<AbortSignal>({})
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(sentinelSignal)
    await getWeather()
    expect(cast<{ signal: unknown }>(fetchStub.mock.calls[0]?.[1]).signal).toBe(sentinelSignal)
  })
  it('should set the AbortSignal timeout to 60 seconds', async () => {
    const timeoutStub = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(cast<AbortSignal>({}))
    await getWeather()
    expect(timeoutStub.mock.calls[0]).toEqual([60_000])
  })
  it('should return JSON as parsed', async () => {
    const result = await getWeather()
    expect(result).toBe(weatherData)
  })
  it('should reject when fetch rejects', async () => {
    const err = new Error('FOO')
    fetchStub.mockRejectedValue(err)
    const result = await eventuallyRejects(getWeather())
    expect(result).toBe(err)
  })
  it('should reject when fetch throws', async () => {
    const err = new Error('FOO')
    fetchStub.mockImplementation(() => {
      throw err
    })
    const result = await eventuallyRejects(getWeather())
    expect(result).toBe(err)
  })
  it('should reject when json parse rejects', async () => {
    const err = new Error('FOO')
    fetchResult.json.mockRejectedValue(err)
    const result = await eventuallyRejects(getWeather())
    expect(result).toBe(err)
  })
  it('should reject when json parse throws', async () => {
    const err = new Error('FOO')
    fetchResult.json.mockImplementation(() => {
      throw err
    })
    const result = await eventuallyRejects(getWeather())
    expect(result).toBe(err)
  })
  it('should reject when fetch retrieves invalid data', async () => {
    fetchResult.json.mockResolvedValue({})
    const result = await eventuallyRejects(getWeather())
    expect(result.message).toBe('Invalid JSON returned from Open Weather Map')
  })
})
