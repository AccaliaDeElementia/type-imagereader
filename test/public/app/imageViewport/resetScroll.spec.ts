'use sanity'

import { resetScroll, Viewport } from '#public/scripts/app/imageViewport.js'
import { cast } from '#testutils/typeGuards.js'

interface FakeContainer {
  scrollLeft: number
  scrollTop: number
}

const makeContainer = (): FakeContainer => {
  const container: FakeContainer = {
    scrollLeft: 250,
    scrollTop: 400,
  }
  return container
}

describe('public/app/imageViewport resetScroll()', () => {
  let container = makeContainer()
  beforeEach(() => {
    container = makeContainer()
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
