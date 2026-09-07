'use sanity'

import { applyEntryScroll, scrollForward, Imports, Viewport } from '#public/scripts/app/imageViewport.js'
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
const OVERFLOWING_WIDTH = 2400
const OVERFLOWING_HEIGHT = 1800
// Guards the walk against a policy that never reports exhaustion; the largest
// shape here needs an order of magnitude fewer steps.
const MAX_STEPS = 100

const makeContainer = (scrollWidth: number, scrollHeight: number): FakeContainer => ({
  scrollLeft: 0,
  scrollTop: 0,
  clientWidth: VIEWPORT_WIDTH,
  clientHeight: VIEWPORT_HEIGHT,
  scrollWidth,
  scrollHeight,
})

function walkForwardToExhaustion(): void {
  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (scrollForward() === 'exhausted') return
  }
  throw new Error('scrollForward never reported exhaustion')
}

// Stepping back into a picture is supposed to land the reader where a forward
// walk through it would have left them. applyEntryScroll jumps straight to the
// far corner instead of retracing the walk, so the two have to be checked
// against each other or they can drift apart silently.
describe('public/app/imageViewport resume position matches the forward walk', () => {
  let container = makeContainer(OVERFLOWING_WIDTH, OVERFLOWING_HEIGHT)
  beforeEach(() => {
    vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(true)
  })
  afterEach(() => {
    Viewport.container = null
    Viewport.arrival = 'freshStart'
  })

  const shapes: Array<[string, number, number]> = [
    ['taller than the viewport', VIEWPORT_WIDTH, OVERFLOWING_HEIGHT],
    ['wider than the viewport', OVERFLOWING_WIDTH, VIEWPORT_HEIGHT],
    ['larger in both directions', OVERFLOWING_WIDTH, OVERFLOWING_HEIGHT],
  ]
  shapes.forEach(([shape, scrollWidth, scrollHeight]) => {
    describe(`for a picture ${shape}`, () => {
      let walkedToLeft = 0
      let walkedToTop = 0
      beforeEach(() => {
        container = makeContainer(scrollWidth, scrollHeight)
        Viewport.container = cast<HTMLElement>(container)
        walkForwardToExhaustion()
        walkedToLeft = container.scrollLeft
        walkedToTop = container.scrollTop
        container.scrollLeft = 0
        container.scrollTop = 0
        Viewport.arrival = 'resumeFromEnd'
        applyEntryScroll()
      })
      it('should resume at the column the walk ended in', () => {
        expect(container.scrollLeft).toBe(walkedToLeft)
      })
      it('should resume at the height the walk ended at', () => {
        expect(container.scrollTop).toBe(walkedToTop)
      })
    })
  })
})
