'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { initUnreadSelector, Imports, Internals } from '#public/scripts/app/unreadFilter.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

const markup = `html
  body
    div.optionGroup.selectUnreadAll
      button(data-value="all") Show All
      button(data-value="unread") Show Unread
`
describe('public/app/unreadFilter initUnreadSelector()', () => {
  let dom = new JSDOM('<html></html>')
  let setShowUnreadOnlySpy: MockInstance = vi.fn()
  let showActiveUnreadOptionSpy: MockInstance = vi.fn()
  let bindOptionGroupSpy: MockInstance = vi.fn()
  const chooseOption = (value: string): void => {
    const choose = cast<(value: string) => void>(bindOptionGroupSpy.mock.calls[0]?.[1])
    choose(value)
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    vi.spyOn(Internals, 'getShowUnreadOnly').mockReturnValue(false)
    setShowUnreadOnlySpy = vi
      .spyOn(Internals, 'setShowUnreadOnly')
      .mockImplementation((..._args: unknown[]) => undefined)
    showActiveUnreadOptionSpy = vi
      .spyOn(Internals, 'showActiveUnreadOption')
      .mockImplementation((..._args: unknown[]) => undefined)
    bindOptionGroupSpy = vi.spyOn(Imports, 'bindOptionGroup').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should show the current filter on init', () => {
    initUnreadSelector()
    expect(showActiveUnreadOptionSpy.mock.calls).toHaveLength(1)
  })
  it('should bind the unread option group', () => {
    initUnreadSelector()
    expect(bindOptionGroupSpy.mock.calls[0]?.[0]).toBe('.selectUnreadAll')
  })
  it('should store unread only when the unread option is chosen', () => {
    initUnreadSelector()
    chooseOption('unread')
    expect(setShowUnreadOnlySpy.mock.calls[0]).toEqual([true])
  })
  it('should clear unread only when the all option is chosen', () => {
    initUnreadSelector()
    chooseOption('all')
    expect(setShowUnreadOnlySpy.mock.calls[0]).toEqual([false])
  })
  it('should show the chosen filter', () => {
    initUnreadSelector()
    showActiveUnreadOptionSpy.mockClear()
    chooseOption('unread')
    expect(showActiveUnreadOptionSpy.mock.calls).toHaveLength(1)
  })
})
