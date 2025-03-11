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

describe('public/slideshow/weather ShowIcon()', () => {
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
    Functions.ShowIcon(null, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should accept undefined base element', () => {
    Functions.ShowIcon(undefined, 'FOO')
    assert(true, 'We expect the call to return without failing on null input')
  })

  it('should hide element on null icon', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .icon')
    element?.style.setProperty('display', 'FOO')
    Functions.ShowIcon(element, null)
    expect(element?.style.display).to.equal('none')
  })

  it('should hide element on undefined icon', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .icon')
    element?.style.setProperty('display', 'FOO')
    Functions.ShowIcon(element, undefined)
    expect(element?.style.display).to.equal('none')
  })

  it('should hide element on empty icon', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .icon')
    element?.style.setProperty('display', 'FOO')
    Functions.ShowIcon(element, '')
    expect(element?.style.display).to.equal('none')
  })

  it('should unhide element on valid icon', () => {
    const element = dom.window.document.querySelector<HTMLElement>('.weather .icon')
    element?.style.setProperty('display', 'FOO')
    Functions.ShowIcon(element, '8472')
    expect(element?.style.display).to.equal('inline-block')
  })

  it('should set src attribute on valid icon', () => {
    const element = dom.window.document.querySelector<HTMLImageElement>('.weather .icon')
    Functions.ShowIcon(element, '8472')
    expect(element?.src).to.equal('https://openweathermap.org/img/w/8472.png')
  })
})
