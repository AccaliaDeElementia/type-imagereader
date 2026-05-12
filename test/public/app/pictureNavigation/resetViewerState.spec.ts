'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Viewer, resetViewerState } from '#public/scripts/app/pictureNavigation.js'

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
  it('should clear history.prev', () => {
    const pic: Picture = { name: 'x', path: '/x', seen: true }
    Viewer.history.prev = [pic]
    resetViewerState()
    expect(Viewer.history.prev).toEqual([])
  })
  it('should clear history.next', () => {
    const pic: Picture = { name: 'y', path: '/y', seen: true }
    Viewer.history.next = [pic]
    resetViewerState()
    expect(Viewer.history.next).toEqual([])
  })
})
