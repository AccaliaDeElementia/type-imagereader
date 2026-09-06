'use sanity'

import { viewportSize, Viewport } from '#public/scripts/app/imageViewport.js'
import { cast } from '#testutils/typeGuards.js'

describe('public/app/imageViewport viewportSize()', () => {
  beforeEach(() => {
    Viewport.container = cast<HTMLElement>({ clientWidth: 1024, clientHeight: 768 })
  })
  afterEach(() => {
    Viewport.container = null
  })
  it('should report the container width', () => {
    expect(viewportSize().width).toBe(1024)
  })
  it('should report the container height', () => {
    expect(viewportSize().height).toBe(768)
  })
  it('should report zero width when there is no container', () => {
    Viewport.container = null
    expect(viewportSize().width).toBe(0)
  })
  it('should report zero height when there is no container', () => {
    Viewport.container = null
    expect(viewportSize().height).toBe(0)
  })
})
