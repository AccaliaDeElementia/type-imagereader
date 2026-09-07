'use sanity'

import { getPanTarget, Imports, Viewport } from '#public/scripts/app/imageViewport.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('public/app/imageViewport getPanTarget()', () => {
  let getShowOriginalSizeStub: MockInstance = vi.fn()
  const container = cast<HTMLElement>({ scrollLeft: 0, scrollTop: 0 })
  beforeEach(() => {
    Viewport.container = container
    getShowOriginalSizeStub = vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(true)
  })
  afterEach(() => {
    Viewport.container = null
  })
  it('should offer the container when actual size mode is on', () => {
    expect(getPanTarget()).toBe(container)
  })
  it('should offer nothing when actual size mode is off', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    expect(getPanTarget()).toBe(null)
  })
  it('should offer nothing when there is no container', () => {
    Viewport.container = null
    expect(getPanTarget()).toBe(null)
  })
})
