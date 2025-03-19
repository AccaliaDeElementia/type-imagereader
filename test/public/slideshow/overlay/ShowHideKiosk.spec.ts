'use sanity'

import { Functions } from '../../../../public/scripts/slideshow/overlay'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'

describe('public/slideshow/weather LocalWeatherUpdater', () => {
  const dom = new JSDOM('<html></html>')

  it('should add the .hide class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    Functions.ShowHideKiosk(elem, true)
    expect(elem.className).to.contain('hide')
  })
  it('should preserve the .hide class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('hide')
    Functions.ShowHideKiosk(elem, true)
    expect(elem.className).to.contain('hide')
  })
  it('should preserve unrelated class when in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('foo')
    Functions.ShowHideKiosk(elem, true)
    expect(elem.className).to.contain('foo')
  })
  it('should remove the .hide class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('hide')
    Functions.ShowHideKiosk(elem, false)
    expect(elem.className).to.not.contain('hide')
  })
  it('should accept missing .hide class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    Functions.ShowHideKiosk(elem, false)
    expect(elem.className).to.not.contain('hide')
  })
  it('should preserve unrelated class when not in kiosk mode', () => {
    const elem = dom.window.document.createElement('div')
    elem.classList.add('foo')
    Functions.ShowHideKiosk(elem, false)
    expect(elem.className).to.contain('foo')
  })
})
