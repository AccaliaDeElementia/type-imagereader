'use sanity'

import { getPanTarget, Imports, Viewport } from '#public/scripts/app/imageViewport.js'
import type { SizeMode } from '#public/scripts/app/sizeMode.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('public/app/imageViewport getPanTarget()', () => {
  let getSizeModeStub: MockInstance = vi.fn()
  const container = cast<HTMLElement>({ scrollLeft: 0, scrollTop: 0 })
  beforeEach(() => {
    Viewport.container = container
    getSizeModeStub = vi.spyOn(Imports, 'getSizeMode').mockReturnValue('actualSize')
  })
  afterEach(() => {
    Viewport.container = null
  })
  const scrolling: SizeMode[] = ['fitWidth', 'fitHeight', 'actualSize']
  scrolling.forEach((mode) => {
    it(`should offer the container in ${mode} mode`, () => {
      getSizeModeStub.mockReturnValue(mode)
      expect(getPanTarget()).toBe(container)
    })
  })
  it('should offer nothing in fitScreen mode', () => {
    getSizeModeStub.mockReturnValue('fitScreen')
    expect(getPanTarget()).toBe(null)
  })
  it('should offer nothing when there is no container', () => {
    Viewport.container = null
    expect(getPanTarget()).toBe(null)
  })
})
