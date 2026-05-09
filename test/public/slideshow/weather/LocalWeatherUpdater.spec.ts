'use sanity'

import { Internals, localWeatherUpdater } from '#public/scripts/slideshow/weather.js'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import Sinon from 'sinon'
import { CyclicUpdater } from '#public/scripts/slideshow/updater.js'

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
describe('public/slideshow/weather localWeatherUpdater', () => {
  let fetchWeatherStub = sandbox.stub()
  let showWeatherStub = sandbox.stub()

  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    fetchWeatherStub = sandbox.stub(Internals, 'fetchWeather').resolves({})
    showWeatherStub = sandbox.stub(Internals, 'showWeather').returns({})
    dom = new JSDOM(render(markup))
    mountDom(dom)
  })

  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })

  it('should be an CyclicUpdater', () => {
    expect(localWeatherUpdater).to.be.an.instanceOf(CyclicUpdater)
  })

  it('should have expected interval', () => {
    expect(localWeatherUpdater.period).to.equal(1000)
  })

  it('should fetch weather once when triggered', async () => {
    await localWeatherUpdater.updateFn()
    expect(fetchWeatherStub.callCount).to.equal(1)
  })

  it('should fetch weather from expected url when triggered', async () => {
    await localWeatherUpdater.updateFn()
    expect(fetchWeatherStub.firstCall.args).to.deep.equal(['https://localhost:8443/'])
  })

  it('should show fetched data once after retrieval', async () => {
    await localWeatherUpdater.updateFn()
    expect(showWeatherStub.callCount).to.equal(1)
  })

  it('should show fetched data after fetch when triggered', async () => {
    await localWeatherUpdater.updateFn()
    expect(showWeatherStub.calledAfter(fetchWeatherStub)).to.equal(true)
  })

  it('should show weather with expected element as base', async () => {
    const base = dom.window.document.querySelector<HTMLElement>('.localweather')
    await localWeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[0]).to.equal(base)
  })

  it('should show weather with retrieved weather', async () => {
    const data = { FOO: Math.random() }
    fetchWeatherStub.resolves(data)
    await localWeatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[1]).to.equal(data)
  })
})
