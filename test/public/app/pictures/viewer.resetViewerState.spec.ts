'use sanity'

import { Viewer, resetViewerState } from '#public/scripts/app/pictures/viewer.js'

describe('public/app/pictures resetViewerState()', () => {
  it('should reset modCount to the uninitialized sentinel', () => {
    Viewer.modCount = 99
    resetViewerState()
    expect(Viewer.modCount).toBe(-1)
  })
  it('should replace nextLoader with a fresh Promise', () => {
    const sentinel = Promise.resolve()
    Viewer.nextLoader = sentinel
    resetViewerState()
    expect(Viewer.nextLoader).not.toBe(sentinel)
  })
  it('should set nextPending to true', () => {
    Viewer.nextPending = false
    resetViewerState()
    expect(Viewer.nextPending).toBe(true)
  })
})
