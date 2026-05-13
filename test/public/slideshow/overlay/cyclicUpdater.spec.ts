'use sanity'

import { overlayUpdater as Updater, Internals } from '#public/scripts/slideshow/overlay.js'
import { CyclicUpdater } from '#public/scripts/slideshow/updater.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div.overlay
`

describe('public/slideshow/overlay CyclicUpdater()', () => {
  let fakeShowHide: MockInstance | undefined = undefined
  let fakeCalculateDarknessMs: MockInstance | undefined = undefined
  let fakeGetOpacity: MockInstance | undefined = undefined
  let dom = new JSDOM()
  beforeEach(() => {
    fakeShowHide = vi.spyOn(Internals, 'showHideKiosk').mockImplementation((..._args: unknown[]) => undefined)
    fakeCalculateDarknessMs = vi.spyOn(Internals, 'calculateDarknessMs').mockReturnValue(0)
    fakeGetOpacity = vi.spyOn(Internals, 'getOpacity').mockReturnValue(0)
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:29999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should be a CyclicUpdater', () => {
    expect(Updater).toBeInstanceOf(CyclicUpdater)
  })
  it('should update every 1/10th of a second', () => {
    expect(Updater.period).toBe(100)
  })
  it('should not call showHideKiosk when overlay missing', async () => {
    const overlay = dom.window.document.querySelector('.overlay')
    overlay?.remove()
    await Updater.updateFn()
    expect(fakeShowHide?.mock.calls.length).toBe(0)
  })
  it('should call showHideKiosk to show/hide kiosk overlay', async () => {
    await Updater.updateFn()
    expect(fakeShowHide?.mock.calls.length).toBe(1)
  })
  it('should pass overlay to showHideKiosk call', async () => {
    const overlay = dom.window.document.querySelector('.overlay')
    await Updater.updateFn()
    expect(fakeShowHide?.mock.calls[0]?.[0]).toBe(overlay)
  })
  const kioskCases: Array<[string, boolean]> = [
    ['kiosk', true],
    ['kiosk=73', true],
    ['kiosk=false', true],
    ['kiosk-but-not-really', false],
    ['false-kiosk', false],
    ['potato=good&kiosk', true],
    ['17=kiosk', false],
    ['', false],
    ['kio=sk', false],
    ['kiosk&clock', true],
    ['kiosk=420blaze&footwear=no', true],
  ]
  kioskCases.forEach(([search, expected]) => {
    it(`${expected ? 'should' : 'should not'} enable kiosk mode for search '${search}'`, async () => {
      dom.reconfigure({ url: `http://not.a.kiosk.example.com:29999?${search}` })
      await Updater.updateFn()
      expect(fakeShowHide?.mock.calls[0]?.[1]).toBe(expected)
    })
  })
  it('should call calculateDarknessMs to get timer offset', async () => {
    await Updater.updateFn()
    expect(fakeCalculateDarknessMs?.mock.calls.length).toBe(1)
  })
  it('should call getOpacity to turn offset into opacity valie', async () => {
    await Updater.updateFn()
    expect(fakeGetOpacity?.mock.calls.length).toBe(1)
  })
  it('should call getOpacity with offset valueto turn offset into opacity valie', async () => {
    const value = Math.random()
    fakeCalculateDarknessMs?.mockReturnValue(value)
    await Updater.updateFn()
    expect(fakeGetOpacity?.mock.calls[0]).toEqual([value])
  })
  it('should set opacity on the overlay element', async () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('.overlay')
    overlay?.style.setProperty('opacity', '1')
    fakeGetOpacity?.mockReturnValue(0.5)
    await Updater.updateFn()
    expect(overlay?.style.getPropertyValue('opacity')).toBe('0.5')
  })
})
