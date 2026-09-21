'use sanity'

import { stubToKnex } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import { Internals, Imports, SlideshowSocketState } from '#routes/slideshow.js'
import type { MockInstance } from 'vitest'

describe('routes/slideshow respondWithGotoImage()', () => {
  const knexFake = stubToKnex({})
  let state = new SlideshowSocketState()
  let loggerStub: MockInstance = vi.fn()
  let gotoImageStub: MockInstance = vi.fn()
  beforeEach(() => {
    state = new SlideshowSocketState()
    loggerStub = vi.spyOn(Imports, 'logger').mockReturnValue(undefined)
    gotoImageStub = vi.spyOn(Internals, 'gotoImage').mockResolvedValue(undefined)
  })
  it('should delegate to gotoImage once', async () => {
    await Internals.respondWithGotoImage(voidFn(), state, knexFake)
    expect(gotoImageStub.mock.calls.length).toBe(1)
  })
  it('should pass the client callback through to gotoImage', async () => {
    const callbackStub = voidFn()
    await Internals.respondWithGotoImage(callbackStub, state, knexFake)
    expect(gotoImageStub.mock.calls[0]?.[0]).toBe(callbackStub)
  })
  it('should not invoke the client callback itself when gotoImage resolves', async () => {
    const callbackStub = voidFn()
    await Internals.respondWithGotoImage(callbackStub, state, knexFake)
    expect(callbackStub.mock.calls.length).toBe(0)
  })

  describe('when gotoImage rejects', () => {
    const err = new Error('goto failed')
    beforeEach(() => {
      gotoImageStub.mockRejectedValue(err)
    })
    it('should resolve rather than reject', async () => {
      await expect(Internals.respondWithGotoImage(voidFn(), state, knexFake)).resolves.toBeUndefined()
    })
    it('should log the error', async () => {
      await Internals.respondWithGotoImage(voidFn(), state, knexFake)
      expect(loggerStub.mock.calls[0]).toEqual(['gotoImage error', err])
    })
    it('should answer the client with null', async () => {
      const callbackStub = voidFn()
      await Internals.respondWithGotoImage(callbackStub, state, knexFake)
      expect(callbackStub.mock.calls[0]).toEqual([null])
    })
  })
})
