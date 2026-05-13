'use sanity'

import { Internals, weatherUpdater } from '#public/scripts/slideshow/weather.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { CyclicUpdater } from '#public/scripts/slideshow/updater.js'
import type { MockInstance } from 'vitest'

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
  let fetchWeatherStub: MockInstance = vi.fn()
  let showWeatherStub: MockInstance = vi.fn()
  let setAlmanacStub: MockInstance = vi.fn()

  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    fetchWeatherStub = vi.spyOn(Internals, 'fetchWeather').mockResolvedValue({})
    showWeatherStub = vi.spyOn(Internals, 'showWeather').mockReturnValue({})
    setAlmanacStub = vi.spyOn(Internals, 'setAlmanac').mockImplementation((..._args: unknown[]) => undefined)
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:29999',
    })
    mountDom(dom)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
    expect(fetchWeatherStub.mock.calls.length).toBe(1)
  })

  it('should fetch weather from expected url when triggered', async () => {
    await weatherUpdater.updateFn()
    expect(fetchWeatherStub.mock.calls[0]).toEqual(['/weather'])
  })

  it('should show fetched data once after retrieval', async () => {
    await weatherUpdater.updateFn()
    expect(showWeatherStub.mock.calls.length).toBe(1)
  })

  it('should show fetched data after fetch when triggered', async () => {
    await weatherUpdater.updateFn()
    expect(
      (showWeatherStub.mock.invocationCallOrder[0] ?? 0) > (fetchWeatherStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })

  it('should show weather with expected element as base', async () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    await weatherUpdater.updateFn()
    expect(showWeatherStub.mock.calls[0]?.[0]).toBe(base)
  })

  it('should show weather with retrieved weather', async () => {
    const data = { FOO: Math.random() }
    fetchWeatherStub.mockResolvedValue(data)
    await weatherUpdater.updateFn()
    expect(showWeatherStub.mock.calls[0]?.[1]).toBe(data)
  })

  it('should set almanac data once after showing data', async () => {
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.mock.calls.length).toBe(1)
  })

  it('should set almanac data after showing data', async () => {
    await weatherUpdater.updateFn()
    expect((setAlmanacStub.mock.invocationCallOrder[0] ?? 0) > (showWeatherStub.mock.invocationCallOrder[0] ?? 0)).toBe(
      true,
    )
  })

  it('should set almanac data with one argument', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.mockReturnValue(data)
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.mock.calls[0]).toHaveLength(1)
  })
  it('should set almanac data with weather data', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.mockReturnValue(data)
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.mock.calls[0]?.[0]).toBe(data)
  })
})
