'use sanity'

import { Internals, weatherUpdater } from '#public/scripts/slideshow/weather.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
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
describe('public/slideshow/weather weatherUpdater', () => {
  let fetchWeatherStub = sandbox.stub()
  let showWeatherStub = sandbox.stub()
  let setAlmanacStub = sandbox.stub()

  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    fetchWeatherStub = sandbox.stub(Internals, 'fetchWeather').resolves({})
    showWeatherStub = sandbox.stub(Internals, 'showWeather').returns({})
    setAlmanacStub = sandbox.stub(Internals, 'setAlmanac')
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:29999',
    })
    mountDom(dom)
  })

  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })

  it('should be an CyclicUpdater', () => {
    expect(weatherUpdater).toBeInstanceOf(CyclicUpdater)
  })

  it('should have expected interval', () => {
    expect(weatherUpdater.period).toBe(60000)
  })

  it('should fetch weather once when triggered', async () => {
    await weatherUpdater.updateFn()
    expect(fetchWeatherStub.callCount).toBe(1)
  })

  it('should fetch weather from expected url when triggered', async () => {
    await weatherUpdater.updateFn()
    expect(fetchWeatherStub.firstCall.args).toEqual(['/weather'])
  })

  it('should show fetched data once after retrieval', async () => {
    await weatherUpdater.updateFn()
    expect(showWeatherStub.callCount).toBe(1)
  })

  it('should show fetched data after fetch when triggered', async () => {
    await weatherUpdater.updateFn()
    expect(showWeatherStub.calledAfter(fetchWeatherStub)).toBe(true)
  })

  it('should show weather with expected element as base', async () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    await weatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[0]).toBe(base)
  })

  it('should show weather with retrieved weather', async () => {
    const data = { FOO: Math.random() }
    fetchWeatherStub.resolves(data)
    await weatherUpdater.updateFn()
    expect(showWeatherStub.firstCall.args[1]).toBe(data)
  })

  it('should set almanac data once after showing data', async () => {
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.callCount).toBe(1)
  })

  it('should set almanac data after showing data', async () => {
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.calledAfter(showWeatherStub)).toBe(true)
  })

  it('should set almanac data with one argument', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.returns(data)
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.firstCall.args).toHaveLength(1)
  })
  it('should set almanac data with weather data', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.returns(data)
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.firstCall.args[0]).toBe(data)
  })
})
