'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions, WeatherUpdater } from '../../../../public/scripts/slideshow/weather'
import { expect } from 'chai'
import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import Sinon from 'sinon'
import { CyclicUpdater } from '../../../../public/scripts/slideshow/updater'

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
    div.text.localweather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
`
describe('public/slideshow/weather WeatherUpdater', () => {
  let fetchWeatherStub = Sinon.stub()
  let showWeatherStub = Sinon.stub()
  let setAlmanacStub = Sinon.stub()

  const baseWindow = global.window
  const baseDocument = global.document
  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    fetchWeatherStub = Sinon.stub(Functions, 'FetchWeather').resolves({})
    showWeatherStub = Sinon.stub(Functions, 'ShowWeather').returns({})
    setAlmanacStub = Sinon.stub(Functions, 'SetAlmanac')
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:29999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
  })

  afterEach(() => {
    global.window = baseWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => baseDocument,
    })
    fetchWeatherStub.restore()
    showWeatherStub.restore()
    setAlmanacStub.restore()
  })

  it('should be an CyclicUpdater', () => {
    expect(WeatherUpdater).to.be.an.instanceOf(CyclicUpdater)
  })

  it('should have expected interval', () => {
    expect(WeatherUpdater.period).to.equal(60000)
  })

  it('should fetch weather from expected url when triggered', async () => {
    await WeatherUpdater.updateFn()
    expect(fetchWeatherStub.callCount).to.equal(1)
    expect(fetchWeatherStub.firstCall.args).to.deep.equal(['/weather'])
  })

  it('should show fetched data after retrieval', async () => {
    await WeatherUpdater.updateFn()
    expect(showWeatherStub.callCount).to.equal(1)
    expect(showWeatherStub.calledAfter(fetchWeatherStub)).to.equal(true)
  })

  it('should show weather with expected element as base', async () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    expect(base).to.not.equal(null)
    await WeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[0]).to.equal(base)
  })

  it('should show weather with retrieved weather', async () => {
    const data = { FOO: Math.random() }
    fetchWeatherStub.resolves(data)
    await WeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[1]).to.equal(data)
  })

  it('should set almanac data after showing data', async () => {
    await WeatherUpdater.updateFn()
    expect(setAlmanacStub.callCount).to.equal(1)
    expect(setAlmanacStub.calledAfter(showWeatherStub)).to.equal(true)
  })

  it('should set almanac data with weather data', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.returns(data)
    await WeatherUpdater.updateFn()
    expect(setAlmanacStub.firstCall.args).to.have.length(1)
    expect(setAlmanacStub.firstCall.args[0]).to.equal(data)
  })
})
