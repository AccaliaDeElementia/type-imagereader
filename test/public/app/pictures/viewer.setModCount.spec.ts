'use sanity'

import { Viewer, setModCount } from '#public/scripts/app/pictures/viewer.js'

describe('public/app/pictures setModCount()', () => {
  it('should set Viewer modCount to the passed value', () => {
    Viewer.modCount = 0
    setModCount(42)
    expect(Viewer.modCount).toBe(42)
  })
})
