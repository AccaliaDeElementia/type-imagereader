'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions, WeatherUpdater } from '#public/scripts/slideshow/weather'
import { expect } from 'chai'
import { Cast } from '#testutils/TypeGuards'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import Sinon from 'sinon'
import { CyclicUpdater } from '#public/scripts/slideshow/updater'

const sandbox = Sinon.createSandbox()

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
  let fetchWeatherStub = sandbox.stub()
  let showWeatherStub = sandbox.stub()
  let setAlmanacStub = sandbox.stub()

  const baseWindow = global.window
  const baseDocument = global.document
  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    fetchWeatherStub = sandbox.stub(Functions, 'FetchWeather').resolves({})
    showWeatherStub = sandbox.stub(Functions, 'ShowWeather').returns({})
    setAlmanacStub = sandbox.stub(Functions, 'SetAlmanac')
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
    sandbox.restore()
    global.window = baseWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => baseDocument,
    })
  })

  it('should be an CyclicUpdater', () => {
    expect(WeatherUpdater).to.be.an.instanceOf(CyclicUpdater)
  })

  it('should have expected interval', () => {
    expect(WeatherUpdater.period).to.equal(60000)
  })

  it('should fetch weather once when triggered', async () => {
    await WeatherUpdater.updateFn()
    expect(fetchWeatherStub.callCount).to.equal(1)
  })

  it('should fetch weather from expected url when triggered', async () => {
    await WeatherUpdater.updateFn()
    expect(fetchWeatherStub.firstCall.args).to.deep.equal(['/weather'])
  })

  it('should show fetched data once after retrieval', async () => {
    await WeatherUpdater.updateFn()
    expect(showWeatherStub.callCount).to.equal(1)
  })

  it('should show fetched data after fetch when triggered', async () => {
    await WeatherUpdater.updateFn()
    expect(showWeatherStub.calledAfter(fetchWeatherStub)).to.equal(true)
  })

  it('should show weather with expected element as base', async () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    await WeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[0]).to.equal(base)
  })

  it('should show weather with retrieved weather', async () => {
    const data = { FOO: Math.random() }
    fetchWeatherStub.resolves(data)
    await WeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[1]).to.equal(data)
  })

  it('should set almanac data once after showing data', async () => {
    await WeatherUpdater.updateFn()
    expect(setAlmanacStub.callCount).to.equal(1)
  })

  it('should set almanac data after showing data', async () => {
    await WeatherUpdater.updateFn()
    expect(setAlmanacStub.calledAfter(showWeatherStub)).to.equal(true)
  })

  it('should set almanac data with one argument', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.returns(data)
    await WeatherUpdater.updateFn()
    expect(setAlmanacStub.firstCall.args).to.have.length(1)
  })
  it('should set almanac data with weather data', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.returns(data)
    await WeatherUpdater.updateFn()
    expect(setAlmanacStub.firstCall.args[0]).to.equal(data)
  })
})
