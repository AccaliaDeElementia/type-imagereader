'use sanity'

import { expect } from 'chai'
import { Functions, Imports, type OpenWeatherData, type WeatherResults } from '../../../routes/weather'
import Sinon from 'sinon'
import { EventuallyRejects } from '../../testutils/Errors'

describe('routes/weather function UpdateWeather', () => {
  let weatherData: OpenWeatherData = {
    main: { temp: 291.15, pressure: 1024.4, humidity: 52.9 },
    weather: [{ main: 'weatherMain', icon: 'weatherIcon' }],
    sys: { sunrise: 123.5, sunset: 455.5 },
  }
  let getNightNotAfterStub = Sinon.stub()
  let getNightNotBeforeStub = Sinon.stub()
  let getWeatherStub = Sinon.stub()

  beforeEach(() => {
    weatherData = {
      main: { temp: 291.15, pressure: 1024.4, humidity: 52.9 },
      weather: [{ main: 'weatherMain', icon: 'weatherIcon' }],
      sys: { sunrise: 123000, sunset: 456000 },
    }
    getNightNotAfterStub = Sinon.stub(Imports, 'getNightNotAfter').returns(123000)
    getNightNotBeforeStub = Sinon.stub(Imports, 'getNightNotBefore').returns(456000)
    getWeatherStub = Sinon.stub(Functions, 'GetWeather').resolves(weatherData)
    Functions.weather = {
      temp: -4.1,
      pressure: 1000.0,
      humidity: 72.1,
      description: 'defaultDescription',
      icon: 'defaultIcon',
      sunrise: -123000,
      sunset: -456000,
    }
  })
  afterEach(() => {
    getWeatherStub.restore()
    getNightNotBeforeStub.restore()
    getNightNotAfterStub.restore()
  })
  it('should reject when getNightNotBefore throws', async () => {
    const err = new Error('FOO!')
    getNightNotBeforeStub.throws(err)
    const result = await EventuallyRejects(Functions.UpdateWeather())
    expect(result).to.equal(err)
  })
  it('should reject when getNightNotAfter throws', async () => {
    const err = new Error('FOO!')
    getNightNotAfterStub.throws(err)
    const result = await EventuallyRejects(Functions.UpdateWeather())
    expect(result).to.equal(err)
  })
  it('should return Functions.weather', async () => {
    const result = await Functions.UpdateWeather()
    expect(result).to.equal(Functions.weather)
  })
  const errorTests: Array<[string, (data: WeatherResults) => void]> = [
    ['return Functions.weather', (result) => expect(result).to.equal(Functions.weather)],
    ['set default temp', (weather) => expect(weather.temp).to.equal(undefined)],
    ['set default pressure', (weather) => expect(weather.pressure).to.equal(undefined)],
    ['set default humidity', (weather) => expect(weather.humidity).to.equal(undefined)],
    ['set default description', (weather) => expect(weather.description).to.equal(undefined)],
    ['set default idon', (weather) => expect(weather.icon).to.equal(undefined)],
    ['set default sunrise', (weather) => expect(weather.sunrise).to.equal(123000)],
    ['set default sunset', (weather) => expect(weather.sunset).to.equal(456000)],
  ]
  errorTests.forEach(([title, validationFn]) => {
    it(`should ${title} when fetch rejects`, async () => {
      getWeatherStub.rejects(new Error('foo!'))
      const result = await Functions.UpdateWeather()
      validationFn(result)
    })
    it(`should ${title} when fetch throws`, async () => {
      getWeatherStub.rejects(new Error('foo!'))
      const result = await Functions.UpdateWeather()
      expect(result).to.equal(Functions.weather)
    })
  })
  const successTests: Array<[string, () => void, (data: WeatherResults) => void]> = [
    [
      'set temp from kelvin',
      () => (weatherData.main = { temp: 291.15, pressure: 0, humidity: 0 }),
      (data) => expect(data.temp).to.equal(18),
    ],
    [
      'set pressure',
      () => (weatherData.main = { temp: 0, pressure: 1024.4, humidity: 0 }),
      (data) => expect(data.pressure).to.equal(1024.4),
    ],
    [
      'set humuidity',
      () => (weatherData.main = { temp: 0, pressure: 0, humidity: 21.7 }),
      (data) => expect(data.humidity).to.equal(21.7),
    ],
    ['retain temp missing main', () => (weatherData.main = undefined), (data) => expect(data.temp).to.equal(-4.1)],
    ['retain pressure missing main', () => (weatherData.main = undefined), (d) => expect(d.pressure).to.equal(1000)],
    ['retain humidity missing main', () => (weatherData.main = undefined), (d) => expect(d.humidity).to.equal(72.1)],
    [
      'set description from first forecast',
      () =>
        (weatherData.weather = [
          { main: 'Sunny in Philly', icon: 'Icon' },
          { main: 'Bad Description', icon: 'Bad Icon' },
        ]),
      (data) => expect(data.description).to.equal('Sunny in Philly'),
    ],
    [
      'set empty description from missing forecast',
      () => (weatherData.weather = []),
      (data) => expect(data.description).to.equal(undefined),
    ],
    [
      'set icon from first forecast',
      () =>
        (weatherData.weather = [
          { main: 'Bad Description', icon: 'Sunny in Philly' },
          { main: 'Bad Description', icon: 'Bad Icon' },
        ]),
      (data) => expect(data.icon).to.equal('Sunny in Philly'),
    ],
    [
      'set empty icon from missing forecast',
      () => (weatherData.weather = []),
      (data) => expect(data.icon).to.equal(undefined),
    ],
    [
      'convert sunrise to milliseconds',
      () => (weatherData.sys.sunrise = 120.7),
      (d) => expect(d.sunrise).to.equal(120700),
    ],
    ['set sunrise', () => (weatherData.sys.sunrise = 12.7), (d) => expect(d.sunrise).to.equal(12700)],
    ['override sunrise too late', () => (weatherData.sys.sunrise = 128.7), (d) => expect(d.sunrise).to.equal(123000)],
    ['override sunset too early', () => (weatherData.sys.sunset = 420.7), (d) => expect(d.sunset).to.equal(456000)],
    ['set sunset', () => (weatherData.sys.sunset = 501.2), (d) => expect(d.sunset).to.equal(501200)],
  ]
  successTests.forEach(([title, setupFn, validationFn]) => {
    it(`should ${title} when fetch rejects`, async () => {
      setupFn()
      const result = await Functions.UpdateWeather()
      validationFn(result)
    })
  })
})
