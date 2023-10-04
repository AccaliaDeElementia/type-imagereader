'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Application, Router } from 'express'
import { Server } from 'http'
import { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'

import { getRouter, Functions, Imports, OpenWeatherData } from '../../routes/weather'

@suite
export class WeatherFunctionsGetWeatherTests {
  FetchStub?: Sinon.SinonStub

  FetchResult = {
    json: sinon.stub().resolves()
  }

  before () {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
    this.FetchStub = sinon.stub(Imports, 'fetch').resolves(this.FetchResult as unknown as globalThis.Response)
  }

  after () {
    this.FetchStub?.restore()
  }

  @test
  async 'it should reject when appid not set' () {
    process.env.OPENWEATHER_LOCATION = 'location'
    await Functions.GetWeather().then(
      () => expect.fail('should not have resolved!'),
      (e) => {
        expect(e).to.be.an('Error')
        expect(e.message).to.equal('no OpewnWeather AppId Defined!')
      })
  }

  @test
  async 'it should reject when location not set' () {
    process.env.OPENWEATHER_APPID = 'appid'
    await Functions.GetWeather().then(
      () => expect.fail('should not have resolved!'),
      (e) => {
        expect(e).to.be.an('Error')
        expect(e.message).to.equal('no OpewnWeather Location Defined!')
      })
  }

  @test
  async 'it should reject when fetch fail' () {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    const err = new Error('FETCH FAIL')
    this.FetchStub?.rejects(err)
    await Functions.GetWeather().then(
      () => expect.fail('should not have resolved!'),
      (e) => expect(e).to.equal(err))
  }

  @test
  async 'it should fetch from version 2.5 of the weather api' () {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    await Functions.GetWeather()
    expect(this.FetchStub?.callCount).to.equal(1)
    expect(this.FetchStub?.firstCall.args).to.deep
      .equal(['https://api.openweathermap.org/data/2.5/weather?q=location&appid=appid'])
  }

  @test
  async 'it should return parsed JSON' () {
    process.env.OPENWEATHER_APPID = 'appid'
    process.env.OPENWEATHER_LOCATION = 'location'
    const data = { data: Math.random() }
    this.FetchResult.json.resolves(data)
    const result = await Functions.GetWeather()
    expect(this.FetchResult.json.callCount).to.equal(1)
    expect(result).to.equal(data)
  }

  @test
  async 'it should reject when JSON parse fails' () {
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

  before () {
    Functions.weather.temp = undefined
    Functions.weather.pressure = undefined
    Functions.weather.humidity = undefined
    Functions.weather.description = undefined
    Functions.weather.icon = undefined
    Functions.weather.sunrise = undefined
    Functions.weather.sunset = undefined

    this.GetWeatherStub = sinon.stub(Functions, 'GetWeather').resolves(this.weatherData)
  }

  after () {
    this.GetWeatherStub?.restore()
  }

  @test
  async 'it should call GetWeather' () {
    await Functions.UpdateWeather()
    expect(this.GetWeatherStub?.callCount).to.equal(1)
    expect(this.GetWeatherStub?.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should return weatherdata' () {
    const data = await Functions.UpdateWeather()
    expect(data).to.equal(Functions.weather)
  }

  @test
  async 'it should return weatherdata on error too' () {
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    const data = await Functions.UpdateWeather()
    expect(data).to.equal(Functions.weather)
  }

  @test
  async 'it should set temp in celcius from kelvin' () {
    this.weatherData.main = { temp: 273.15, pressure: 0, humidity: 0 }
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(0)
    this.weatherData.main = { temp: 293.15, pressure: 0, humidity: 0 }
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(20)
  }

  @test
  async 'it should set pressure' () {
    this.weatherData.main = { temp: 273.15, pressure: 1011, humidity: 0 }
    await Functions.UpdateWeather()
    expect(Functions.weather.pressure).to.equal(1011)
  }

  @test
  async 'it should set humidity' () {
    this.weatherData.main = { temp: 273.15, pressure: 0, humidity: 75 }
    await Functions.UpdateWeather()
    expect(Functions.weather.humidity).to.equal(75)
  }

  @test
  async 'it should fail to set temp if main data missing' () {
    (this.weatherData as any).main = null
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(undefined)
  }

  @test
  async 'it should fail to set pressure if main data missing' () {
    (this.weatherData as any).main = null
    await Functions.UpdateWeather()
    expect(Functions.weather.pressure).to.equal(undefined)
  }

  @test
  async 'it should fail to set humidity if main data missing' () {
    (this.weatherData as any).main = null
    await Functions.UpdateWeather()
    expect(Functions.weather.humidity).to.equal(undefined)
  }

  @test
  async 'it should set description from weather forecast' () {
    const expected = `Description ${Math.random()}`
    this.weatherData.weather = [{ main: expected, icon: 'Icon' }]
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(expected)
  }

  @test
  async 'it should set description from first weather forecast' () {
    const expected = `Description ${Math.random()}`
    this.weatherData.weather = [{ main: expected, icon: 'Icon' }, { main: 'Bad Description', icon: 'Bad Icon' }]
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(expected)
  }

  @test
  async 'it should set blank description from none weather forecast' () {
    this.weatherData.weather = []
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(undefined)
  }

  @test
  async 'it should set icon from weather forecast' () {
    const expected = `Icon ${Math.random()}`
    this.weatherData.weather = [{ main: 'Description', icon: expected }]
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(expected)
  }

  @test
  async 'it should set icon from first weather forecast' () {
    const expected = `Icon ${Math.random()}`
    this.weatherData.weather = [{ main: 'Description', icon: expected }, { main: 'Bad Description', icon: 'Bad Icon' }]
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(expected)
  }

  @test
  async 'it should set blank icon from none weather forecast' () {
    this.weatherData.weather = []
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(undefined)
  }

  @test
  async 'it should set sunrise in ms from s' () {
    this.weatherData.sys.sunrise = 42
    await Functions.UpdateWeather()
    expect(Functions.weather.sunrise).to.equal(42000)
  }

  @test
  async 'it should set sunset in ms from s' () {
    this.weatherData.sys.sunset = 42
    await Functions.UpdateWeather()
    expect(Functions.weather.sunset).to.equal(42000)
  }

  @test
  async 'it should clear temp on error' () {
    Functions.weather.temp = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.temp).to.equal(undefined)
  }

  @test
  async 'it should clear pressure on error' () {
    Functions.weather.pressure = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.pressure).to.equal(undefined)
  }

  @test
  async 'it should clear humidity on error' () {
    Functions.weather.humidity = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.humidity).to.equal(undefined)
  }

  @test
  async 'it should clear description on error' () {
    Functions.weather.description = 'SEXY DESCRIPTION'
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.description).to.equal(undefined)
  }

  @test
  async 'it should clear icon on error' () {
    Functions.weather.icon = 'SEXY ICON'
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.icon).to.equal(undefined)
  }

  @test
  async 'it should be the 1024th test written in this project' () {
    const one = +!![]
    const two = one + one
    const ten = Math.pow(two, two + one) + two
    const testNumber = Math.pow(two, ten)
    expect(testNumber).to.equal(1024)
  }

  @test
  async 'it should clear sunrise on error' () {
    Functions.weather.sunrise = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.sunrise).to.equal(undefined)
  }

  @test
  async 'it should clear sunset on error' () {
    Functions.weather.sunset = 69
    this.GetWeatherStub?.rejects(new Error('ERROR! OH NOES!'))
    await Functions.UpdateWeather()
    expect(Functions.weather.sunset).to.equal(undefined)
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

  before () {
    this.RouterStub = sinon.stub(Imports, 'Router').returns(this.RouterFake as unknown as Router)
    this.SetIntervalStub = sinon.stub(Imports, 'setInterval')
    this.UpdateWeatherStub = sinon.stub(Functions, 'UpdateWeather').resolves()
  }

  after () {
    this.RouterStub?.restore()
    this.SetIntervalStub?.restore()
    this.UpdateWeatherStub?.restore()
  }

  @test
  async 'it should return router from getRouter' () {
    const result = await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(result).to.equal(this.RouterFake)
  }

  @test
  async 'it should update weather immediately' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.UpdateWeatherStub?.callCount).to.equal(1)
    expect(this.UpdateWeatherStub?.firstCall.args).to.deep.equal([])
  }

  @test
  async 'it should update weather using setInterval' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.SetIntervalStub?.callCount).to.equal(1)
    expect(this.SetIntervalStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SetIntervalStub?.firstCall.args[0]).to.equal(this.UpdateWeatherStub)
    expect(this.SetIntervalStub?.firstCall.args[1]).to.equal(600_000)
  }

  @test
  async 'it should register get handler for /' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.callCount).to.equal(1)
    expect(this.RouterFake.get.firstCall.args).to.have.lengthOf(2)
    expect(this.RouterFake.get.firstCall.args[0]).to.equal('/')
  }

  @test
  async 'it should send weather for / route' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.firstCall.args[1]
    if (!fn) {
      throw new Error('fn should be defined!')
    }
    expect(fn).to.be.a('function')
    await fn(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.equal(Functions.weather)
  }

  @test
  async 'it should send errpr for error in / route' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.firstCall.args[1]
    if (!fn) {
      throw new Error('fn should be defined!')
    }
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
