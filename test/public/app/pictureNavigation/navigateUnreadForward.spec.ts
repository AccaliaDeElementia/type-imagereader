'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, Internals, NavigateTo, Viewer, navigateUnreadForward } from '#public/scripts/app/pictureNavigation.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const currentPic: Picture = { name: 'current', path: '/current', seen: false }
const historyPic: Picture = { name: 'history', path: '/history', seen: true }
const freshPic: Picture = { name: 'fresh', path: '/fresh', seen: false }

const HISTORY_SIZE = 10
const filler = (i: number): Picture => ({ name: `f${i}`, path: `/f${i}`, seen: true })

describe('public/app/pictureNavigation navigateUnreadForward()', () => {
  let isLoadingSpy: MockInstance = vi.fn()
  let loadImageSpy: MockInstance = vi.fn()
  let publishStub: MockInstance = vi.fn()
  let getPictureSpy: MockInstance = vi.fn()
  beforeEach(() => {
    resetPubSub()
    Pictures.current = { ...currentPic }
    Viewer.history = { prev: [], next: [] }
    isLoadingSpy = vi.spyOn(Imports, 'isLoading').mockReturnValue(false)
    loadImageSpy = vi.spyOn(Internals, 'loadImage').mockResolvedValue(undefined)
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    getPictureSpy = vi.spyOn(Internals, 'getPicture').mockImplementation((..._args: unknown[]) => undefined)
  })
  describe('isLoading guard', () => {
    beforeEach(() => {
      isLoadingSpy.mockReturnValue(true)
      Viewer.history.next = [{ ...historyPic }]
    })
    it('should not pop from history.next', async () => {
      await navigateUnreadForward()
      expect(Viewer.history.next).toHaveLength(1)
    })
    it('should not call loadImage', async () => {
      await navigateUnreadForward()
      expect(loadImageSpy.mock.calls.length).toBe(0)
    })
    it('should not call getPicture', async () => {
      await navigateUnreadForward()
      expect(getPictureSpy.mock.calls.length).toBe(0)
    })
    it('should not publish anything', async () => {
      await navigateUnreadForward()
      expect(publishStub.mock.calls.length).toBe(0)
    })
  })

  describe('with non-empty history.next', () => {
    let popped: Picture = { ...historyPic }
    beforeEach(() => {
      popped = { ...historyPic }
      Viewer.history.next = [popped]
    })
    it('should pop the newest entry off history.next', async () => {
      await navigateUnreadForward()
      expect(Viewer.history.next).toHaveLength(0)
    })
    it('should push prior current onto history.prev', async () => {
      const prior = Pictures.current
      await navigateUnreadForward()
      expect(Viewer.history.prev).toEqual([prior])
    })
    it('should not push to history.prev when prior current is null', async () => {
      Pictures.current = null
      await navigateUnreadForward()
      expect(Viewer.history.prev).toEqual([])
    })
    it('should set Pictures.current to the popped picture', async () => {
      await navigateUnreadForward()
      expect(Pictures.current).toBe(popped)
    })
    it('should call loadImage once', async () => {
      await navigateUnreadForward()
      expect(loadImageSpy.mock.calls.length).toBe(1)
    })
    it('should publish Menu:Hide', async () => {
      await navigateUnreadForward()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should tolerate loadImage rejecting', async () => {
      loadImageSpy.mockRejectedValue('FOO')
      await navigateUnreadForward()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should not call getPicture', async () => {
      await navigateUnreadForward()
      expect(getPictureSpy.mock.calls.length).toBe(0)
    })
  })

  describe('with empty history.next and an unread fall-through target', () => {
    beforeEach(() => {
      getPictureSpy.mockReturnValue(freshPic)
    })
    it('should call getPicture with NextUnread', async () => {
      await navigateUnreadForward()
      expect(getPictureSpy.mock.calls[0]).toEqual([NavigateTo.NextUnread])
    })
    it('should set Pictures.current to the fall-through picture', async () => {
      await navigateUnreadForward()
      expect(Pictures.current).toBe(freshPic)
    })
    it('should push prior current onto history.prev', async () => {
      const prior = Pictures.current
      await navigateUnreadForward()
      expect(Viewer.history.prev).toEqual([prior])
    })
    it('should not push to history.prev when prior current is null', async () => {
      Pictures.current = null
      await navigateUnreadForward()
      expect(Viewer.history.prev).toEqual([])
    })
    it('should preserve pre-existing history.prev entries below the prior current', async () => {
      const preserved: Picture = { name: 'preserved', path: '/preserved', seen: true }
      Viewer.history.prev = [preserved]
      const prior = Pictures.current
      await navigateUnreadForward()
      expect(Viewer.history.prev).toEqual([preserved, prior])
    })
    it('should call loadImage once', async () => {
      await navigateUnreadForward()
      expect(loadImageSpy.mock.calls.length).toBe(1)
    })
    it('should publish Menu:Hide', async () => {
      await navigateUnreadForward()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should tolerate loadImage rejecting', async () => {
      loadImageSpy.mockRejectedValue('FOO')
      await navigateUnreadForward()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should cap history.prev at HISTORY_SIZE by dropping the oldest entry', async () => {
      Viewer.history.prev = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
      await navigateUnreadForward()
      expect(Viewer.history.prev).toHaveLength(HISTORY_SIZE)
    })
    it('should drop the oldest history.prev entry first when fall-through push overflows', async () => {
      Viewer.history.prev = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
      await navigateUnreadForward()
      expect(Viewer.history.prev[0]?.name).toBe('f1')
    })
  })

  describe('with empty history.next and no fall-through target', () => {
    beforeEach(() => {
      getPictureSpy.mockReturnValue(undefined)
    })
    it('should not set Pictures.current', async () => {
      const prior = Pictures.current
      await navigateUnreadForward()
      expect(Pictures.current).toBe(prior)
    })
    it('should not push to history.prev', async () => {
      await navigateUnreadForward()
      expect(Viewer.history.prev).toEqual([])
    })
    it('should not call loadImage', async () => {
      await navigateUnreadForward()
      expect(loadImageSpy.mock.calls.length).toBe(0)
    })
    it('should not publish Menu:Hide', async () => {
      await navigateUnreadForward()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(0)
    })
    it('should publish Loading:Error', async () => {
      await navigateUnreadForward()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(1)
    })
  })
})
