'use sanity'

import { Internals, localWeatherUpdater, weatherUpdater } from '#public/scripts/slideshow/weather.js'
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

interface UpdaterCase {
  name: string
  updater: CyclicUpdater
  period: number
  url: string
  selector: string
  setsAlmanac: boolean
}

const updaters: UpdaterCase[] = [
  {
    name: 'weatherUpdater',
    updater: weatherUpdater,
    period: 60000,
    url: '/weather',
    selector: '.weather',
    setsAlmanac: true,
  },
  {
    name: 'localWeatherUpdater',
    updater: localWeatherUpdater,
    period: 1000,
    url: 'https://localhost:8443/',
    selector: '.localweather',
    setsAlmanac: false,
  },
]

describe.each(updaters)(
  'public/slideshow/weather $name',
  ({ updater, period, url, selector, setsAlmanac }: UpdaterCase) => {
    let fetchWeatherStub: MockInstance = vi.fn()
    let showWeatherStub: MockInstance = vi.fn()
    let setAlmanacStub: MockInstance = vi.fn()
    let dom = new JSDOM(render(markup))

    beforeEach(() => {
      fetchWeatherStub = vi.spyOn(Internals, 'fetchWeather').mockResolvedValue({})
      showWeatherStub = vi.spyOn(Internals, 'showWeather').mockReturnValue({})
      setAlmanacStub = vi.spyOn(Internals, 'setAlmanac').mockReturnValue(undefined)
      dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:29999' })
      mountDom(dom)
    })

    afterEach(() => {
      unmountDom()
    })

    it('should be a CyclicUpdater', () => {
      expect(updater).toBeInstanceOf(CyclicUpdater)
    })

    it('should have expected interval', () => {
      expect(updater.period).toBe(period)
    })

    it('should fetch weather once when triggered', async () => {
      await updater.updateFn()
      expect(fetchWeatherStub.mock.calls.length).toBe(1)
    })

    it('should fetch weather from expected url when triggered', async () => {
      await updater.updateFn()
      expect(fetchWeatherStub.mock.calls[0]).toEqual([url])
    })

    it('should show fetched data once after retrieval', async () => {
      await updater.updateFn()
      expect(showWeatherStub.mock.calls.length).toBe(1)
    })

    it('should show fetched data after fetch when triggered', async () => {
      await updater.updateFn()
      expect(
        (showWeatherStub.mock.invocationCallOrder[0] ?? 0) > (fetchWeatherStub.mock.invocationCallOrder[0] ?? 0),
      ).toBe(true)
    })

    it('should show weather with expected element as base', async () => {
      const base = dom.window.document.querySelector<HTMLElement>(selector)
      await updater.updateFn()
      expect(showWeatherStub.mock.calls[0]?.[0]).toBe(base)
    })

    it('should show weather with retrieved weather', async () => {
      const data = { FOO: Math.random() }
      fetchWeatherStub.mockResolvedValue(data)
      await updater.updateFn()
      expect(showWeatherStub.mock.calls[0]?.[1]).toBe(data)
    })

    it(
      setsAlmanac
        ? 'should feed the almanac from the fetched weather'
        : 'should not feed the almanac, having no sunrise or sunset to contribute',
      async () => {
        await updater.updateFn()
        expect(setAlmanacStub.mock.calls.length).toBe(setsAlmanac ? 1 : 0)
      },
    )
  },
)

describe('public/slideshow/weather weatherUpdater almanac payload', () => {
  let showWeatherStub: MockInstance = vi.fn()
  let setAlmanacStub: MockInstance = vi.fn()
  let dom = new JSDOM(render(markup))

  beforeEach(() => {
    vi.spyOn(Internals, 'fetchWeather').mockResolvedValue({})
    showWeatherStub = vi.spyOn(Internals, 'showWeather').mockReturnValue({})
    setAlmanacStub = vi.spyOn(Internals, 'setAlmanac').mockReturnValue(undefined)
    dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:29999' })
    mountDom(dom)
  })

  afterEach(() => {
    unmountDom()
  })

  it('should set almanac data after showing data', async () => {
    await weatherUpdater.updateFn()
    expect((setAlmanacStub.mock.invocationCallOrder[0] ?? 0) > (showWeatherStub.mock.invocationCallOrder[0] ?? 0)).toBe(
      true,
    )
  })

  it('should set almanac data with one argument', async () => {
    showWeatherStub.mockReturnValue({ BAR: Math.random() })
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.mock.calls[0]).toHaveLength(1)
  })

  it('should set almanac data with the shown weather data', async () => {
    const data = { BAR: Math.random() }
    showWeatherStub.mockReturnValue(data)
    await weatherUpdater.updateFn()
    expect(setAlmanacStub.mock.calls[0]?.[0]).toBe(data)
  })
})
