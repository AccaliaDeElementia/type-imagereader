'use sanity'

import { assert, expect } from 'chai'
import { describe, it } from 'mocha'
import { Actions } from '#public/scripts/app/actions'
import { JSDOM } from 'jsdom'
import { Cast } from '#testutils/TypeGuards'
import { DoesNotThrow } from '#testutils/Errors'

describe('public/app/actions function setInnerTextMaybe', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  const dom: JSDOM = new JSDOM('<html><body><div><span class="foo"></span></div></div></html>', {})

  let divNode = Cast<HTMLDivElement>(null)
  let spanNode = Cast<HTMLSpanElement>(null)
  beforeEach(() => {
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    const div = dom.window.document.querySelector('div')
    assert(div !== null)
    divNode = div
    const span = dom.window.document.querySelector('span')
    assert(span !== null)
    spanNode = span
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
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
