'use sanity'

import { isBlockedTraversal } from '#utils/path.js'
import { stubInjectedLogger } from '#testutils/debug.js'

describe('utils/Path isBlockedTraversal', () => {
  it('should return false for a clean path', () => {
    const { fake } = stubInjectedLogger()
    expect(isBlockedTraversal(fake, '/foo/bar')).toBe(false)
  })
  it('should not log for a clean path', () => {
    const { stub, fake } = stubInjectedLogger()
    isBlockedTraversal(fake, '/foo/bar')
    expect(stub).not.toHaveBeenCalled()
  })
  it('should return true for a traversal path', () => {
    const { fake } = stubInjectedLogger()
    expect(isBlockedTraversal(fake, '/foo/../bar')).toBe(true)
  })
  it('should log the blocked path', () => {
    const { stub, fake } = stubInjectedLogger()
    isBlockedTraversal(fake, '/foo/../bar')
    expect(stub).toHaveBeenCalledWith('path traversal blocked: %s', '/foo/../bar')
  })
})
