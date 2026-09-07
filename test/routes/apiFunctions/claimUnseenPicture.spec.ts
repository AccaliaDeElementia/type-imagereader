'use sanity'

import { stubToKnex } from '#testutils/typeGuards.js'
import { claimUnseenPicture, Imports } from '#routes/apiFunctions.js'
import type { MockInstance } from 'vitest'

describe('routes/apiFunctions claimUnseenPicture()', () => {
  let conditionalUpdate = {
    update: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    where: vi.fn().mockResolvedValue(0),
  }
  let incrementer = {
    increment: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereIn: vi.fn().mockResolvedValue(undefined),
  }
  let knexStub = vi.fn().mockReturnValueOnce(conditionalUpdate).mockReturnValueOnce(incrementer)
  let knexFake = stubToKnex(knexStub)
  let getParentFoldersStub: MockInstance = vi.fn()
  beforeEach(() => {
    conditionalUpdate = {
      update: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      where: vi.fn().mockResolvedValue(0),
    }
    incrementer = {
      increment: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereIn: vi.fn().mockResolvedValue(undefined),
    }
    knexStub = vi.fn().mockReturnValueOnce(conditionalUpdate).mockReturnValueOnce(incrementer)
    knexFake = stubToKnex(knexStub)
    getParentFoldersStub = vi.spyOn(Imports, 'getParentFolders').mockReturnValue(['/foo/bar/', '/foo/', '/'])
  })

  describe('the conditional update', () => {
    it('should call knex with the pictures table for the conditional UPDATE', async () => {
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(knexStub.mock.calls[0]).toEqual(['pictures'])
    })
    it('should call update once on the conditional UPDATE', async () => {
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(conditionalUpdate.update.mock.calls.length).toBe(1)
    })
    it('should set seen=true on the conditional UPDATE', async () => {
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(conditionalUpdate.update.mock.calls[0]).toEqual([{ seen: true }])
    })
    it('should atomically gate the conditional UPDATE on path AND seen=false', async () => {
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(conditionalUpdate.where.mock.calls[0]).toEqual([{ path: '/foo/bar/baz.png', seen: false }])
    })
  })

  describe('when another caller already flipped the row', () => {
    it('should make only one knex call when the claim flips zero rows', async () => {
      conditionalUpdate.where.mockResolvedValue(0)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(knexStub.mock.calls.length).toBe(1)
    })
    it('should not call getParentFolders when the claim flips zero rows', async () => {
      conditionalUpdate.where.mockResolvedValue(0)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(getParentFoldersStub.mock.calls.length).toBe(0)
    })
  })

  describe('when this caller flips the row', () => {
    it('should make two knex calls when the claim flips a row', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(knexStub.mock.calls.length).toBe(2)
    })
    it('should query the folders table to increment seenCount when the claim flips a row', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(knexStub.mock.calls[1]).toEqual(['folders'])
    })
    it('should call increment once when the claim flips a row', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(incrementer.increment.mock.calls.length).toBe(1)
    })
    it('should increment seenCount by 1 when the claim flips a row', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(incrementer.increment.mock.calls[0]).toEqual(['seenCount', 1])
    })
    it('should call getParentFolders once when the claim flips a row', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(getParentFoldersStub.mock.calls.length).toBe(1)
    })
    it('should pass the picture path to getParentFolders when the claim flips a row', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(getParentFoldersStub.mock.calls[0]).toEqual(['/foo/bar/baz.png'])
    })
    it('should call whereIn once when filtering ancestor folders for the increment', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(incrementer.whereIn.mock.calls.length).toBe(1)
    })
    it('should filter ancestor folders using the result of getParentFolders', async () => {
      conditionalUpdate.where.mockResolvedValue(1)
      await claimUnseenPicture(knexFake, '/foo/bar/baz.png')
      expect(incrementer.whereIn.mock.calls[0]).toEqual(['path', ['/foo/bar/', '/foo/', '/']])
    })
  })
})
