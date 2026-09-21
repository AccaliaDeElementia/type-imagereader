'use sanity'

import { Internals } from '#public/scripts/app/actions.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { cast } from '#testutils/typeGuards.js'
import { required } from '#testutils/preconditions.js'

describe('public/app/actions setInnerTextMaybe', () => {
  const dom: JSDOM = new JSDOM('<html><body><div><span class="foo"></span></div></div></html>', {})

  let divNode = cast<HTMLDivElement>(null)
  let spanNode = cast<HTMLSpanElement>(null)
  beforeEach(() => {
    mountDom(dom)
    divNode = required(dom.window.document.querySelector('div'), 'the div node')
    spanNode = required(dom.window.document.querySelector('span'), 'the span node')
  })
  afterEach(() => {
    unmountDom()
  })
  it('should handle no matching node to set text', () => {
    expect(() => {
      Internals.setInnerTextMaybe(divNode, '.xyzzy', 'foo')
    }).not.toThrow()
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
