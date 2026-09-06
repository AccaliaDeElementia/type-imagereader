'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/sizeFilter.js'
import { render } from 'pug'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

const markup = `html
  body
    div.selectScaledOriginal
      div#slider4test
      `
describe('public/app/pictures updateSizeSelectorSlider()', () => {
  let dom = new JSDOM('<html></html>')
  let getShowOriginalSizeSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    getShowOriginalSizeSpy = vi.spyOn(Internals, 'getShowOriginalSize').mockReturnValue(false)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should handle missing target element gracefully', () => {
    const elem = dom.window.document.querySelector('body > div')
    elem?.parentElement?.removeChild(elem)
    expect(() => {
      Internals.updateSizeSelectorSlider()
    }).not.toThrow()
  })
  it('should remove original class from slider when value is false', () => {
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    elem.classList.add('original')
    Internals.updateSizeSelectorSlider()
    expect(elem.classList.contains('original')).toBe(false)
  })
  it('should add scaled class to slider when value is false', () => {
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    Internals.updateSizeSelectorSlider()
    expect(elem.classList.contains('scaled')).toBe(true)
  })
  it('should add original class to slider when value is true', () => {
    getShowOriginalSizeSpy.mockReturnValue(true)
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    Internals.updateSizeSelectorSlider()
    expect(elem.classList.contains('original')).toBe(true)
  })
  it('should remove scaled class from slider when value is true', () => {
    getShowOriginalSizeSpy.mockReturnValue(true)
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    elem.classList.add('scaled')
    Internals.updateSizeSelectorSlider()
    expect(elem.classList.contains('scaled')).toBe(false)
  })
})
