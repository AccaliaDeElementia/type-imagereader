'use sanity'

import { Internals } from '#public/scripts/slideshow/weather.js'
import { URL } from 'node:url'
import { JSDOM } from 'jsdom'
import { eventuallyRejects } from '#testutils/errors.js'
import { cast } from '#testutils/typeGuards.js'
import { mountDom, unmountDom } from '#testutils/dom.js'

describe('public/slideshow/weather fetchWeather()', () => {
  let fetchStub = vi.fn()

  const dom = new JSDOM('<html></html>')
  beforeEach(() => {
    mountDom(dom)
    fetchStub = vi.fn()
    fetchStub.mockResolvedValue({ json: async () => await Promise.resolve({}) })
    dom.window.fetch = fetchStub
  })

  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })

  it('should return expected data on success', async () => {
    const data = { extraData: Math.random() }
    fetchStub.mockResolvedValue({ json: vi.fn().mockResolvedValue(data) })
    expect(await Internals.fetchWeather('foo!')).toBe(data)
  })

  it('should call fetch once for provided uri', async () => {
    const target = new URL('https://localhost:8192/foo')
    await Internals.fetchWeather(target)
    expect(fetchStub.mock.calls.length).toBe(1)
  })
  it('should call fetch with two arguments for provided uri', async () => {
    const target = new URL('https://localhost:8192/foo')
    await Internals.fetchWeather(target)
    expect(fetchStub.mock.calls[0]).toHaveLength(2)
  })
  it('should call fetch with the provided uri', async () => {
    const target = new URL('https://localhost:8192/foo')
    await Internals.fetchWeather(target)
    expect(fetchStub.mock.calls[0]?.[0]).toBe(target)
  })

  it('should call fetch once for provided string', async () => {
    const target = 'https://localhost:8192/foo'
    await Internals.fetchWeather(target)
    expect(fetchStub.mock.calls.length).toBe(1)
  })
  it('should call fetch with two arguments for provided string', async () => {
    const target = 'https://localhost:8192/foo'
    await Internals.fetchWeather(target)
    expect(fetchStub.mock.calls[0]).toHaveLength(2)
  })
  it('should call fetch with the provided string', async () => {
    const target = 'https://localhost:8192/foo'
    await Internals.fetchWeather(target)
    expect(fetchStub.mock.calls[0]?.[0]).toBe(target)
  })
  it('should pass an AbortSignal in the fetch options', async () => {
    const sentinelSignal = cast<AbortSignal>({})
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(sentinelSignal)
    await Internals.fetchWeather('https://localhost/x')
    expect(cast<{ signal: unknown }>(fetchStub.mock.calls[0]?.[1]).signal).toBe(sentinelSignal)
  })
  it('should set the AbortSignal timeout to 60 seconds', async () => {
    const timeoutStub = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(cast<AbortSignal>({}))
    await Internals.fetchWeather('https://localhost/x')
    expect(timeoutStub.mock.calls[0]).toEqual([60_000])
  })

  it('should reject when fetch rejects', async () => {
    const err = new Error('I AM ERROR')
    fetchStub.mockRejectedValue(err)
    const result = await eventuallyRejects(Internals.fetchWeather('FOO'))
    expect(result).toBe(err)
  })

  it('should reject when json rejects', async () => {
    const err = new Error('I AM ERROR')
    fetchStub.mockResolvedValue({ json: vi.fn().mockRejectedValue(err) })
    const result = await eventuallyRejects(Internals.fetchWeather('FOO'))
    expect(result).toBe(err)
  })

  it('should reject when fetch resolves invalid WeatherResultsjects', async () => {
    fetchStub.mockResolvedValue({ json: vi.fn().mockResolvedValue(42) })
    const result = await eventuallyRejects(Internals.fetchWeather('FOO'))
    expect(result.message).toBe('Invalid WeatherResponse Retrieved')
  })
})
