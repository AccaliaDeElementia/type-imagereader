'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions, LocalWeatherUpdater } from '../../../../public/scripts/slideshow/weather'
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
describe('public/slideshow/weather LocalWeatherUpdater', () => {
  let fetchWeatherStub = Sinon.stub()
  let showWeatherStub = Sinon.stub()

  const baseWindow = global.window
  const baseDocument = global.document
  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    fetchWeatherStub = Sinon.stub(Functions, 'FetchWeather').resolves({})
    showWeatherStub = Sinon.stub(Functions, 'ShowWeather').returns({})
    dom = new JSDOM(render(markup))
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
  })
  after(() => {
    Sinon.restore()
  })

  it('should be an CyclicUpdater', () => {
    expect(LocalWeatherUpdater).to.be.an.instanceOf(CyclicUpdater)
  })

  it('should have expected interval', () => {
    expect(LocalWeatherUpdater.period).to.equal(1000)
  })

  it('should fetch weather from expected url when triggered', async () => {
    await LocalWeatherUpdater.updateFn()
    expect(fetchWeatherStub.callCount).to.equal(1)
    expect(fetchWeatherStub.firstCall.args).to.deep.equal(['http://localhost:8080/'])
  })

  it('should show fetched data after retrieval', async () => {
    await LocalWeatherUpdater.updateFn()
    expect(showWeatherStub.callCount).to.equal(1)
    expect(showWeatherStub.calledAfter(fetchWeatherStub)).to.equal(true)
  })

  it('should show weather with expected element as base', async () => {
    const base = dom.window.document.querySelector<HTMLElement>('.localweather')
    expect(base).to.not.equal(null)
    await LocalWeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[0]).to.equal(base)
  })

  it('should show weather with retrieved weather', async () => {
    const data = { FOO: Math.random() }
    fetchWeatherStub.resolves(data)
    await LocalWeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[1]).to.equal(data)
  })
})
