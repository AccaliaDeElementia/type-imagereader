'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { initUnreadSelectorSlider, Internals } from '#public/scripts/app/unreadFilter.js'
import { render } from 'pug'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

const markup = `html
  body
    div.selectUnreadAll
      div#slider4test
      `
describe('public/app/pictures setShowUnreadOnly()', () => {
  let dom = new JSDOM('<html></html>')
  let getShowUnreadOnlySpy: MockInstance = vi.fn()
  let setShowUnreadOnlySpy: MockInstance = vi.fn()
  let updateUnreadSelectorSliderSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    getShowUnreadOnlySpy = vi.spyOn(Internals, 'getShowUnreadOnly').mockReturnValue(false)
    setShowUnreadOnlySpy = vi
      .spyOn(Internals, 'setShowUnreadOnly')
      .mockImplementation((..._args: unknown[]) => undefined)
    updateUnreadSelectorSliderSpy = vi
      .spyOn(Internals, 'updateUnreadSelectorSlider')
      .mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should update current status on init', () => {
    initUnreadSelectorSlider()
    expect(updateUnreadSelectorSliderSpy.mock.calls.length).toBe(1)
  })
  it('should update slider on click event from child element', () => {
    initUnreadSelectorSlider()
    updateUnreadSelectorSliderSpy.mockClear()
    const element = dom.window.document.querySelector('#slider4test')
    assert(element !== null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateUnreadSelectorSliderSpy.mock.calls.length).toBe(1)
  })
  it('should update slider on click event from slider element', () => {
    initUnreadSelectorSlider()
    updateUnreadSelectorSliderSpy.mockClear()
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateUnreadSelectorSliderSpy.mock.calls.length).toBe(1)
  })
  it('should call setShowUnreadOnly once when currently set', () => {
    initUnreadSelectorSlider()
    getShowUnreadOnlySpy.mockReturnValue(true)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.mock.calls.length).toEqual(1)
  })
  it('should call setShowUnreadOnly with false when currently set', () => {
    initUnreadSelectorSlider()
    getShowUnreadOnlySpy.mockReturnValue(true)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.mock.calls[0]).toEqual([false])
  })
  it('should call setShowUnreadOnly once when currently unset', () => {
    initUnreadSelectorSlider()
    getShowUnreadOnlySpy.mockReturnValue(false)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.mock.calls.length).toEqual(1)
  })
  it('should call setShowUnreadOnly with true when currently unset', () => {
    initUnreadSelectorSlider()
    getShowUnreadOnlySpy.mockReturnValue(false)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.mock.calls[0]).toEqual([true])
  })
})
