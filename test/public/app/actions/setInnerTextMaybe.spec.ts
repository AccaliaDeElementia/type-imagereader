'use sanity'

import { assert } from 'chai'
import { Internals } from '#public/scripts/app/actions.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { cast } from '#testutils/typeGuards.js'
import { doesNotThrow } from '#testutils/errors.js'

describe('public/app/actions setInnerTextMaybe', () => {
  const dom: JSDOM = new JSDOM('<html><body><div><span class="foo"></span></div></div></html>', {})

  let divNode = cast<HTMLDivElement>(null)
  let spanNode = cast<HTMLSpanElement>(null)
  beforeEach(() => {
    mountDom(dom)
    const div = dom.window.document.querySelector('div')
    assert(div !== null)
    divNode = div
    const span = dom.window.document.querySelector('span')
    assert(span !== null)
    spanNode = span
  })
  afterEach(() => {
    unmountDom()
  })
  it('should handle no mathcing node to set text', () => {
    doesNotThrow(() => {
      Internals.setInnerTextMaybe(divNode, '.xyzzy', 'foo')
    })
  })
  it('should set inner text for matching node by node name', () => {
    Internals.setInnerTextMaybe(divNode, 'span', 'foo')
    expect(spanNode.innerText).toBe('foo')
  })
  it('should set inner text for matching node by class', () => {
    Internals.setInnerTextMaybe(divNode, '.foo', 'foo')
    expect(spanNode.innerText).toBe('foo')
  })
})
