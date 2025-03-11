'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions } from '../../../../public/scripts/slideshow/weather'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { Cast } from '../../../testutils/TypeGuards'
import type { WeatherResults } from '../../../../contracts/weather'
import Sinon from 'sinon'

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
  const baseWindow = global.window
  const baseDocument = global.document
  let dom = new JSDOM('')
  let weather: WeatherResults = {}

  let showDataStub = Sinon.stub()
  let showIconStub = Sinon.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    weather = {}
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
    showDataStub = Sinon.stub(Functions, 'ShowData')
    showIconStub = Sinon.stub(Functions, 'ShowIcon')
  })

  afterEach(() => {
    showIconStub.restore()
    showDataStub.restore()
    global.window = baseWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => baseDocument,
    })
  })

  it('should return input weather when null base provided', () => {
    const result = Functions.ShowWeather(null, weather)
    expect(result).to.equal(weather)
  })

  it('should return input weather when undefined base provided', () => {
    const result = Functions.ShowWeather(undefined, weather)
    expect(result).to.equal(weather)
  })

  it('should return input weather when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    expect(base).to.not.equal(null)
    const result = Functions.ShowWeather(base, weather)
    expect(result).to.equal(weather)
  })

  it('should call ShowData() twice when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Functions.ShowWeather(base, weather)
    expect(showDataStub.callCount).to.equal(2)
  })

  it('should call ShowIcon() once when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Functions.ShowWeather(base, weather)
    expect(showIconStub.callCount).to.equal(1)
  })

  it('should show temp with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[0]).to.equal(base)
  })

  it('should show temp with expected target element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.temp')
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[1]).to.equal(expected)
  })

  it('should show temp with null text for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    expect(weather).to.not.have.any.keys('temp')
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal(null)
  })

  it('should show temp with null text for undefined data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = undefined
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal(null)
  })

  it('should show temp with rounded text for excessive decimal data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = 98.9972
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.firstCall.args
    expect(callArgs[2]).to.equal('99.0°C')
  })

  it('should show description with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.desc')
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[0]).to.equal(expected)
  })

  it('should show description with expected target element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.desc .desctext')
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[1]).to.equal(expected)
  })

  it('should show description with undefined text for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    expect(weather).to.not.have.any.keys('description')
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[2]).to.equal(undefined)
  })

  it('should show description with undefined text for undefined data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.description = undefined
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[2]).to.equal(undefined)
  })

  it('should show description with provided data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.description = 'what a great value'
    Functions.ShowWeather(base, weather)
    const callArgs = showDataStub.secondCall.args
    expect(callArgs[2]).to.equal('what a great value')
  })

  it('should show icon with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.icon')
    Functions.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[0]).to.equal(expected)
  })

  it('should show description with undefined text for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    expect(weather).to.not.have.any.keys('icon')
    Functions.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[1]).to.equal(undefined)
  })

  it('should show description with undefined text for undefined data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.icon = undefined
    Functions.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[1]).to.equal(undefined)
  })

  it('should show description with provided data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.icon = 'what a great value'
    Functions.ShowWeather(base, weather)
    const callArgs = showIconStub.firstCall.args
    expect(callArgs[1]).to.equal('what a great value')
  })
})
