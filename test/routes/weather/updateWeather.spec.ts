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
import Sinon from 'sinon'
import { eventuallyRejects } from '#testutils/errors.js'

const sandbox = Sinon.createSandbox()

describe('routes/weather updateWeather', () => {
  let weatherData: OpenWeatherData = {
    main: { temp: 291.15, pressure: 1024.4, humidity: 52.9 },
    weather: [{ main: 'weatherMain', icon: 'weatherIcon' }],
    sys: { sunrise: 123.5, sunset: 455.5 },
  }
  let getLatestSunriseStub = sandbox.stub()
  let getEarliestSunsetStub = sandbox.stub()
  let getWeatherStub = sandbox.stub()

  beforeEach(() => {
    weatherData = {
      main: { temp: 291.15, pressure: 1024.4, humidity: 52.9 },
      weather: [{ main: 'weatherMain', icon: 'weatherIcon' }],
      sys: { sunrise: 123000, sunset: 456000 },
    }
    getLatestSunriseStub = sandbox.stub(Imports, 'getLatestSunrise').returns(123000)
    getEarliestSunsetStub = sandbox.stub(Imports, 'getEarliestSunset').returns(456000)
    getWeatherStub = sandbox.stub(Internals, 'getWeather').resolves(weatherData)
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
    sandbox.restore()
  })
  it('should reject when getEarliestSunset throws', async () => {
    const err = new Error('FOO!')
    getEarliestSunsetStub.throws(err)
    const result = await eventuallyRejects(updateWeather())
    expect(result).toBe(err)
  })
  it('should reject when getLatestSunrise throws', async () => {
    const err = new Error('FOO!')
    getLatestSunriseStub.throws(err)
    const result = await eventuallyRejects(updateWeather())
    expect(result).toBe(err)
  })
  it('should return Weather', async () => {
    const result = await updateWeather()
    expect(result).toBe(Weather)
  })
  const errorTests: Array<[string, (data: WeatherResults) => void]> = [
    [
      'return Weather',
      (result) => {
        expect(result).toBe(Weather)
      },
    ],
    [
      'set default temp',
      (weather) => {
        expect(weather.temp).toBe(undefined)
      },
    ],
    [
      'set default pressure',
      (weather) => {
        expect(weather.pressure).toBe(undefined)
      },
    ],
    [
      'set default humidity',
      (weather) => {
        expect(weather.humidity).toBe(undefined)
      },
    ],
    [
      'set default description',
      (weather) => {
        expect(weather.description).toBe(undefined)
      },
    ],
    [
      'set default icon',
      (weather) => {
        expect(weather.icon).toBe(undefined)
      },
    ],
    [
      'set default sunrise',
      (weather) => {
        expect(weather.sunrise).toBe(123000)
      },
    ],
    [
      'set default sunset',
      (weather) => {
        expect(weather.sunset).toBe(456000)
      },
    ],
  ]
  errorTests.forEach(([title, validationFn]) => {
    it(`should ${title} when fetch rejects`, async () => {
      getWeatherStub.rejects(new Error('foo!'))
      const result = await updateWeather()
      validationFn(result)
    })
    it(`should ${title} when fetch throws`, async () => {
      getWeatherStub.throws(new Error('foo!'))
      const result = await updateWeather()
      validationFn(result)
    })
  })
  const successTests: Array<[string, () => void, (data: WeatherResults) => void]> = [
    [
      'set temp from kelvin',
      () => (weatherData.main = { temp: 291.15, pressure: 0, humidity: 0 }),
      (data) => {
        expect(data.temp).toBe(18)
      },
    ],
    [
      'set pressure',
      () => (weatherData.main = { temp: 0, pressure: 1024.4, humidity: 0 }),
      (data) => {
        expect(data.pressure).toBe(1024.4)
      },
    ],
    [
      'set humidity',
      () => (weatherData.main = { temp: 0, pressure: 0, humidity: 21.7 }),
      (data) => {
        expect(data.humidity).toBe(21.7)
      },
    ],
    [
      'retain temp missing main',
      () => (weatherData.main = undefined),
      (data) => {
        expect(data.temp).toBe(-4.1)
      },
    ],
    [
      'retain pressure missing main',
      () => (weatherData.main = undefined),
      (d) => {
        expect(d.pressure).toBe(1000)
      },
    ],
    [
      'retain humidity missing main',
      () => (weatherData.main = undefined),
      (d) => {
        expect(d.humidity).toBe(72.1)
      },
    ],
    [
      'set description from first forecast',
      () =>
        (weatherData.weather = [
          { main: 'Sunny in Philly', icon: 'Icon' },
          { main: 'Bad Description', icon: 'Bad Icon' },
        ]),
      (data) => {
        expect(data.description).toBe('Sunny in Philly')
      },
    ],
    [
      'set empty description from missing forecast',
      () => (weatherData.weather = []),
      (data) => {
        expect(data.description).toBe(undefined)
      },
    ],
    [
      'set icon from first forecast',
      () =>
        (weatherData.weather = [
          { main: 'Bad Description', icon: 'Sunny in Philly' },
          { main: 'Bad Description', icon: 'Bad Icon' },
        ]),
      (data) => {
        expect(data.icon).toBe('Sunny in Philly')
      },
    ],
    [
      'set empty icon from missing forecast',
      () => (weatherData.weather = []),
      (data) => {
        expect(data.icon).toBe(undefined)
      },
    ],
    [
      'convert sunrise to milliseconds',
      () => (weatherData.sys.sunrise = 120.7),
      (d) => {
        expect(d.sunrise).toBe(120700)
      },
    ],
    [
      'set sunrise',
      () => (weatherData.sys.sunrise = 12.7),
      (d) => {
        expect(d.sunrise).toBe(12700)
      },
    ],
    [
      'override sunrise too late',
      () => (weatherData.sys.sunrise = 128.7),
      (d) => {
        expect(d.sunrise).toBe(123000)
      },
    ],
    [
      'override sunset too early',
      () => (weatherData.sys.sunset = 420.7),
      (d) => {
        expect(d.sunset).toBe(456000)
      },
    ],
    [
      'set sunset',
      () => (weatherData.sys.sunset = 501.2),
      (d) => {
        expect(d.sunset).toBe(501200)
      },
    ],
  ]
  successTests.forEach(([title, setupFn, validationFn]) => {
    it(`should ${title} when fetch resolves`, async () => {
      setupFn()
      const result = await updateWeather()
      validationFn(result)
    })
  })
  it('should set pressure to zero when API returns zero pressure', async () => {
    weatherData.main = { temp: 0, pressure: 0, humidity: 0 }
    const result = await updateWeather()
    expect(result.pressure).toBe(0)
  })
  it('should set humidity to zero when API returns zero humidity', async () => {
    weatherData.main = { temp: 0, pressure: 0, humidity: 0 }
    const result = await updateWeather()
    expect(result.humidity).toBe(0)
  })
  it('should set temp from zero kelvin when API returns zero temp', async () => {
    weatherData.main = { temp: 0, pressure: 0, humidity: 0 }
    const result = await updateWeather()
    expect(result.temp).toBe(-273.15)
  })
  describe('logging when getWeather rejects', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })
    it('should log the weather-update failure', async () => {
      getWeatherStub.rejects(new Error('openweather down'))
      await updateWeather()
      const hasLog = loggerStub.getCalls().some((c) => c.args[0] === 'updateWeather error')
      expect(hasLog).toBe(true)
    })
    it('should include the rejection error in the log arguments', async () => {
      const err = new Error('openweather down')
      getWeatherStub.rejects(err)
      await updateWeather()
      const logCall = loggerStub.getCalls().find((c) => c.args[0] === 'updateWeather error')
      expect(logCall?.args[1]).toBe(err)
    })
    it('should log once per failed call even though fields are reset', async () => {
      getWeatherStub.rejects(new Error('openweather down'))
      await updateWeather()
      const matching = loggerStub.getCalls().filter((c) => c.args[0] === 'updateWeather error')
      expect(matching).toHaveLength(1)
    })
    it('should log skipped-format when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.rejects(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      expect(loggerStub.firstCall.args[0]).toBe('updateWeather skipped: %s')
    })
    it('should pass the error message string when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.rejects(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      expect(loggerStub.firstCall.args[1]).toBe('no OpenWeather AppId Defined!')
    })
    it('should not include any Error instance in log args when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.rejects(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      const hasErrorArg = loggerStub.firstCall.args.some((a: unknown) => a instanceof Error)
      expect(hasErrorArg).toBe(false)
    })
    it('should not log error-format when getWeather rejects with WeatherConfigError', async () => {
      getWeatherStub.rejects(new WeatherConfigError('no OpenWeather AppId Defined!'))
      await updateWeather()
      const hasErrorFormat = loggerStub.getCalls().some((c) => c.args[0] === 'updateWeather error')
      expect(hasErrorFormat).toBe(false)
    })
  })
})
