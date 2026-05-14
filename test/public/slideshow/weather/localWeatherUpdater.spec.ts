'use sanity'

import { Internals, localWeatherUpdater } from '#public/scripts/slideshow/weather.js'
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
describe('public/slideshow/weather localWeatherUpdater', () => {
  let fetchWeatherStub: MockInstance = vi.fn()
  let showWeatherStub: MockInstance = vi.fn()

  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    fetchWeatherStub = vi.spyOn(Internals, 'fetchWeather').mockResolvedValue({})
    showWeatherStub = vi.spyOn(Internals, 'showWeather').mockReturnValue({})
    dom = new JSDOM(render(markup))
    mountDom(dom)
  })

  afterEach(() => {
    unmountDom()
  })

  it('should be an CyclicUpdater', () => {
    expect(localWeatherUpdater).toBeInstanceOf(CyclicUpdater)
  })

  it('should have expected interval', () => {
    expect(localWeatherUpdater.period).toBe(1000)
  })

  it('should fetch weather once when triggered', async () => {
    await localWeatherUpdater.updateFn()
    expect(fetchWeatherStub.mock.calls.length).toBe(1)
  })

  it('should fetch weather from expected url when triggered', async () => {
    await localWeatherUpdater.updateFn()
    expect(fetchWeatherStub.mock.calls[0]).toEqual(['https://localhost:8443/'])
  })

  it('should show fetched data once after retrieval', async () => {
    await localWeatherUpdater.updateFn()
    expect(showWeatherStub.mock.calls.length).toBe(1)
  })

  it('should show fetched data after fetch when triggered', async () => {
    await localWeatherUpdater.updateFn()
    expect(
      (showWeatherStub.mock.invocationCallOrder[0] ?? 0) > (fetchWeatherStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })

  it('should show weather with expected element as base', async () => {
    const base = dom.window.document.querySelector<HTMLElement>('.localweather')
    await localWeatherUpdater.updateFn()
    expect(showWeatherStub.mock.calls[0]?.[0]).toBe(base)
  })

  it('should show weather with retrieved weather', async () => {
    const data = { FOO: Math.random() }
    fetchWeatherStub.mockResolvedValue(data)
    await localWeatherUpdater.updateFn()
    expect(showWeatherStub.mock.calls[0]?.[1]).toBe(data)
  })
})
