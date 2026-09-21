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
    showDataStub = vi.spyOn(Internals, 'showData').mockReturnValue(undefined)
    showIconStub = vi.spyOn(Internals, 'showIcon').mockReturnValue(undefined)
  })

  afterEach(() => {
    unmountDom()
  })

  const baseElements: Array<[string, () => HTMLElement | null | undefined]> = [
    ['null', () => null],
    ['undefined', () => undefined],
    ['a valid element', () => dom.window.document.querySelector<HTMLElement>('.weather')],
  ]
  it.each(baseElements)('should return the input weather when the base is %s', (_label, baseOf) => {
    expect(Internals.showWeather(baseOf(), weather)).toBe(weather)
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

  interface TemperatureCase {
    given: string
    temp: number | undefined
    expected: string | null
  }
  const temperatures: TemperatureCase[] = [
    { given: 'no temperature at all', temp: undefined, expected: null },
    { given: 'an excessively precise temperature', temp: 98.9972, expected: '99.0°C' },
    { given: 'NaN', temp: Number.NaN, expected: null },
    { given: 'Infinity', temp: Number.POSITIVE_INFINITY, expected: null },
    { given: 'negative Infinity', temp: Number.NEGATIVE_INFINITY, expected: null },
    { given: 'zero degrees', temp: 0, expected: '0.0°C' },
  ]
  it.each(temperatures)('should show temp as $expected given $given', ({ temp, expected }: TemperatureCase) => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.temp = temp
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[0]?.[2]).toBe(expected)
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

  it('should show description with undefined text when the weather carries no description', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showDataStub.mock.calls[1]).toEqual([expect.anything(), expect.anything(), undefined])
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

  it('should show icon with undefined src when the weather carries no icon', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showWeather(base, weather)
    expect(showIconStub.mock.calls[0]).toEqual([expect.anything(), undefined])
  })

  it('should show icon with provided icon data', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    weather.icon = 'what a great value'
    Internals.showWeather(base, weather)
    expect(showIconStub.mock.calls[0]?.[1]).toBe('what a great value')
  })
})
