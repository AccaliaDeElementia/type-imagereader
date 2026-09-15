'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Imports, Internals } from '#public/scripts/app/unreadFilter.js'
import { render } from 'pug'
import type { MockInstance } from 'vitest'

const markup = `html
  body
    div.optionGroup.selectUnreadAll
      button(data-value="all") Show All
      button(data-value="unread") Show Unread
`
describe('public/app/unreadFilter showActiveUnreadOption()', () => {
  let dom = new JSDOM('<html></html>')
  let getShowUnreadOnlySpy: MockInstance = vi.fn()
  let selectOptionSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    getShowUnreadOnlySpy = vi.spyOn(Internals, 'getShowUnreadOnly').mockReturnValue(false)
    selectOptionSpy = vi.spyOn(Imports, 'selectOption').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should mark an option once', () => {
    Internals.showActiveUnreadOption()
    expect(selectOptionSpy.mock.calls).toHaveLength(1)
  })
  it('should mark the option in the unread group', () => {
    Internals.showActiveUnreadOption()
    expect(selectOptionSpy.mock.calls[0]?.[0]).toBe('.selectUnreadAll')
  })
  it('should mark the all option when unread only is unset', () => {
    Internals.showActiveUnreadOption()
    expect(selectOptionSpy.mock.calls[0]?.[1]).toBe('all')
  })
  it('should mark the unread option when unread only is set', () => {
    getShowUnreadOnlySpy.mockReturnValue(true)
    Internals.showActiveUnreadOption()
    expect(selectOptionSpy.mock.calls[0]?.[1]).toBe('unread')
  })
})
