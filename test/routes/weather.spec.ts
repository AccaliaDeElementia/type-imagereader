'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import type { Application, Router } from 'express'
import type { Server } from 'http'
import type { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'

import { getRouter, Functions, Imports } from '../../routes/weather'
import type { OpenWeatherData } from '../../routes/weather'
import assert from 'assert'

@suite
export class ImportsEnvironmentLookupTests {
  clock = {} as unknown as Sinon.SinonFakeTimers
  tz? = ''

  before (): void {
    this.tz = process.env.TZ
    process.env.TZ = 'UTC'
    this.clock = sinon.useFakeTimers(946684800000) // 2000-01-01T00:00:00.000Z
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
    delete process.env.NIGHT_NOT_BEFORE
    delete process.env.NIGHT_NOT_BEFORE
  }

  after (): void {
    this.clock.restore()
    process.env.TZ = this.tz
  }

  @test
  'appId: it should return empty string when env undefined' (): void {
    delete process.env.OPENWEATHER_APPID
    expect(Imports.appId).to.equal('')
  }

  @test
  'appId: it should return empty string when env empty' (): void {
    process.env.OPENWEATHER_APPID = ''
    expect(Imports.appId).to.equal('')
  }

  @test
  'appId: it should return env string when set' (): void {
    process.env.OPENWEATHER_APPID = 'foo'
    expect(Imports.appId).to.equal('foo')
  }

  @test
  'location: it should return empty string when env undefined' (): void {
    delete process.env.OPENWEATHER_LOCATION
    expect(Imports.location).to.equal('')
  }

  @test
  'location: it should return empty string when env empty' (): void {
    process.env.OPENWEATHER_LOCATION = ''
    expect(Imports.location).to.equal('')
  }

  @test
  'location: it should return env string when set' (): void {
    process.env.OPENWEATHER_LOCATION = 'foo'
    expect(Imports.location).to.equal('foo')
  }

  @test
  'location: it should URI encode string when set' (): void {
    process.env.OPENWEATHER_LOCATION = 'foo bar'
    expect(Imports.location).to.equal('foo%20bar')
  }

  @test
  'nightNotBefore: it should return default time when env undefined' (): void {
    delete process.env.NIGHT_NOT_BEFORE
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotBefore: it should return default time when env blank' (): void {
    process.env.NIGHT_NOT_BEFORE = ''
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotBefore: it should return configured time when env specifies hour only' (): void {
    process.env.NIGHT_NOT_BEFORE = '16'
    expect(Imports.nightNotBefore).to.equal(946742400000) // 2000-01-01T16:00:00.000
  }

  @test
  'nightNotBefore: it should return configured time when env specifies hour: only' (): void {
    process.env.NIGHT_NOT_BEFORE = '16:'
    expect(Imports.nightNotBefore).to.equal(946742400000) // 2000-01-01T16:00:00.000
  }

  @test
  'nightNotBefore: it should return configured time when env specifies hour and minute' (): void {
    process.env.NIGHT_NOT_BEFORE = '16:15'
    expect(Imports.nightNotBefore).to.equal(946743300000) // 2000-01-01T16:00:00.000
  }

  @test
  'nightNotBefore: it should return default time when env has NaN hour' (): void {
    process.env.NIGHT_NOT_BEFORE = 'Foo:15'
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotBefore: it should return default time when env has negative hour' (): void {
    process.env.NIGHT_NOT_BEFORE = '-1:15'
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotBefore: it should return default time when env has out of range hour' (): void {
    process.env.NIGHT_NOT_BEFORE = '24:15'
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotBefore: it should return default time when env has NaN minute' (): void {
    process.env.NIGHT_NOT_BEFORE = '16:Foo'
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotBefore: it should return default time when env has negative minute' (): void {
    process.env.NIGHT_NOT_BEFORE = '16:-1'
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotBefore: it should return default time when env has out of range minute' (): void {
    process.env.NIGHT_NOT_BEFORE = '16:60'
    expect(Imports.nightNotBefore).to.equal(946760400000) // 2000-01-01T21:00:00.000
  }

  @test
  'nightNotAfter: it should return default time when env undefined' (): void {
    delete process.env.NIGHT_NOT_AFTER
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }

  @test
  'nightNotAfter: it should return default time when env blank' (): void {
    process.env.NIGHT_NOT_AFTER = ''
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }

  @test
  'nightNotAfter: it should return requested time time when env has only hour' (): void {
    process.env.NIGHT_NOT_AFTER = '07'
    expect(Imports.nightNotAfter).to.equal(946710000000) // 2000-01-01T07:00:00.000
  }

  @test
  'nightNotAfter: it should return requested time time when env has only hour:' (): void {
    process.env.NIGHT_NOT_AFTER = '07:'
    expect(Imports.nightNotAfter).to.equal(946710000000) // 2000-01-01T07:00:00.000
  }

  @test
  'nightNotAfter: it should return requested time time when env has hour and minute' (): void {
    process.env.NIGHT_NOT_AFTER = '07:15'
    expect(Imports.nightNotAfter).to.equal(946710900000) // 2000-01-01T07:00:00.000
  }

  @test
  'nightNotAfter: it should return default time when env has NaN Hour' (): void {
    process.env.NIGHT_NOT_AFTER = 'Foo:30'
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }

  @test
  'nightNotAfter: it should return default time when env has negative Hour' (): void {
    process.env.NIGHT_NOT_AFTER = '-1:30'
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }

  @test
  'nightNotAfter: it should return default time when env has out of range Hour' (): void {
    process.env.NIGHT_NOT_AFTER = '24:30'
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }

  @test
  'nightNotAfter: it should return default time when env has NaN minute' (): void {
    process.env.NIGHT_NOT_AFTER = '06:Foo'
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }

  @test
  'nightNotAfter: it should return default time when env has negative minute' (): void {
    process.env.NIGHT_NOT_AFTER = '06:-1'
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }

  @test
  'nightNotAfter: it should return default time when env has out of range minute' (): void {
    process.env.NIGHT_NOT_AFTER = '06:60'
    expect(Imports.nightNotAfter).to.equal(946707300000) // 2000-01-01T06:15:00.000
  }
}

@suite
export class WeatherFunctionsGetWeatherTests {
  FetchStub?: Sinon.SinonStub

  FetchResult = {
    json: sinon.stub().resolves()
  }

  before (): void {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
    this.FetchStub = sinon.stub(Imports, 'fetch').resolves(this.FetchResult as unknown as globalThis.Response)
  }

  after (): void {
    this.FetchStub?.restore()
  }

  @test
  async 'it should reject when appid not set' (): Promise<void> {
    process.env.OPENWEATHER_LOCATION = 'location'
    await Functions.GetWeather().then(
      () => expect.fail('should not have resolved!'),
      (e) => {
        expect(e).to.be.an('Error')
        expect(e.message).to.equal('no OpewnWeather AppId Defined!')
      })
  }

  @test
  async 'it should reject when location not set' (): Promise<void> {
    process.env.OPENWEATHER_APPID = 'appid'
    await Functions.GetWeather().then(
      () => expect.fail('should not have resolved!'),
      (e) => {
        expect(e).to.be.an('Error')
        expect(e.message).to.equal('no OpewnWeather Location Defined!')
      })
  }

  @test
  async 'it should reject when fetch fail' (): Promise<void> {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    const err = new Error('FETCH FAIL')
    this.FetchStub?.rejects(err)
    await Functions.GetWeather().then(
      () => expect.fail('should not have resolved!'),
      (e) => expect(e).to.equal(err))
  }

  @test
  async 'it should fetch from version 2.5 of the weather api' (): Promise<void> {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    await Functions.GetWeather()
    expect(this.FetchStub?.callCount).to.equal(1)
    expect(this.FetchStub?.firstCall.args).to.deep
      .equal(['https://api.openweathermap.org/data/2.5/weather?q=location&appid=appid'])
  }

  @test
  async 'it should return parsed JSON' (): Promise<void> {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    const data = { data: Math.random() }
    this.FetchResult.json.resolves(data)
    const result = await Functions.GetWeather()
    expect(this.FetchResult.json.callCount).to.equal(1)
    expect(result).to.equal(data)
  }

  @test
  async 'it should reject when JSON parse fails' (): Promise<void> {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    const err = new Error('JSON PARSE FAIL')
    this.FetchResult.json.rejects(err)
    await Functions.GetWeather().then(
      () => expect.fail('should not have resolved!'),
      (e) => expect(e).to.equal(err))
  }
}

@suite
export class WeatherFunctionsUpdateWeatherTests {
  GetWeatherStub?: Sinon.SinonStub
  NightNotBeforeStub = sinon.stub()
  NightNotAfterStub = sinon.stub()

  weatherData: OpenWeatherData = {
    main: {
      temp: 273.15,
      pressure: 12,
      humidity: 12
    },
    weather: [
      {
        main: 'Clouds',
        icon: 'clouds'
      }
    ],
    sys: {
      sunrise: Date.now() - 1000 * 60 * 60 * 6,
      sunset: Date.now() + 1000 * 60 * 60 * 6
    }
  }

  before (): void {
    Functions.weather.temp = undefined
    Functions.weather.pressure = undefined
    Functions.weather.humidity = undefined
    Functions.weather.description = undefined
    Functions.weather.icon = undefined
    Functions.weather.sunrise = undefined
    Functions.weather.sunset = undefined

    this.GetWeatherStub = sinon.stub(Functions, 'GetWeather').resolves(this.weatherData)
    this.NightNotAfterStub = sinon.stub(Imports, 'nightNotAfter').get(() => Number.MAX_SAFE_INTEGER)
    this.NightNotBeforeStub = sinon.stub(Imports, 'nightNotBefore').get(() => 0)
  }

  after (): void {
    this.NightNotBeforeStub.restore()
    this.NightNotAfterStub.restore()
    this.GetWeatherStub?.restore()
  }

  @test
  async 'it should call GetWeather' (): Promise<void> {
    await Functions.UpdateWeather()
    expect(this.GetWeatherStub?.callCount).to.equal(1)
    expect(this.GetWeatherStub?.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should return weatherdata' (): Promise<void> {
    const data = await Functions.UpdateWeather()
    expect(data).to.equal(Functions.weather)
  }

  @test
  async 'it should return weatherdata on error too' (): Promise<void> {
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    const data = await Functions.UpdateWeather()
    expect(data).to.equal(Functions.weather)
  }

  @test
  async 'it should set temp in celcius from kelvin' (): Promise<void> {
    this.weatherData.main = { temp: 273.15, pressure: 0, humidity: 0 }
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(0)
    this.weatherData.main = { temp: 293.15, pressure: 0, humidity: 0 }
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(20)
  }

  @test
  async 'it should set pressure' (): Promise<void> {
    this.weatherData.main = { temp: 273.15, pressure: 1011, humidity: 0 }
    await Functions.UpdateWeather()
    expect(Functions.weather.pressure).to.equal(1011)
  }

  @test
  async 'it should set humidity' (): Promise<void> {
    this.weatherData.main = { temp: 273.15, pressure: 0, humidity: 75 }
    await Functions.UpdateWeather()
    expect(Functions.weather.humidity).to.equal(75)
  }

  @test
  async 'it should fail to set temp if main data missing' (): Promise<void> {
    (this.weatherData as any).main = null
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(undefined)
  }

  @test
  async 'it should fail to set pressure if main data missing' (): Promise<void> {
    (this.weatherData as any).main = null
    await Functions.UpdateWeather()
    expect(Functions.weather.pressure).to.equal(undefined)
  }

  @test
  async 'it should fail to set humidity if main data missing' (): Promise<void> {
    (this.weatherData as any).main = null
    await Functions.UpdateWeather()
    expect(Functions.weather.humidity).to.equal(undefined)
  }

  @test
  async 'it should set description from weather forecast' (): Promise<void> {
    const expected = `Description ${Math.random()}`
    this.weatherData.weather = [{ main: expected, icon: 'Icon' }]
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(expected)
  }

  @test
  async 'it should set description from first weather forecast' (): Promise<void> {
    const expected = `Description ${Math.random()}`
    this.weatherData.weather = [{ main: expected, icon: 'Icon' }, { main: 'Bad Description', icon: 'Bad Icon' }]
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(expected)
  }

  @test
  async 'it should set blank description from none weather forecast' (): Promise<void> {
    this.weatherData.weather = []
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(undefined)
  }

  @test
  async 'it should set icon from weather forecast' (): Promise<void> {
    const expected = `Icon ${Math.random()}`
    this.weatherData.weather = [{ main: 'Description', icon: expected }]
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(expected)
  }

  @test
  async 'it should set icon from first weather forecast' (): Promise<void> {
    const expected = `Icon ${Math.random()}`
    this.weatherData.weather = [{ main: 'Description', icon: expected }, { main: 'Bad Description', icon: 'Bad Icon' }]
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(expected)
  }

  @test
  async 'it should set blank icon from none weather forecast' (): Promise<void> {
    this.weatherData.weather = []
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(undefined)
  }

  @test
  async 'it should set sunrise in ms from s' (): Promise<void> {
    this.weatherData.sys.sunrise = 42
    await Functions.UpdateWeather()
    expect(Functions.weather.sunrise).to.equal(42000)
  }

  @test
  async 'it should set sunrise from NightNotAfter when sunrise too late' (): Promise<void> {
    this.weatherData.sys.sunrise = 62
    this.NightNotAfterStub.get(() => 42000)
    await Functions.UpdateWeather()
    expect(Functions.weather.sunrise).to.equal(42000)
  }

  @test
  async 'it should set sunset in ms from s' (): Promise<void> {
    this.weatherData.sys.sunset = 42
    await Functions.UpdateWeather()
    expect(Functions.weather.sunset).to.equal(42000)
  }

  @test
  async 'it should set sunset from NightNotBefore when sunset too early' (): Promise<void> {
    this.weatherData.sys.sunset = 12
    this.NightNotBeforeStub.get(() => 42000)
    await Functions.UpdateWeather()
    expect(Functions.weather.sunset).to.equal(42000)
  }

  @test
  async 'it should clear temp on error' (): Promise<void> {
    Functions.weather.temp = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(undefined)
  }

  @test
  async 'it should clear pressure on error' (): Promise<void> {
    Functions.weather.pressure = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.pressure).to.equal(undefined)
  }

  @test
  async 'it should clear humidity on error' (): Promise<void> {
    Functions.weather.humidity = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.humidity).to.equal(undefined)
  }

  @test
  async 'it should clear description on error' (): Promise<void> {
    Functions.weather.description = 'SEXY DESCRIPTION'
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(undefined)
  }

  @test
  async 'it should clear icon on error' (): Promise<void> {
    Functions.weather.icon = 'SEXY ICON'
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(undefined)
  }

  @test
  async 'it should set sunrise to NightNotAfter on error' (): Promise<void> {
    Functions.weather.sunrise = 69
    this.NightNotAfterStub.get(() => 314159)
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.sunrise).to.equal(314159)
  }

  @test
  async 'it should set sunset to NightNotBefore on error' (): Promise<void> {
    Functions.weather.sunset = 69
    this.NightNotBeforeStub.get(() => 314159)
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.sunset).to.equal(314159)
  }
}

