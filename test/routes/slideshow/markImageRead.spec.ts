'use sanity'

import { stubToKnex } from '#testutils/typeGuards.js'
import { markImageRead, Imports } from '#routes/slideshow.js'
import type { MockInstance } from 'vitest'

describe('routes/slideshow markImageRead()', () => {
  const knexStub = vi.fn()
  const knexFake = stubToKnex(knexStub)
  let claimUnseenPictureStub: MockInstance = vi.fn()
  beforeEach(() => {
    claimUnseenPictureStub = vi.spyOn(Imports, 'claimUnseenPicture').mockResolvedValue(undefined)
  })
  it('should claim the picture once', async () => {
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(claimUnseenPictureStub.mock.calls.length).toBe(1)
  })
  it('should claim the picture with the provided knex and path', async () => {
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(claimUnseenPictureStub.mock.calls[0]).toEqual([knexFake, '/foo/bar/baz.png'])
  })
})
