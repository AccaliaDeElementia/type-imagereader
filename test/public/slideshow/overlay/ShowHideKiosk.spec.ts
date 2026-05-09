'use sanity'

import { Internals } from '#public/scripts/slideshow/overlay.js'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'

describe('public/slideshow/overlay ShowHideKiosk()', () => {
  const dom = new JSDOM('<html></html>')

  it('should accept missing .hide class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    Internals.ShowHideKiosk(elem, true)
    expect(elem.className).to.not.contain('hide')
  })
  it('should remove the .hide class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('hide')
    Internals.ShowHideKiosk(elem, true)
    expect(elem.className).to.not.contain('hide')
  })
  it('should preserve unrelated class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('foo')
    Internals.ShowHideKiosk(elem, true)
    expect(elem.className).to.contain('foo')
  })
  it('should preserve the .hide class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('hide')
    Internals.ShowHideKiosk(elem, false)
    expect(elem.className).to.contain('hide')
  })
  it('should add missing .hide class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    Internals.ShowHideKiosk(elem, false)
    expect(elem.className).to.contain('hide')
  })
  it('should preserve unrelated class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('foo')
    Internals.ShowHideKiosk(elem, false)
    expect(elem.className).to.contain('foo')
  })
})
