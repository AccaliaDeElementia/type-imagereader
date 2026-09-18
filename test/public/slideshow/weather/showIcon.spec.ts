'use sanity'

import { Internals } from '#public/scripts/slideshow/weather.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import assert from 'node:assert'

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
`

describe('public/slideshow/weather showIcon()', () => {
  let dom = new JSDOM('')
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    unmountDom()
  })

  const acceptBaseTests: Array<[string, null | undefined]> = [
    ['null base element', null],
    ['undefined base element', undefined],
  ]
  acceptBaseTests.forEach(([title, base]) => {
    it(`should not throw when the ${title} is given a valid icon`, () => {
      expect(() => {
        Internals.showIcon(base, 'FOO')
      }).not.toThrow()
    })
  })

  const hidingTests: Array<[string, string | null | undefined]> = [
    ['hide element on null icon', null],
    ['hide element on undefined icon', undefined],
    ['hide element on empty icon', ''],
  ]
  hidingTests.forEach(([title, icon]) => {
    it(`should ${title}`, () => {
      const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
      element?.style.setProperty('display', 'FOO')
      Internals.showIcon(element, icon)
      expect(element?.style.display).toBe('none')
    })
  })

  it('should hide element while load is pending on valid icon (no flash of broken image)', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    element?.style.setProperty('display', 'FOO')
    Internals.showIcon(element, '01d')
    expect(element?.style.display).toBe('none')
  })

  it('should set src to proxied path on valid icon', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    Internals.showIcon(element, '01d')
    expect(element?.getAttribute('src')).toBe('/weather/icon/01d')
  })

  it('should show the element when the onload handler fires', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    Internals.showIcon(element, '01d')
    element?.dispatchEvent(new dom.window.Event('load'))
    expect(element?.style.display).toBe('inline-block')
  })

  it('should keep the element hidden when the onerror handler fires', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    Internals.showIcon(element, '01d')
    element?.dispatchEvent(new dom.window.Event('error'))
    expect(element?.style.display).toBe('none')
  })

  it('should not stack load handlers across repeated updates', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    assert(element !== null)
    Internals.showIcon(element, '01d')
    Internals.showIcon(element, '01n')
    Internals.showIcon(element, '02d')
    const setProperty = vi.spyOn(element.style, 'setProperty')
    element.dispatchEvent(new dom.window.Event('load'))
    expect(setProperty.mock.calls.length).toBe(1)
  })
  it('should not stack error handlers across repeated updates', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    assert(element !== null)
    Internals.showIcon(element, '01d')
    Internals.showIcon(element, '01n')
    Internals.showIcon(element, '02d')
    const setProperty = vi.spyOn(element.style, 'setProperty')
    element.dispatchEvent(new dom.window.Event('error'))
    expect(setProperty.mock.calls.length).toBe(1)
  })

  it('should hide a previously-shown element if a subsequent load fails', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    Internals.showIcon(element, '01d')
    element?.dispatchEvent(new dom.window.Event('load'))
    Internals.showIcon(element, '01n')
    element?.dispatchEvent(new dom.window.Event('error'))
    expect(element?.style.display).toBe('none')
  })
})
