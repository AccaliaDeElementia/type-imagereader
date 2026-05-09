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
    it(`should accept ${title}`, () => {
      Internals.showIcon(base, 'FOO')
      assert(true, 'We expect the call to return without failing on null input')
    })
  })

  const iconDisplayTests: Array<[string, string | null | undefined, string]> = [
    ['hide element on null icon', null, 'none'],
    ['hide element on undefined icon', undefined, 'none'],
    ['hide element on empty icon', '', 'none'],
    ['unhide element on valid icon', '8472', 'inline-block'],
  ]
  iconDisplayTests.forEach(([title, icon, expected]) => {
    it(`should ${title}`, () => {
      const element = dom.window.document.querySelector<HTMLElement>('.weather .icon')
      element?.style.setProperty('display', 'FOO')
      Internals.showIcon(element, icon)
      expect(element?.style.display).to.equal(expected)
    })
  })

  it('should set src attribute on valid icon', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    Internals.showIcon(element, '8472')
    expect(element?.src).to.equal('https://openweathermap.org/img/w/8472.png')
  })
})
