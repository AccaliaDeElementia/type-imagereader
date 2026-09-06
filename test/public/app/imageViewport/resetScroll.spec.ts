'use sanity'

import { resetScroll, Viewport } from '#public/scripts/app/imageViewport.js'
import { cast } from '#testutils/typeGuards.js'

describe('public/app/imageViewport resetScroll()', () => {
  let container = { scrollLeft: 0, scrollTop: 0 }
  beforeEach(() => {
    container = { scrollLeft: 250, scrollTop: 400 }
    Viewport.container = cast<HTMLElement>(container)
  })
  afterEach(() => {
    Viewport.container = null
  })
  it('should tolerate a missing container', () => {
    Viewport.container = null
    expect(() => {
      resetScroll()
    }).not.toThrow()
  })
  it('should return to the left edge', () => {
    resetScroll()
    expect(container.scrollLeft).toBe(0)
  })
  it('should return to the top edge', () => {
    resetScroll()
    expect(container.scrollTop).toBe(0)
  })
})
