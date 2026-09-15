'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Imports, Internals } from '#public/scripts/app/sizeMode.js'
import type { MockInstance } from 'vitest'

const markup = `html
  body
    div.optionGroup.selectSizeMode
      button(data-value="fitScreen") Fit Screen
`

describe('public/app/sizeMode showActiveSizeOption()', () => {
  let dom = new JSDOM('<html></html>')
  let selectOptionSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' })
    mountDom(dom)
    vi.spyOn(Internals, 'getSizeMode').mockReturnValue('fitHeight')
    selectOptionSpy = vi.spyOn(Imports, 'selectOption').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should mark an option once', () => {
    Internals.showActiveSizeOption()
    expect(selectOptionSpy.mock.calls).toHaveLength(1)
  })
  it('should mark the option in the size mode group', () => {
    Internals.showActiveSizeOption()
    expect(selectOptionSpy.mock.calls[0]?.[0]).toBe('.selectSizeMode')
  })
  it('should mark the option matching the stored mode', () => {
    Internals.showActiveSizeOption()
    expect(selectOptionSpy.mock.calls[0]?.[1]).toBe('fitHeight')
  })
})
