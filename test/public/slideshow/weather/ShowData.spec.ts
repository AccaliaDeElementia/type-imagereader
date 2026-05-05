'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { Functions } from '#public/scripts/slideshow/weather.js'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { Cast } from '#testutils/TypeGuards.js'
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

describe('public/slideshow/weather ShowData()', () => {
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

  const noDisplayTests: Array<[string, null | undefined]> = [
    ['null element', null],
    ['undefined element', undefined],
  ]
  noDisplayTests.forEach(([title, element]) => {
    it(`should not set display style with ${title}`, () => {
      const base = dom.window.document.querySelector<HTMLElement>('.weather')
      base?.style.removeProperty('display')
      Functions.ShowData(base, element, 'FOO')
      expect(base?.style.getPropertyValue('display')).to.equal('')
    })
  })

  const noneDisplayTests: Array<[string, string | null | undefined]> = [
    ['null input', null],
    ['undefined input', undefined],
    ['empty input', ''],
  ]
  noneDisplayTests.forEach(([title, input]) => {
    it(`should set display:none style with ${title}`, () => {
      const base = dom.window.document.querySelector<HTMLElement>('.weather')
      base?.style.setProperty('display', 'Foo!')
      const element = base?.querySelector<HTMLElement>('.desctext')
      Functions.ShowData(base, element, input)
      expect(base?.style.getPropertyValue('display')).to.equal('none')
    })
  })

  it('should not clear existing element content for empty string input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const element = base?.querySelector<HTMLElement>('.desctext')
    if (element !== null && element !== undefined) element.innerHTML = 'existing content'
    Functions.ShowData(base, element, '')
    expect(element?.innerHTML).to.equal('existing content')
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
