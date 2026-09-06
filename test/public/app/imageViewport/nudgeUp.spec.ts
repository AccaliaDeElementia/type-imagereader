'use sanity'

import { nudgeUp, Imports, Viewport } from '#public/scripts/app/imageViewport.js'
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

describe('public/app/imageViewport nudgeUp()', () => {
  let getShowOriginalSizeStub: MockInstance = vi.fn()
  let container = makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  const mount = (built: FakeContainer): void => {
    container = built
    Viewport.container = cast<HTMLElement>(container)
  }
  beforeEach(() => {
    getShowOriginalSizeStub = vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(true)
    mount(makeContainer(VIEWPORT_WIDTH, 1800))
    container.scrollTop = MAX_SCROLL_TOP
  })
  afterEach(() => {
    Viewport.container = null
  })

  it('should consume the input while there is room above', () => {
    expect(nudgeUp()).toBe(true)
  })
  it('should move up by less than a full step', () => {
    nudgeUp()
    expect(container.scrollTop).toBe(MAX_SCROLL_TOP - NUDGE_DISTANCE)
  })
  it('should stop at the top rather than overshooting', () => {
    container.scrollTop = 20
    nudgeUp()
    expect(container.scrollTop).toBe(0)
  })
  it('should not move sideways', () => {
    nudgeUp()
    expect(container.scrollLeft).toBe(0)
  })
  it('should hand the input on at the top', () => {
    container.scrollTop = 0
    expect(nudgeUp()).toBe(false)
  })
  it('should hand the input on when the image fits', () => {
    mount(makeContainer(VIEWPORT_WIDTH, VIEWPORT_HEIGHT))
    expect(nudgeUp()).toBe(false)
  })
  it('should hand the input on when actual size mode is off', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    expect(nudgeUp()).toBe(false)
  })
  it('should not move when actual size mode is off', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    nudgeUp()
    expect(container.scrollTop).toBe(MAX_SCROLL_TOP)
  })
})
