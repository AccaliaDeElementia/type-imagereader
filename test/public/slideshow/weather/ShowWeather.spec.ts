'use sanity'

import { Internals } from '#public/scripts/slideshow/weather.js'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'

import type { WeatherResults } from '#contracts/weather.js'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
`

describe('public/slideshow/weather ShowWeather()', () => {
  let dom = new JSDOM('')
  let weather: WeatherResults = {}

  let showDataStub = sandbox.stub()
  let showIconStub = sandbox.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    weather = {}
    mountDom(dom)
    showDataStub = sandbox.stub(Internals, 'ShowData')
    showIconStub = sandbox.stub(Internals, 'ShowIcon')
  })

  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })

  it('should return input weather when null base provided', () => {
    const result = Internals.ShowWeather(null, weather)
    expect(result).to.equal(weather)
  })

  it('should return input weather when undefined base provided', () => {
    const result = Internals.ShowWeather(undefined, weather)
    expect(result).to.equal(weather)
  })

  it('should return input weather when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const result = Internals.ShowWeather(base, weather)
    expect(result).to.equal(weather)
  })

  it('should call ShowData() twice when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.ShowWeather(base, weather)
    expect(showDataStub.callCount).to.equal(2)
  })

  it('should call ShowIcon() once when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.ShowWeather(base, weather)
    expect(showIconStub.callCount).to.equal(1)
  })

  it('should show temp with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[0]).to.equal(base)
  })

  it('should show temp with expected target element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.temp')
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[1]).to.equal(expected)
  })

  it('should show temp with null text for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal(null)
  })

  it('should show temp with null text for undefined data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = undefined
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal(null)
  })

  it('should show temp with rounded text for excessive decimal data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = 98.9972
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal('99.0°C')
  })

  it('should show temp with null text for NaN data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = NaN
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal(null)
  })

  it('should show temp with null text for Infinity data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = Infinity
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal(null)
  })

  it('should show temp with null text for negative Infinity data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = -Infinity
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal(null)
  })

  it('should show temp with formatted text for zero degrees', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = 0
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal('0.0°C')
  })

  it('should show description with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.desc')
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[0]).to.equal(expected)
  })

  it('should show description with expected target element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.desc .desctext')
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[1]).to.equal(expected)
  })

  it('should show description with undefined text for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[2]).to.equal(undefined)
  })

  it('should show description with undefined text for undefined data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.description = undefined
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[2]).to.equal(undefined)
  })

  it('should show description with provided data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.description = 'what a great value'
    Internals.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[2]).to.equal('what a great value')
  })

  it('should show icon with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.icon')
    Internals.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[0]).to.equal(expected)
  })

  it('should show icon with undefined src for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[1]).to.equal(undefined)
  })

  it('should show icon with undefined src for undefined icon data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.icon = undefined
    Internals.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[1]).to.equal(undefined)
  })

  it('should show icon with provided icon data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.icon = 'what a great value'
    Internals.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[1]).to.equal('what a great value')
  })
})
