'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { initSizeSelector, Imports, Internals } from '#public/scripts/app/sizeMode.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

const markup = `html
  body
    div.optionGroup.selectSizeMode
      button(data-value="fitScreen") Fit Screen
      button(data-value="actualSize") Actual Size
`

describe('public/app/sizeMode initSizeSelector()', () => {
  let dom = new JSDOM('<html></html>')
  let adoptLegacySpy: MockInstance = vi.fn()
  let setSizeModeSpy: MockInstance = vi.fn()
  let showActiveSizeOptionSpy: MockInstance = vi.fn()
  let bindOptionGroupSpy: MockInstance = vi.fn()
  let publishSpy: MockInstance = vi.fn()
  const chooseOption = (value: string): void => {
    const choose = cast<(value: string) => void>(bindOptionGroupSpy.mock.calls[0]?.[1])
    choose(value)
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' })
    mountDom(dom)
    adoptLegacySpy = vi
      .spyOn(Internals, 'adoptLegacySizePreference')
      .mockImplementation((..._args: unknown[]) => undefined)
    setSizeModeSpy = vi.spyOn(Internals, 'setSizeMode').mockImplementation((..._args: unknown[]) => undefined)
    showActiveSizeOptionSpy = vi
      .spyOn(Internals, 'showActiveSizeOption')
      .mockImplementation((..._args: unknown[]) => undefined)
    bindOptionGroupSpy = vi.spyOn(Imports, 'bindOptionGroup').mockImplementation((..._args: unknown[]) => undefined)
    publishSpy = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should adopt any legacy preference before reading the mode', () => {
    initSizeSelector()
    expect(adoptLegacySpy.mock.calls).toHaveLength(1)
  })
  it('should show the current mode on init', () => {
    initSizeSelector()
    expect(showActiveSizeOptionSpy.mock.calls).toHaveLength(1)
  })
  it('should not refresh the displayed picture on init', () => {
    initSizeSelector()
    expect(publishSpy.mock.calls).toHaveLength(0)
  })
  it('should bind the size mode option group', () => {
    initSizeSelector()
    expect(bindOptionGroupSpy.mock.calls[0]?.[0]).toBe('.selectSizeMode')
  })
  it('should store the chosen mode', () => {
    initSizeSelector()
    chooseOption('actualSize')
    expect(setSizeModeSpy.mock.calls[0]).toEqual(['actualSize'])
  })
  it('should show the chosen mode', () => {
    initSizeSelector()
    showActiveSizeOptionSpy.mockClear()
    chooseOption('actualSize')
    expect(showActiveSizeOptionSpy.mock.calls).toHaveLength(1)
  })
  it('should reshape the viewer then refetch the picture when a mode is chosen', () => {
    initSizeSelector()
    chooseOption('actualSize')
    expect(publishSpy.mock.calls.map((c) => cast<string>(c[0]))).toEqual(['Pictures:SizeMode', 'Pictures:Refresh'])
  })
  it('should ignore a value that is not a size mode', () => {
    initSizeSelector()
    chooseOption('enhance')
    expect(setSizeModeSpy.mock.calls).toHaveLength(0)
  })
  it('should not refresh the picture for a value that is not a size mode', () => {
    initSizeSelector()
    chooseOption('enhance')
    expect(publishSpy.mock.calls).toHaveLength(0)
  })
})
