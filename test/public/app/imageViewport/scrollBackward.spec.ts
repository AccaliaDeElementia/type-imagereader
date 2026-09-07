'use sanity'

import { scrollBackward, Imports, Viewport } from '#public/scripts/app/imageViewport.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

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
const STEP_FRACTION = 0.9
const VERTICAL_STEP = VIEWPORT_HEIGHT * STEP_FRACTION
const HORIZONTAL_STEP = VIEWPORT_WIDTH * STEP_FRACTION

const makeContainer = (scrollWidth: number, scrollHeight: number): FakeContainer => {
  const container: FakeContainer = {
    scrollLeft: 0,
    scrollTop: 0,
    clientWidth: VIEWPORT_WIDTH,
    clientHeight: VIEWPORT_HEIGHT,
    scrollWidth,
    scrollHeight,
  }
  return container
}

describe('public/app/imageViewport scrollBackward()', () => {
  let getShowOriginalSizeStub: MockInstance = vi.fn()
  let container = makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  const mount = (built: FakeContainer): FakeContainer => {
    container = built
    Viewport.container = cast<HTMLElement>(container)
    return container
  }
  beforeEach(() => {
    getShowOriginalSizeStub = vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(true)
    mount(makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT))
  })
  afterEach(() => {
    Viewport.container = null
  })

  describe('when the image fits the viewport', () => {
    it('should not consume the input', () => {
      expect(scrollBackward()).toBe('exhausted')
    })
    it('should not move the viewport', () => {
      scrollBackward()
      expect(container.scrollTop).toBe(0)
    })
  })

  describe('when actual size mode is off', () => {
    beforeEach(() => {
      getShowOriginalSizeStub.mockReturnValue(false)
      mount(makeContainer(2400, 1800))
      container.scrollTop = 1200
    })
    it('should not consume the input', () => {
      expect(scrollBackward()).toBe('exhausted')
    })
    it('should not move the viewport', () => {
      scrollBackward()
      expect(container.scrollTop).toBe(1200)
    })
  })

  describe('when the image is taller than the viewport only', () => {
    beforeEach(() => {
      mount(makeContainer(VIEWPORT_WIDTH, 1800))
      container.scrollTop = 1200
    })
    it('should consume the input', () => {
      expect(scrollBackward()).toBe('consumed')
    })
    it('should retreat one screenful up', () => {
      scrollBackward()
      expect(container.scrollTop).toBe(1200 - VERTICAL_STEP)
    })
    it('should stop at the top rather than overshooting', () => {
      container.scrollTop = 200
      scrollBackward()
      expect(container.scrollTop).toBe(0)
    })
    it('should hand the input on once the top is reached', () => {
      container.scrollTop = 0
      expect(scrollBackward()).toBe('exhausted')
    })
  })

  describe('when the image is wider than the viewport only', () => {
    beforeEach(() => {
      mount(makeContainer(2400, VIEWPORT_HEIGHT))
      container.scrollLeft = 1600
    })
    it('should consume the input', () => {
      expect(scrollBackward()).toBe('consumed')
    })
    it('should retreat one screenful left', () => {
      scrollBackward()
      expect(container.scrollLeft).toBe(1600 - HORIZONTAL_STEP)
    })
    it('should stop at the left edge rather than overshooting', () => {
      container.scrollLeft = 200
      scrollBackward()
      expect(container.scrollLeft).toBe(0)
    })
    it('should hand the input on once the left edge is reached', () => {
      container.scrollLeft = 0
      expect(scrollBackward()).toBe('exhausted')
    })
  })

  describe('when the image exceeds the viewport in both directions', () => {
    beforeEach(() => {
      mount(makeContainer(2400, 1800))
      container.scrollLeft = HORIZONTAL_STEP
      container.scrollTop = 0
    })
    it('should step back across once the column tops out', () => {
      scrollBackward()
      expect(container.scrollLeft).toBe(0)
    })
    it('should land at the bottom of the previous column', () => {
      scrollBackward()
      expect(container.scrollTop).toBe(1200)
    })
    it('should consume the input when stepping across', () => {
      expect(scrollBackward()).toBe('consumed')
    })
    it('should work up the column before moving across', () => {
      container.scrollTop = 1200
      scrollBackward()
      expect(container.scrollLeft).toBe(HORIZONTAL_STEP)
    })
    it('should hand the input on at the near corner', () => {
      container.scrollLeft = 0
      container.scrollTop = 0
      expect(scrollBackward()).toBe('exhausted')
    })
  })
})
