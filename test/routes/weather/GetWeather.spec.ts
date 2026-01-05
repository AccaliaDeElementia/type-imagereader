'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/weather'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'
import { EventuallyRejects } from '../../testutils/Errors'

describe('routes/weather function GetWeather', () => {
  let weatherData = {
    weather: [],
    sys: {
      sunrise: 0,
      sunset: 0,
    },
  }
  let fetchStub = Sinon.stub()
  let fetchResult = {
    json: Sinon.stub().resolves(weatherData),
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
      json: Sinon.stub().resolves(weatherData),
    }
    fetchStub = Sinon.stub(global, 'fetch').resolves(Cast<globalThis.Response>(fetchResult))
  })
  afterEach(() => {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
    fetchStub.restore()
  })
  it('should reject missing appId', async () => {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
    const err = await EventuallyRejects(Functions.GetWeather())
    expect(err.message).to.equal('no OpewnWeather AppId Defined!')
  })
  it('should reject missing location', async () => {
    delete process.env.OPENWEATHER_LOCATION
    const err = await EventuallyRejects(Functions.GetWeather())
    expect(err.message).to.equal('no OpewnWeather Location Defined!')
  })
  it('should reject when fetch fails', async () => {
    const err = new Error('FOO')
    fetchStub.rejects(err)
    const result = await EventuallyRejects(Functions.GetWeather())
    expect(result).to.equal(err)
  })
  it('should reject when fetch throws', async () => {
    const err = new Error('FOO')
    fetchStub.rejects(err)
    const result = await EventuallyRejects(Functions.GetWeather())
    expect(result).to.equal(err)
  })
  it('should request expected openweather api url', async () => {
    await Functions.GetWeather()
    expect(fetchStub.firstCall.args).to.deep.equal([
      'https://api.openweathermap.org/data/2.5/weather?q=location&appid=appid',
    ])
  })
  it('should return JSON as parsed', async () => {
    const result = await Functions.GetWeather()
    expect(result).to.equal(weatherData)
  })
  it('should reject when fetch rejects', async () => {
    const err = new Error('FOO')
    fetchStub.rejects(err)
    const result = await EventuallyRejects(Functions.GetWeather())
    expect(result).to.equal(err)
  })
  it('should reject when fetch throws', async () => {
    const err = new Error('FOO')
    fetchStub.throws(err)
    const result = await EventuallyRejects(Functions.GetWeather())
    expect(result).to.equal(err)
  })
  it('should reject when json parse rejects', async () => {
    const err = new Error('FOO')
    fetchResult.json.rejects(err)
    const result = await EventuallyRejects(Functions.GetWeather())
    expect(result).to.equal(err)
  })
  it('should reject when json parse throws', async () => {
    const err = new Error('FOO')
    fetchResult.json.throws(err)
    const result = await EventuallyRejects(Functions.GetWeather())
    expect(result).to.equal(err)
  })
  it('should reject when fetch retrieves invalid data', async () => {
    fetchResult.json.resolves({})
    const result = await EventuallyRejects(Functions.GetWeather())
    expect(result.message).to.equal('Invalid JSON returned from Open Weather Map')
  })
})
