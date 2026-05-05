'use sanity'

import { expect } from 'chai'

import { LockResource } from '#app.js'

describe('LockResource', () => {
  describe('Take()', () => {
    it('should return true when lock is free', () => {
      const lock = new LockResource()
      expect(lock.Take()).to.equal(true)
    })

    it('should set _locked to true after acquiring a free lock', () => {
      const lock = new LockResource()
      lock.Take()
      expect(lock._locked).to.equal(true)
    })

    it('should return false when lock is already held', () => {
      const lock = new LockResource()
      lock.Take()
      expect(lock.Take()).to.equal(false)
    })

    it('should not release the lock when a second Take() is attempted', () => {
      const lock = new LockResource()
      lock.Take()
      lock.Take()
      expect(lock._locked).to.equal(true)
    })
  })

  describe('Release()', () => {
    it('should set _locked to false after a successful Take()', () => {
      const lock = new LockResource()
      lock.Take()
      lock.Release()
      expect(lock._locked).to.equal(false)
    })

    it('should allow Take() to succeed again after Release()', () => {
      const lock = new LockResource()
      lock.Take()
      lock.Release()
      expect(lock.Take()).to.equal(true)
    })

    it('should not set _locked to false when lock is already free', () => {
      const lock = new LockResource()
      lock.Release()
      expect(lock._locked).to.equal(false)
    })

    it('should not set _locked to false when lock was already released', () => {
      const lock = new LockResource()
      lock.Take()
      lock.Release()
      lock.Release()
      expect(lock._locked).to.equal(false)
    })
  })
})
