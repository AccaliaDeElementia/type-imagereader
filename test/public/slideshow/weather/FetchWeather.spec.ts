'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import { Functions } from '../../../../public/scripts/slideshow/weather'
import Sinon from 'sinon'
import { URL } from 'url'
import { EventuallyRejects } from '../../../testutils/Errors'

describe('slideshow/weather FetchWeather', () => {
  let fetchStub = Sinon.stub()

  beforeEach(() => {
    fetchStub = Sinon.stub(Functions, 'fetch')
    fetchStub.resolves({ json: async () => await Promise.resolve({}) })
  })

  afterEach(() => {
    fetchStub.restore()
  })

  it('should return expected data on success', async () => {
    const data = { extraData: Math.random() }
    fetchStub.resolves({ json: Sinon.stub().resolves(data) })
    expect(await Functions.FetchWeather('foo!')).to.equal(data)
  })

  it('should return fetch data at provided uri', async () => {
    const target = new URL('https://localhost:8192/foo')
    await Functions.FetchWeather(target)
    expect(fetchStub.callCount).to.equal(1)
    expect(fetchStub.firstCall.args).to.have.length(1)
    expect(fetchStub.firstCall.args[0]).to.equal(target)
  })

  it('should return fetch data at provided string', async () => {
    const target = 'https://localhost:8192/foo'
    await Functions.FetchWeather(target)
    expect(fetchStub.callCount).to.equal(1)
    expect(fetchStub.firstCall.args).to.have.length(1)
    expect(fetchStub.firstCall.args[0]).to.equal(target)
  })

  it('should reject when fetch rejects', async () => {
    const err = new Error('I AM ERROR')
    fetchStub.rejects(err)
    const result = await EventuallyRejects(Functions.FetchWeather('FOO'))
    expect(result).to.equal(err)
  })

  it('should reject when json rejects', async () => {
    const err = new Error('I AM ERROR')
    fetchStub.resolves({ json: Sinon.stub().rejects(err) })
    const result = await EventuallyRejects(Functions.FetchWeather('FOO'))
    expect(result).to.equal(err)
  })

  it('should reject when fetch resolves invalid WeatherResultsjects', async () => {
    fetchStub.resolves({ json: Sinon.stub().resolves(42) })
    const result = await EventuallyRejects(Functions.FetchWeather('FOO'))
    expect(result.message).to.equal('Invalid WeatherResponse Retrieved')
  })
})
