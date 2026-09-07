'use sanity'

import { setArrival, Viewport } from '#public/scripts/app/imageViewport.js'

describe('public/app/imageViewport setArrival()', () => {
  beforeEach(() => {
    Viewport.arrival = 'freshStart'
  })
  afterEach(() => {
    Viewport.arrival = 'freshStart'
  })
  it('should record an arrival at the end of the next picture', () => {
    setArrival('resumeFromEnd')
    expect(Viewport.arrival).toBe('resumeFromEnd')
  })
  it('should record an arrival at the start of the next picture', () => {
    Viewport.arrival = 'resumeFromEnd'
    setArrival('freshStart')
    expect(Viewport.arrival).toBe('freshStart')
  })
})
