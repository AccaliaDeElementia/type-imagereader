'use sanity'

import { assert, expect } from 'chai'
import { Actions } from '#public/scripts/app/actions.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { Cast } from '#testutils/TypeGuards.js'
import { DoesNotThrow } from '#testutils/Errors.js'

describe('public/app/actions function setInnerTextMaybe', () => {
  const dom: JSDOM = new JSDOM('<html><body><div><span class="foo"></span></div></div></html>', {})

  let divNode = Cast<HTMLDivElement>(null)
  let spanNode = Cast<HTMLSpanElement>(null)
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
    DoesNotThrow(() => {
      Actions.setInnerTextMaybe(divNode, '.xyzzy', 'foo')
    })
  })
  it('should set inner text for matching node by node name', () => {
    Actions.setInnerTextMaybe(divNode, 'span', 'foo')
    expect(spanNode.innerText).to.equal('foo')
  })
  it('should set inner text for matching node by class', () => {
    Actions.setInnerTextMaybe(divNode, '.foo', 'foo')
    expect(spanNode.innerText).to.equal('foo')
  })
})
