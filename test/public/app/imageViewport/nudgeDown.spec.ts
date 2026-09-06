'use sanity'

import { nudgeDown, Imports, Viewport } from '#public/scripts/app/imageViewport.js'
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
// A nudge is a fraction of a stepped scroll, for lining up a panel that a full
// step left cut off.
const NUDGE_DISTANCE = 120
const MAX_SCROLL_TOP = 1200

const makeContainer = (scrollWidth: number, scrollHeight: number): FakeContainer => ({
  scrollLeft: 0,
  scrollTop: 0,
  clientWidth: VIEWPORT_WIDTH,
  clientHeight: VIEWPORT_HEIGHT,
  scrollWidth,
  scrollHeight,
})

describe('public/app/imageViewport nudgeDown()', () => {
  let getShowOriginalSizeStub: MockInstance = vi.fn()
  let container = makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  const mount = (built: FakeContainer): void => {
    container = built
    Viewport.container = cast<HTMLElement>(container)
  }
  beforeEach(() => {
    getShowOriginalSizeStub = vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(true)
    mount(makeContainer(VIEWPORT_WIDTH, 1800))
  })
  afterEach(() => {
    Viewport.container = null
  })

  it('should consume the input while there is room below', () => {
    expect(nudgeDown()).toBe(true)
  })
  it('should move down by less than a full step', () => {
    nudgeDown()
    expect(container.scrollTop).toBe(NUDGE_DISTANCE)
  })
  it('should stop at the bottom rather than overshooting', () => {
    container.scrollTop = MAX_SCROLL_TOP - 20
    nudgeDown()
    expect(container.scrollTop).toBe(MAX_SCROLL_TOP)
  })
  it('should not move sideways', () => {
    nudgeDown()
    expect(container.scrollLeft).toBe(0)
  })
  // Falling through at the edge is what leaves the menu reachable from the
  // keyboard in actual size mode.
  it('should hand the input on at the bottom', () => {
    container.scrollTop = MAX_SCROLL_TOP
    expect(nudgeDown()).toBe(false)
  })
  it('should hand the input on when the image fits', () => {
    mount(makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT))
    expect(nudgeDown()).toBe(false)
  })
  it('should hand the input on when actual size mode is off', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    expect(nudgeDown()).toBe(false)
  })
  it('should not move when actual size mode is off', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    nudgeDown()
    expect(container.scrollTop).toBe(0)
  })
  // A wide image has no vertical slack, so Up/Down must stay out of the way.
  it('should hand the input on for a horizontally overflowing image', () => {
    mount(makeContainer(2400, VIEWPORT_HEIGHT))
    expect(nudgeDown()).toBe(false)
  })
})
