'use sanity'

import { applyEntryScroll, Viewport } from '#public/scripts/app/imageViewport.js'
import { cast } from '#testutils/typeGuards.js'

interface FakeContainer {
  scrollLeft: number
  scrollTop: number
  clientWidth: number
  clientHeight: number
  scrollWidth: number
  scrollHeight: number
}

const VIEWPORT_WIDTH = 800
const VIEWPORT_HEIGHT = 600
const MAX_SCROLL_LEFT = 1600
const MAX_SCROLL_TOP = 1200

const makeContainer = (scrollWidth: number, scrollHeight: number): FakeContainer => {
  const container: FakeContainer = {
    scrollLeft: 250,
    scrollTop: 400,
    clientWidth: VIEWPORT_WIDTH,
    clientHeight: VIEWPORT_HEIGHT,
    scrollWidth,
    scrollHeight,
  }
  return container
}

describe('public/app/imageViewport applyEntryScroll()', () => {
  let container = makeContainer(2400, 1800)
  const mount = (built: FakeContainer): void => {
    container = built
    Viewport.container = cast<HTMLElement>(container)
  }
  beforeEach(() => {
    mount(makeContainer(2400, 1800))
    Viewport.arrival = 'freshStart'
  })
  afterEach(() => {
    Viewport.container = null
    Viewport.arrival = 'freshStart'
  })

  it('should tolerate a missing container', () => {
    Viewport.container = null
    expect(() => {
      applyEntryScroll()
    }).not.toThrow()
  })

  describe('arriving at the start', () => {
    it('should land at the left edge', () => {
      applyEntryScroll()
      expect(container.scrollLeft).toBe(0)
    })
    it('should land at the top edge', () => {
      applyEntryScroll()
      expect(container.scrollTop).toBe(0)
    })
  })

  describe('arriving at the end', () => {
    beforeEach(() => {
      Viewport.arrival = 'resumeFromEnd'
    })
    it('should land at the right edge', () => {
      applyEntryScroll()
      expect(container.scrollLeft).toBe(MAX_SCROLL_LEFT)
    })
    it('should land at the bottom edge', () => {
      applyEntryScroll()
      expect(container.scrollTop).toBe(MAX_SCROLL_TOP)
    })
    it('should land at the bottom of a picture that only overflows vertically', () => {
      mount(makeContainer(VIEWPORT_WIDTH, 1800))
      applyEntryScroll()
      expect(container.scrollTop).toBe(MAX_SCROLL_TOP)
    })
    it('should not offset a picture that only overflows vertically sideways', () => {
      mount(makeContainer(VIEWPORT_WIDTH, 1800))
      applyEntryScroll()
      expect(container.scrollLeft).toBe(0)
    })
    it('should land at the right of a picture that only overflows horizontally', () => {
      mount(makeContainer(2400, VIEWPORT_HEIGHT))
      applyEntryScroll()
      expect(container.scrollLeft).toBe(MAX_SCROLL_LEFT)
    })
    it('should leave a picture that fits at the origin', () => {
      mount(makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT))
      applyEntryScroll()
      expect(container.scrollTop).toBe(0)
    })
    it('should consume the arrival so the next picture starts at the top', () => {
      applyEntryScroll()
      expect(Viewport.arrival).toBe('freshStart')
    })
  })
})
