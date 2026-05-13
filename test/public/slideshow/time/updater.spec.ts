'use sanity'

import { timeUpdater as Updater, Internals } from '#public/scripts/slideshow/time.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { CyclicUpdater } from '#public/scripts/slideshow/updater.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.time
      div.date
`

describe('public/slideshow/time Updater()', () => {
  let fakeFormatTime: MockInstance | undefined = undefined
  let fakeFormatDate: MockInstance | undefined = undefined
  let dom = new JSDOM(render(markup))
  const now = new Date(2000, 3, 1, 0, 0, 0, 0)
  beforeEach(() => {
    fakeFormatTime = vi.spyOn(Internals, 'formatTime').mockReturnValue('')
    fakeFormatDate = vi.spyOn(Internals, 'formatDate').mockReturnValue('')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:29999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should expose a CyclicUpdater', () => {
    expect(Updater).toBeInstanceOf(CyclicUpdater)
  })
  it('should have a period of 100ms', () => {
    expect(Updater.period).toBe(100)
  })
  it('should format time for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatTime?.mock.calls.length).toBe(1)
  })
  it('should format now as time for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatTime?.mock.calls[0]).toEqual([now])
  })
  it('should place formated data into .time', async () => {
    fakeFormatTime?.mockReturnValue('I am time')
    await Updater.updateFn()
    const elem = dom.window.document.querySelector<HTMLElement>('.time')
    expect(elem?.innerHTML).toBe('I am time')
  })
  it('should tolerate a missing .time target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.time')
    elem?.remove()
    await Updater.updateFn()
    assert(true, 'should pass without throwing')
  })
  it('should not format time for missing target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.time')
    elem?.remove()
    await Updater.updateFn()
    expect(fakeFormatTime?.mock.calls.length).toBe(0)
  })
  it('should format date for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatDate?.mock.calls.length).toBe(1)
  })
  it('should format now as date for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatDate?.mock.calls[0]).toEqual([now])
  })
  it('should place formated data into .date', async () => {
    fakeFormatDate?.mockReturnValue('I am date')
    await Updater.updateFn()
    const elem = dom.window.document.querySelector<HTMLElement>('.date')
    expect(elem?.innerHTML).toBe('I am date')
  })
  it('should tolerate a missing .date target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.date')
    elem?.remove()
    await Updater.updateFn()
    assert(true, 'should pass without throwing')
  })
  it('should not format date for missing target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.date')
    elem?.remove()
    await Updater.updateFn()
    expect(fakeFormatDate?.mock.calls.length).toBe(0)
  })
})
