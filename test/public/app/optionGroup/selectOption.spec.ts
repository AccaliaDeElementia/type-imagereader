'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { selectOption } from '#public/scripts/app/optionGroup.js'

const markup = `html
  body
    div.optionGroup.selectThing
      button(data-value="alpha") Alpha
      button(data-value="beta") Beta
    div.optionGroup.selectOther
      button(data-value="alpha") Other Alpha
`

describe('public/app/optionGroup selectOption()', () => {
  let dom = new JSDOM('<html></html>')
  const buttonFor = (group: string, value: string): Element | null =>
    dom.window.document.querySelector(`${group} [data-value="${value}"]`)
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should mark the button whose value was selected', () => {
    selectOption('.selectThing', 'beta')
    expect(buttonFor('.selectThing', 'beta')?.classList.contains('active')).toBe(true)
  })
  it('should unmark the buttons whose value was not selected', () => {
    selectOption('.selectThing', 'beta')
    expect(buttonFor('.selectThing', 'alpha')?.classList.contains('active')).toBe(false)
  })
  it('should clear a stale mark when the selection changes', () => {
    selectOption('.selectThing', 'alpha')
    selectOption('.selectThing', 'beta')
    expect(buttonFor('.selectThing', 'alpha')?.classList.contains('active')).toBe(false)
  })
  it('should leave buttons in other groups untouched', () => {
    selectOption('.selectThing', 'alpha')
    expect(buttonFor('.selectOther', 'alpha')?.classList.contains('active')).toBe(false)
  })
  it('should mark nothing when the value matches no button', () => {
    selectOption('.selectThing', 'gamma')
    expect(dom.window.document.querySelectorAll('.selectThing .active')).toHaveLength(0)
  })
  it('should tolerate a group that is not in the document', () => {
    expect(() => {
      selectOption('.selectMissing', 'alpha')
    }).not.toThrow()
  })
})
