'use sanity'

import { scrollForward, Imports, Viewport } from '#public/scripts/app/imageViewport.js'
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

describe('public/app/imageViewport scrollForward()', () => {
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
    beforeEach(() => {
      mount(makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT))
    })
    it('should not consume the input', () => {
      expect(scrollForward()).toBe('exhausted')
    })
    it('should not move the viewport', () => {
      scrollForward()
      expect(container.scrollTop).toBe(0)
    })
  })

  describe('when actual size mode is off', () => {
    beforeEach(() => {
      getShowOriginalSizeStub.mockReturnValue(false)
      mount(makeContainer(2400, 1800))
    })
    it('should not consume the input', () => {
      expect(scrollForward()).toBe('exhausted')
    })
    it('should not move the viewport', () => {
      scrollForward()
      expect(container.scrollTop).toBe(0)
    })
  })

  describe('when the image is taller than the viewport only', () => {
    beforeEach(() => {
      mount(makeContainer(VIEWPORT_WIDTH, 1800))
    })
    it('should consume the input', () => {
      expect(scrollForward()).toBe('consumed')
    })
    it('should advance one screenful down', () => {
      scrollForward()
      expect(container.scrollTop).toBe(VERTICAL_STEP)
    })
    it('should stop at the bottom rather than overshooting', () => {
      container.scrollTop = 1000
      scrollForward()
      expect(container.scrollTop).toBe(1200)
    })
    it('should not move sideways', () => {
      scrollForward()
      expect(container.scrollLeft).toBe(0)
    })
    it('should hand the input on once the bottom is reached', () => {
      container.scrollTop = 1200
      expect(scrollForward()).toBe('exhausted')
    })
  })

  describe('when the image is wider than the viewport only', () => {
    beforeEach(() => {
      mount(makeContainer(2400, VIEWPORT_HEIGHT))
    })
    it('should consume the input', () => {
      expect(scrollForward()).toBe('consumed')
    })
    it('should advance one screenful right', () => {
      scrollForward()
      expect(container.scrollLeft).toBe(HORIZONTAL_STEP)
    })
    it('should stop at the right edge rather than overshooting', () => {
      container.scrollLeft = 1200
      scrollForward()
      expect(container.scrollLeft).toBe(1600)
    })
    it('should hand the input on once the right edge is reached', () => {
      container.scrollLeft = 1600
      expect(scrollForward()).toBe('exhausted')
    })
  })

  describe('when the image exceeds the viewport in both directions', () => {
    beforeEach(() => {
      mount(makeContainer(2400, 1800))
    })
    it('should work down the column before moving across', () => {
      scrollForward()
      expect(container.scrollLeft).toBe(0)
    })
    it('should step across once the column bottoms out', () => {
      container.scrollTop = 1200
      scrollForward()
      expect(container.scrollLeft).toBe(HORIZONTAL_STEP)
    })
    it('should return to the top of the next column', () => {
      container.scrollTop = 1200
      scrollForward()
      expect(container.scrollTop).toBe(0)
    })
    it('should consume the input when stepping across', () => {
      container.scrollTop = 1200
      expect(scrollForward()).toBe('consumed')
    })
    it('should hand the input on at the far corner', () => {
      container.scrollTop = 1200
      container.scrollLeft = 1600
      expect(scrollForward()).toBe('exhausted')
    })
  })
})
