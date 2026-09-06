'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { initSizeSelectorSlider, Imports, Internals } from '#public/scripts/app/sizeFilter.js'
import { render } from 'pug'
import assert from 'node:assert'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

const markup = `html
  body
    div.selectScaledOriginal
      div#slider4test
      `
describe('public/app/pictures initSizeSelectorSlider()', () => {
  let dom = new JSDOM('<html></html>')
  let getShowOriginalSizeSpy: MockInstance = vi.fn()
  let setShowOriginalSizeSpy: MockInstance = vi.fn()
  let updateSizeSelectorSliderSpy: MockInstance = vi.fn()
  let publishSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    getShowOriginalSizeSpy = vi.spyOn(Internals, 'getShowOriginalSize').mockReturnValue(false)
    setShowOriginalSizeSpy = vi
      .spyOn(Internals, 'setShowOriginalSize')
      .mockImplementation((..._args: unknown[]) => undefined)
    updateSizeSelectorSliderSpy = vi
      .spyOn(Internals, 'updateSizeSelectorSlider')
      .mockImplementation((..._args: unknown[]) => undefined)
    publishSpy = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should update current status on init', () => {
    initSizeSelectorSlider()
    expect(updateSizeSelectorSliderSpy.mock.calls.length).toBe(1)
  })
  it('should not refresh the displayed picture on init', () => {
    initSizeSelectorSlider()
    expect(publishSpy.mock.calls.length).toBe(0)
  })
  it('should update slider on click event from child element', () => {
    initSizeSelectorSlider()
    updateSizeSelectorSliderSpy.mockClear()
    const element = dom.window.document.querySelector('#slider4test')
    assert(element !== null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateSizeSelectorSliderSpy.mock.calls.length).toBe(1)
  })
  it('should update slider on click event from slider element', () => {
    initSizeSelectorSlider()
    updateSizeSelectorSliderSpy.mockClear()
    const element = dom.window.document.querySelector('.selectScaledOriginal')
    assert(element !== null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateSizeSelectorSliderSpy.mock.calls.length).toBe(1)
  })
  it('should call setShowOriginalSize once when currently set', () => {
    initSizeSelectorSlider()
    getShowOriginalSizeSpy.mockReturnValue(true)
    const element = dom.window.document.querySelector('.selectScaledOriginal')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowOriginalSizeSpy.mock.calls.length).toEqual(1)
  })
  it('should call setShowOriginalSize with false when currently set', () => {
    initSizeSelectorSlider()
    getShowOriginalSizeSpy.mockReturnValue(true)
    const element = dom.window.document.querySelector('.selectScaledOriginal')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowOriginalSizeSpy.mock.calls[0]).toEqual([false])
  })
  it('should call setShowOriginalSize once when currently unset', () => {
    initSizeSelectorSlider()
    getShowOriginalSizeSpy.mockReturnValue(false)
    const element = dom.window.document.querySelector('.selectScaledOriginal')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowOriginalSizeSpy.mock.calls.length).toEqual(1)
  })
  it('should call setShowOriginalSize with true when currently unset', () => {
    initSizeSelectorSlider()
    getShowOriginalSizeSpy.mockReturnValue(false)
    const element = dom.window.document.querySelector('.selectScaledOriginal')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowOriginalSizeSpy.mock.calls[0]).toEqual([true])
  })
  it('should publish only the size mode and refresh topics on toggle', () => {
    initSizeSelectorSlider()
    const element = dom.window.document.querySelector('.selectScaledOriginal')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(publishSpy.mock.calls.map((c) => cast<string>(c[0]))).toEqual(['Pictures:SizeMode', 'Pictures:Refresh'])
  })
})
