'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions } from '../../../../public/scripts/slideshow/weather'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { Cast } from '../../../testutils/TypeGuards'
import assert from 'assert'

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
`

describe('slideshow/weather ShowData()', () => {
  const baseWindow = global.window
  const baseDocument = global.document
  let dom = new JSDOM('')
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
  })
  afterEach(() => {
    global.window = baseWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => baseDocument,
    })
  })

  it('should accept null base element', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .temp')
    Functions.ShowData(null, element, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should accept undefined base element', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .temp')
    Functions.ShowData(undefined, element, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should accept null element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Functions.ShowData(base, null, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should accept undefined element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Functions.ShowData(base, null, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should not set display style with null element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.removeProperty('display')
    Functions.ShowData(base, null, 'FOO')
    expect(base?.style.getPropertyValue('display')).to.equal('')
  })

  it('should not set display style with undefined element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.removeProperty('display')
    Functions.ShowData(base, undefined, 'FOO')
    expect(base?.style.getPropertyValue('display')).to.equal('')
  })

  it('should set display:none style with null input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.setProperty('display', 'Foo!')
    const element = base?.querySelector<HTMLElement>('.desctext')
    Functions.ShowData(base, element, null)
    expect(base?.style.getPropertyValue('display')).to.equal('none')
  })

  it('should set display:none style with undefined input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.setProperty('display', 'Foo!')
    const element = base?.querySelector<HTMLElement>('.desctext')
    Functions.ShowData(base, element, undefined)
    expect(base?.style.getPropertyValue('display')).to.equal('none')
  })

  it('should set display:none style with empty input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.setProperty('display', 'Foo!')
    const element = base?.querySelector<HTMLElement>('.desctext')
    Functions.ShowData(base, element, '')
    expect(base?.style.getPropertyValue('display')).to.equal('none')
  })

  it('should set display:flex style with stringy input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.setProperty('display', 'Foo!')
    const element = base?.querySelector<HTMLElement>('.desctext')
    Functions.ShowData(base, element, 'foo!')
    expect(base?.style.getPropertyValue('display')).to.equal('flex')
  })

  it('should place the text node with stringy input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const element = base?.querySelector<HTMLElement>('.desctext')
    const value = `Foo Data ${Math.random()}`
    Functions.ShowData(base, element, value)
    expect(element?.innerHTML).to.equal(value)
  })
})
