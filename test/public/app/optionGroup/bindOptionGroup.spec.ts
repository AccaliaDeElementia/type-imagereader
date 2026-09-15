'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import assert from 'node:assert'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { bindOptionGroup } from '#public/scripts/app/optionGroup.js'

const markup = `html
  body
    div.optionGroup.selectThing
      button(data-value="alpha") Alpha
      button(data-value="beta") Beta
      button.unlabelled Unlabelled
    div.optionGroup.selectOther
      button(data-value="gamma") Gamma
`

describe('public/app/optionGroup bindOptionGroup()', () => {
  let dom = new JSDOM('<html></html>')
  let chooseSpy = vi.fn<(value: string) => void>()
  const clickButton = (group: string, value: string): void => {
    const button = dom.window.document.querySelector(`${group} [data-value="${value}"]`)
    assert(button !== null)
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    chooseSpy = vi.fn<(value: string) => void>()
  })
  afterEach(() => {
    unmountDom()
  })
  it('should report a choice once per click', () => {
    bindOptionGroup('.selectThing', chooseSpy)
    clickButton('.selectThing', 'beta')
    expect(chooseSpy.mock.calls).toHaveLength(1)
  })
  it('should report the value of the clicked button', () => {
    bindOptionGroup('.selectThing', chooseSpy)
    clickButton('.selectThing', 'beta')
    expect(chooseSpy.mock.calls[0]).toEqual(['beta'])
  })
  it('should report each button in the group', () => {
    bindOptionGroup('.selectThing', chooseSpy)
    clickButton('.selectThing', 'alpha')
    expect(chooseSpy.mock.calls[0]).toEqual(['alpha'])
  })
  it('should not report clicks in another group', () => {
    bindOptionGroup('.selectThing', chooseSpy)
    clickButton('.selectOther', 'gamma')
    expect(chooseSpy.mock.calls).toHaveLength(0)
  })
  it('should suppress the default action of the click', () => {
    bindOptionGroup('.selectThing', chooseSpy)
    const button = dom.window.document.querySelector('.selectThing [data-value="alpha"]')
    assert(button !== null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
    button.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(true)
  })
  it('should report nothing for a button that carries no value', () => {
    bindOptionGroup('.selectThing', chooseSpy)
    const button = dom.window.document.querySelector('.selectThing .unlabelled')
    assert(button !== null)
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(chooseSpy.mock.calls).toHaveLength(0)
  })
  it('should tolerate a group that is not in the document', () => {
    expect(() => {
      bindOptionGroup('.selectMissing', chooseSpy)
    }).not.toThrow()
  })
})
