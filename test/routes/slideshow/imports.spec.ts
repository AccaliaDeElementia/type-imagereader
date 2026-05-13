'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { Imports } from '#routes/slideshow.js'
import { eventuallyRejects } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

describe('routes/slideshow Imports', () => {
  let setLatestPictureStub: MockInstance = vi.fn()
  let knexFake = stubToKnex({})
  beforeEach(() => {
    knexFake = stubToKnex({})
    setLatestPictureStub = vi.spyOn(Imports, 'setLatestPicture').mockResolvedValue(cast(undefined))
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('setLatest()', () => {
    it('should call api function setLatestPicture', async () => {
      await Imports.setLatest(knexFake, '')
      expect(setLatestPictureStub.mock.calls.length).toBe(1)
    })
    it('should call setLatestPicture with knex', async () => {
      await Imports.setLatest(knexFake, '')
      expect(setLatestPictureStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('should call setLatestPicture with path', async () => {
      await Imports.setLatest(knexFake, '/foo/bar/baz')
      expect(setLatestPictureStub.mock.calls[0]?.[1]).toBe('/foo/bar/baz')
    })
    it('should not catch rejection from setLatestPicture', async () => {
      const err = new Error('PKACHU! SMASH!')
      setLatestPictureStub.mockRejectedValue(err)
      const result = await eventuallyRejects(Imports.setLatest(knexFake, ''))
      expect(result).toBe(err)
    })
    it('should not catch thrown error from setLatestPicture', async () => {
      const err = new Error('PKACHU! SMASH!')
      setLatestPictureStub.mockImplementation(() => {
        throw err
      })
      const result = await eventuallyRejects(Imports.setLatest(knexFake, ''))
      expect(result).toBe(err)
    })
  })
})