@suite
export class WeatherRouterTests {
  ApplicationFake = {} as unknown as Application
  ServerFake = {} as unknown as Server
  WebsocketsFake = {} as unknown as WebSocketServer

  RouterFake = {
    get: sinon.stub().returnsThis()
  }

  RequestStub = {
    params: [] as string[]
  }

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis()
  }

  RouterStub?: Sinon.SinonStub
  SetIntervalStub?: Sinon.SinonStub
  UpdateWeatherStub?: Sinon.SinonStub

  before (): void {
    this.RouterStub = sinon.stub(Imports, 'Router').returns(this.RouterFake as unknown as Router)
    this.SetIntervalStub = sinon.stub(Imports, 'setInterval')
    this.UpdateWeatherStub = sinon.stub(Functions, 'UpdateWeather').resolves()
  }

  after (): void {
    this.RouterStub?.restore()
    this.SetIntervalStub?.restore()
    this.UpdateWeatherStub?.restore()
  }

  @test
  async 'it should return router from getRouter' (): Promise<void> {
    const result = await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(result).to.equal(this.RouterFake)
  }

  @test
  async 'it should tolerate update weather rejecting on initial call' (): Promise<void> {
    const awaiter = new Promise<void>(resolve => { resolve() })
    this.UpdateWeatherStub?.rejects(new Error('FOO!'))
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    await awaiter
    expect(this.UpdateWeatherStub?.callCount).to.equal(1)
  }

  @test
  async 'it should update weather immediately' (): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.UpdateWeatherStub?.callCount).to.equal(1)
    expect(this.UpdateWeatherStub?.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should update weather using setInterval' (): Promise<void> {
    this.UpdateWeatherStub?.resolves()
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    this.UpdateWeatherStub?.resetHistory()
    expect(this.SetIntervalStub?.callCount).to.equal(1)
    expect(this.SetIntervalStub?.firstCall.args).to.have.lengthOf(2)
    const fn = this.SetIntervalStub?.firstCall.args[0] as () => void
    assert(fn != null)
    expect(this.UpdateWeatherStub?.called).to.equal(false)
    fn()
    expect(this.UpdateWeatherStub?.called).to.equal(true)
    expect(this.SetIntervalStub?.firstCall.args[1]).to.equal(600_000)
  }

  @test
  async 'it should tolerate UpdateWearther rejecting' (): Promise<void> {
    this.UpdateWeatherStub?.rejects(new Error('FOO'))
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    await Promise.resolve()
    assert(true, 'should not get an exception nor break due to unhandled promise rejection')
  }

  @test
  async 'it should tolerate UpdateWearther rejecting in setInterval' (): Promise<void> {
    this.UpdateWeatherStub?.resolves()
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    this.UpdateWeatherStub?.resetHistory()
    this.UpdateWeatherStub?.rejects(new Error('FOO'))
    const fn = this.SetIntervalStub?.firstCall.args[0] as () => void
    assert(fn != null)
    fn()
    await Promise.resolve()
    assert(true, 'should not get an exception nor break due to unhandled promise rejection')
  }

  @test
  async 'it should register get handler for /' (): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.callCount).to.equal(1)
    expect(this.RouterFake.get.firstCall.args).to.have.lengthOf(2)
    expect(this.RouterFake.get.firstCall.args[0]).to.equal('/')
  }

  @test
  async 'it should send weather for / route' (): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.firstCall.args[1]
    assert(fn != null, 'fn should be defined!')
    expect(fn).to.be.a('function')
    await fn(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.equal(Functions.weather)
  }

  @test
  async 'it should send error for error in / route' (): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.firstCall.args[1]
    assert(fn != null, 'fn should be defined!')
    expect(fn).to.be.a('function')
    this.ResponseStub.status.onFirstCall().throws(new Error('I DON\'T WANNA'))
    await fn(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(2)
    expect(this.ResponseStub.status.secondCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal({
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal Server Error'
      }
    })
  }
}
