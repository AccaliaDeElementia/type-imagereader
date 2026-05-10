'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { isHTMLElement } from '#contracts/markup.js'
import { mountDom, unmountDom } from '#testutils/dom.js'

const dom = new JSDOM('<html></html>')

describe('Contracts: isHTMLElement()', () => {
  beforeEach(() => {
    mountDom(dom)
  })
  afterEach(() => {
    unmountDom()
  })

  const cases: Array<[string, () => unknown, boolean]> = [
    ['null', () => null, false],
    ['undefined', () => undefined, false],
    ['dict', () => ({}), false],
    ['array', () => [], false],
    ['real HTMLElement', () => dom.window.document.createElement('div'), true],
  ]
  cases.forEach(([title, build, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isHTMLElement(build())).to.equal(expected)
    })
  })
})
