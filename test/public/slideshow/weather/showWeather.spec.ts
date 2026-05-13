'use sanity'

import { Internals } from '#public/scripts/slideshow/weather.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import type { WeatherResults } from '#contracts/weather.js'
import type { MockInstance } from 'vitest'
const markup = `
html
  body
    div.text.weather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
`

describe('public/slideshow/weather showWeather()', () => {
  let dom = new JSDOM('')
  let weather: WeatherResults = {}

  let showDataStub: MockInstance = vi.fn()
  let showIconStub: MockInstance = vi.fn()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    weather = {}
    mountDom(dom)
    showDataStub = vi.spyOn(Internals, 'showData').mockImplementation((..._args: unknown[]) => undefined)
    showIconStub = vi.spyOn(Internals, 'showIcon').mockImplementation((..._args: unknown[]) => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })

  it('should return input weather when null base provided', () => {
    const result = Internals.showWeather(null, weather)
    expect(result).toBe(weather)
  })

  it('should return input weather when undefined base provided', () => {
    const result = Internals.showWeather(undefined, weather)
    expect(result).toBe(weather)
  })

  it('should return input weather when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const result = Internals.showWeather(base, weather)
    expect(result).toBe(weather)
  })

  it('should call showData() twice when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls.length).toBe(2)
  })

  it('should call showIcon() once when valid base provided', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showIconStub.mock.calls.length).toBe(1)
  })

  it('should show temp with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[0]).toBe(base)
  })

  it('should show temp with expected target element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.temp')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[1]).toBe(expected)
  })

  it('should show temp with null text for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe(null)
  })

  it('should show temp with null text for undefined data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = undefined
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe(null)
  })

  it('should show temp with rounded text for excessive decimal data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = 98.9972
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe('99.0°C')
  })

  it('should show temp with null text for NaN data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = NaN
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe(null)
  })

  it('should show temp with null text for Infinity data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = Infinity
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe(null)
  })

  it('should show temp with null text for negative Infinity data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = -Infinity
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe(null)
  })

  it('should show temp with formatted text for zero degrees', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = 0
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe('0.0°C')
  })

  it('should show description with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.desc')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[1]?.[0]).toBe(expected)
  })

  it('should show description with expected target element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.desc .desctext')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[1]?.[1]).toBe(expected)
  })

  it('should show description with undefined text for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[1]?.[2]).toBe(undefined)
  })

  it('should show description with undefined text for undefined data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.description = undefined
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[1]?.[2]).toBe(undefined)
  })

  it('should show description with provided data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.description = 'what a great value'
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[1]?.[2]).toBe('what a great value')
  })

  it('should show icon with expected base element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const expected = base?.querySelector<HTMLElement>('.icon')
    Internals.showWeather(base, weather)
    expect(showIconStub.mock.calls[0]?.[0]).toBe(expected)
  })

  it('should show icon with undefined src for missing data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showIconStub.mock.calls[0]?.[1]).toBe(undefined)
  })

  it('should show icon with undefined src for undefined icon data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.icon = undefined
    Internals.showWeather(base, weather)
    expect(showIconStub.mock.calls[0]?.[1]).toBe(undefined)
  })

  it('should show icon with provided icon data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.icon = 'what a great value'
    Internals.showWeather(base, weather)
    expect(showIconStub.mock.calls[0]?.[1]).toBe('what a great value')
  })
})
