'use sanity'

import { Internals } from '#public/scripts/slideshow/overlay.js'
import { JSDOM } from 'jsdom'

describe('public/slideshow/overlay showHideKiosk()', () => {
  const dom = new JSDOM('<html></html>')

  it('should accept missing .hide class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    Internals.showHideKiosk(elem, true)
    expect(elem.className).not.toContain('hide')
  })
  it('should remove the .hide class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('hide')
    Internals.showHideKiosk(elem, true)
    expect(elem.className).not.toContain('hide')
  })
  it('should preserve unrelated class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('foo')
    Internals.showHideKiosk(elem, true)
    expect(elem.className).toContain('foo')
  })
  it('should preserve the .hide class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('hide')
    Internals.showHideKiosk(elem, false)
    expect(elem.className).toContain('hide')
  })
  it('should add missing .hide class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    Internals.showHideKiosk(elem, false)
    expect(elem.className).toContain('hide')
  })
  it('should preserve unrelated class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('foo')
    Internals.showHideKiosk(elem, false)
    expect(elem.className).toContain('foo')
  })
})
