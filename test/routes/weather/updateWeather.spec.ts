'use sanity'

import {
  updateWeather,
  Internals,
  Imports,
  Weather,
  WeatherConfigError,
  type OpenWeatherData,
  type WeatherResults,
} from '#routes/weather.js'
import { eventuallyRejects } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

describe('routes/weather updateWeather', () => {
  let weatherData: OpenWeatherData = {
    main: { temp: 291.15, pressure: 1024.4, humidity: 52.9 },
    weather: [{ main: 'weatherMain', icon: 'weatherIcon' }],
    sys: { sunrise: 123.5, sunset: 455.5 },
  }
  let getLatestSunriseStub: MockInstance = vi.fn()
  let getEarliestSunsetStub: MockInstance = vi.fn()
  let getWeatherStub: MockInstance = vi.fn()

  beforeEach(() => {
    weatherData = {
      main: { temp: 291.15, pressure: 1024.4, humidity: 52.9 },
      weather: [{ main: 'weatherMain', icon: 'weatherIcon' }],
      sys: { sunrise: 123000, sunset: 456000 },
    }
    getLatestSunriseStub = vi.spyOn(Imports, 'getLatestSunrise').mockReturnValue(123000)
    getEarliestSunsetStub = vi.spyOn(Imports, 'getEarliestSunset').mockReturnValue(456000)
    getWeatherStub = vi.spyOn(Internals, 'getWeather').mockResolvedValue(weatherData)
    Object.assign(Weather, {
      temp: -4.1,
      pressure: 1000.0,
      humidity: 72.1,
      description: 'defaultDescription',
      icon: 'defaultIcon',
      sunrise: -123000,
      sunset: -456000,
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when sun-time helpers throw', () => {
    it('should reject when getEarliestSunset throws', async () => {
      const err = new Error('FOO!')
      getEarliestSunsetStub.mockImplementation(() => {
        throw err
      })
      const result = await eventuallyRejects(updateWeather())
      expect(result).toBe(err)
    })
    it('should reject when getLatestSunrise throws', async () => {
      const err = new Error('FOO!')
      getLatestSunriseStub.mockImplementation(() => {
        throw err
      })
      const result = await eventuallyRejects(updateWeather())
      expect(result).toBe(err)
    })
  })

  describe('when getWeather resolves', () => {
    it('should return Weather', async () => {
      const result = await updateWeather()
      expect(result).toBe(Weather)
    })

    describe('with main present', () => {
      it('should convert temp from kelvin to celsius', async () => {
        weatherData.main = { temp: 291.15, pressure: 0, humidity: 0 }
        const result = await updateWeather()
        expect(result.temp).toBe(18)
      })
      it('should pass pressure through unchanged', async () => {
        weatherData.main = { temp: 0, pressure: 1024.4, humidity: 0 }
        const result = await updateWeather()
        expect(result.pressure).toBe(1024.4)
      })
      it('should pass humidity through unchanged', async () => {
        weatherData.main = { temp: 0, pressure: 0, humidity: 21.7 }
        const result = await updateWeather()
        expect(result.humidity).toBe(21.7)
      })
    })

    describe('with main having zero values', () => {
      let result: WeatherResults = Weather
      beforeEach(async () => {
        weatherData.main = { temp: 0, pressure: 0, humidity: 0 }
        result = await updateWeather()
      })
      it('should set pressure to zero', () => {
        expect(result.pressure).toBe(0)
      })
      it('should set humidity to zero', () => {
        expect(result.humidity).toBe(0)
      })
      it('should convert zero kelvin to -273.15 celsius for temp', () => {
        expect(result.temp).toBe(-273.15)
      })
    })

    describe('with main = undefined', () => {
      let result: WeatherResults = Weather
      beforeEach(async () => {
        weatherData.main = undefined
        result = await updateWeather()
      })
      it('should retain default temp', () => {
        expect(result.temp).toBe(-4.1)
      })
      it('should retain default pressure', () => {
        expect(result.pressure).toBe(1000)
      })
      it('should retain default humidity', () => {
        expect(result.humidity).toBe(72.1)
      })
    })

    describe('with weather forecast list', () => {
      it('should set description from first forecast', async () => {
        weatherData.weather = [
          { main: 'Sunny in Philly', icon: 'Icon' },
          { main: 'Bad Description', icon: 'Bad Icon' },
        ]
        const result = await updateWeather()
        expect(result.description).toBe('Sunny in Philly')
      })
      it('should set icon from first forecast', async () => {
        weatherData.weather = [
          { main: 'Bad Description', icon: 'Sunny in Philly' },
          { main: 'Bad Description', icon: 'Bad Icon' },
        ]
        const result = await updateWeather()
        expect(result.icon).toBe('Sunny in Philly')
      })
    })

    describe('with empty weather forecast list', () => {
      let result: WeatherResults = Weather
      beforeEach(async () => {
        weatherData.weather = []
        result = await updateWeather()
      })
      it('should set description to undefined', () => {
        expect(result.description).toBe(undefined)
      })
      it('should set icon to undefined', () => {
        expect(result.icon).toBe(undefined)
      })
    })

    describe('sun times', () => {
      it('should convert sunrise to milliseconds', async () => {
        weatherData.sys.sunrise = 120.7
        const result = await updateWeather()
        expect(result.sunrise).toBe(120700)
      })
      it('should set sunrise', async () => {
        weatherData.sys.sunrise = 12.7
        const result = await updateWeather()
        expect(result.sunrise).toBe(12700)
      })
      it('should override sunrise too late with baseline (123000)', async () => {
        weatherData.sys.sunrise = 128.7
        const result = await updateWeather()
        expect(result.sunrise).toBe(123000)
      })
      it('should override sunset too early with baseline (456000)', async () => {
        weatherData.sys.sunset = 420.7
        const result = await updateWeather()
        expect(result.sunset).toBe(456000)
      })
      it('should set sunset', async () => {
        weatherData.sys.sunset = 501.2
        const result = await updateWeather()
        expect(result.sunset).toBe(501200)
      })
    })
  })

  const failureModes: Array<[string, () => void]> = [
    ['rejects', () => getWeatherStub.mockRejectedValue(new Error('foo!'))],
    [
      'throws',
      () =>
        getWeatherStub.mockImplementation(() => {
          throw new Error('foo!')
        }),
    ],
  ]
  failureModes.forEach(([mode, induceFailure]) => {
    describe(`when getWeather ${mode}`, () => {
      let result: WeatherResults = Weather
      beforeEach(async () => {
        induceFailure()
        result = await updateWeather()
      })
      it('should return Weather', () => {
        expect(result).toBe(Weather)
      })
      it('should set temp to undefined', () => {
        expect(result.temp).toBe(undefined)
      })
      it('should set pressure to undefined', () => {
        expect(result.pressure).toBe(undefined)
      })
      it('should set humidity to undefined', () => {
        expect(result.humidity).toBe(undefined)
      })
      it('should set description to undefined', () => {
        expect(result.description).toBe(undefined)
      })
      it('should set icon to undefined', () => {
        expect(result.icon).toBe(undefined)
      })
      it('should set sunrise to baseline (123000)', () => {
        expect(result.sunrise).toBe(123000)
      })
      it('should set sunset to baseline (456000)', () => {
        expect(result.sunset).toBe(456000)
      })
    })
  })

  describe('logging when getWeather rejects', () => {
    let loggerStub: MockInstance = vi.fn()
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    })
    it('should log the weather-update failure', async () => {
      getWeatherStub.mockRejectedValue(new Error('openweather down'))
      await updateWeather()
      const hasLog = loggerStub.mock.calls.some((c) => c[0] === 'updateWeather error')
      expect(hasLog).toBe(true)
    })
    it('should include the rejection error in the log arguments', async () => {
      const err = new Error('openweather down')
      getWeatherStub.mockRejectedValue(err)
      await updateWeather()
      const logCall = loggerStub.mock.calls.find((c) => c[0] === 'updateWeather error')
      expect(logCall?.[1]).toBe(err)
    })
    it('should log once per failed call even though fields are reset', async () => {
      getWeatherStub.mockRejectedValue(new Error('openweather down'))
      await updateWeather()
      const matching = loggerStub.mock.calls.filter((c) => c[0] === 'updateWeather error')
      expect(matching).toHaveLength(1)
    })
    it('should log skipped-format when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.mockRejectedValue(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      expect(loggerStub.mock.calls[0]?.[0]).toBe('updateWeather skipped: %s')
    })
    it('should pass the error message string when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.mockRejectedValue(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      expect(loggerStub.mock.calls[0]?.[1]).toBe('no OpenWeather AppId Defined!')
    })
    it('should not include any Error instance in log args when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.mockRejectedValue(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      const hasErrorArg = loggerStub.mock.calls[0]?.some((a: unknown) => a instanceof Error) ?? false
      expect(hasErrorArg).toBe(false)
    })
    it('should not log error-format when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.mockRejectedValue(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      const hasErrorFormat = loggerStub.mock.calls.some((c) => c[0] === 'updateWeather error')
      expect(hasErrorFormat).toBe(false)
    })
  })
})
