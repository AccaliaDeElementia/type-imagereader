'use sanity'

import { setEntryCorner, Viewport } from '#public/scripts/app/imageViewport.js'

describe('public/app/imageViewport setEntryCorner()', () => {
  beforeEach(() => {
    Viewport.entry = 'start'
  })
  afterEach(() => {
    Viewport.entry = 'start'
  })
  it('should record an arrival at the end of the next picture', () => {
    setEntryCorner('end')
    expect(Viewport.entry).toBe('end')
  })
  it('should record an arrival at the start of the next picture', () => {
    Viewport.entry = 'end'
    setEntryCorner('start')
    expect(Viewport.entry).toBe('start')
  })
})
