'use sanity'

import { LockResource } from '#app.js'

describe('LockResource', () => {
  describe('Take()', () => {
    it('should return true when lock is free', () => {
      const lock = new LockResource()
      expect(lock.take()).toBe(true)
    })

    it('should set _locked to true after acquiring a free lock', () => {
      const lock = new LockResource()
      lock.take()
      expect(lock._locked).toBe(true)
    })

    it('should return false when lock is already held', () => {
      const lock = new LockResource()
      lock.take()
      expect(lock.take()).toBe(false)
    })

    it('should not release the lock when a second Take() is attempted', () => {
      const lock = new LockResource()
      lock.take()
      lock.take()
      expect(lock._locked).toBe(true)
    })
  })

  describe('Release()', () => {
    it('should set _locked to false after a successful Take()', () => {
      const lock = new LockResource()
      lock.take()
      lock.release()
      expect(lock._locked).toBe(false)
    })

    it('should allow Take() to succeed again after Release()', () => {
      const lock = new LockResource()
      lock.take()
      lock.release()
      expect(lock.take()).toBe(true)
    })

    it('should not set _locked to false when lock is already free', () => {
      const lock = new LockResource()
      lock.release()
      expect(lock._locked).toBe(false)
    })

    it('should not set _locked to false when lock was already released', () => {
      const lock = new LockResource()
      lock.take()
      lock.release()
      lock.release()
      expect(lock._locked).toBe(false)
    })
  })
})
