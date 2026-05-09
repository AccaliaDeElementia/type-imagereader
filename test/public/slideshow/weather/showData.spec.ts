'use sanity'

import { Internals } from '#public/scripts/slideshow/weather.js'
import { expect } from 'chai'
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

describe('public/slideshow/weather showData()', () => {
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

  it('should accept null base element', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .temp')
    Internals.showData(null, element, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should accept undefined base element', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .temp')
    Internals.showData(undefined, element, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should accept null element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showData(base, null, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should accept undefined element', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    Internals.showData(base, null, 'FOO')
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
      Internals.showData(base, element, 'FOO')
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
      Internals.showData(base, element, input)
      expect(base?.style.getPropertyValue('display')).to.equal('none')
    })
  })

  it('should not clear existing element content for empty string input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const element = base?.querySelector<HTMLElement>('.desctext')
    if (element !== null && element !== undefined) element.innerHTML = 'existing content'
    Internals.showData(base, element, '')
    expect(element?.innerHTML).to.equal('existing content')
  })

  it('should set display:flex style with stringy input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.setProperty('display', 'Foo!')
    const element = base?.querySelector<HTMLElement>('.desctext')
    Internals.showData(base, element, 'foo!')
    expect(base?.style.getPropertyValue('display')).to.equal('flex')
  })

  it('should place the text node with stringy input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const element = base?.querySelector<HTMLElement>('.desctext')
    const value = `Foo Data ${Math.random()}`
    Internals.showData(base, element, value)
    expect(element?.innerHTML).to.equal(value)
  })
})
