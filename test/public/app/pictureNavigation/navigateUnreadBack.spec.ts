'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, Internals, NavigateTo, Viewer, navigateUnreadBack } from '#public/scripts/app/pictureNavigation.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const currentPic: Picture = { name: 'current', path: '/current', seen: false }
const historyPic: Picture = { name: 'history', path: '/history', seen: true }
const freshPic: Picture = { name: 'fresh', path: '/fresh', seen: false }

const HISTORY_SIZE = 10
const filler = (i: number): Picture => ({ name: `f${i}`, path: `/f${i}`, seen: true })

describe('public/app/pictureNavigation navigateUnreadBack()', () => {
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isLoading guard', () => {
    beforeEach(() => {
      isLoadingSpy.mockReturnValue(true)
      Viewer.history.prev = [{ ...historyPic }]
    })
    it('should not pop from history.prev', async () => {
      await navigateUnreadBack()
      expect(Viewer.history.prev).toHaveLength(1)
    })
    it('should not call loadImage', async () => {
      await navigateUnreadBack()
      expect(loadImageSpy.mock.calls.length).toBe(0)
    })
    it('should not call getPicture', async () => {
      await navigateUnreadBack()
      expect(getPictureSpy.mock.calls.length).toBe(0)
    })
    it('should not publish anything', async () => {
      await navigateUnreadBack()
      expect(publishStub.mock.calls.length).toBe(0)
    })
  })

  describe('with non-empty history.prev', () => {
    let popped: Picture = { ...historyPic }
    beforeEach(() => {
      popped = { ...historyPic }
      Viewer.history.prev = [popped]
    })
    it('should pop the newest entry off history.prev', async () => {
      await navigateUnreadBack()
      expect(Viewer.history.prev).toHaveLength(0)
    })
    it('should push prior current onto history.next', async () => {
      const prior = Pictures.current
      await navigateUnreadBack()
      expect(Viewer.history.next).toEqual([prior])
    })
    it('should not push to history.next when prior current is null', async () => {
      Pictures.current = null
      await navigateUnreadBack()
      expect(Viewer.history.next).toEqual([])
    })
    it('should set Pictures.current to the popped picture', async () => {
      await navigateUnreadBack()
      expect(Pictures.current).toBe(popped)
    })
    it('should call loadImage once', async () => {
      await navigateUnreadBack()
      expect(loadImageSpy.mock.calls.length).toBe(1)
    })
    it('should publish Menu:Hide', async () => {
      await navigateUnreadBack()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should tolerate loadImage rejecting', async () => {
      loadImageSpy.mockRejectedValue('FOO')
      await navigateUnreadBack()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should not call getPicture', async () => {
      await navigateUnreadBack()
      expect(getPictureSpy.mock.calls.length).toBe(0)
    })
  })

  describe('with empty history.prev and an unread fall-through target', () => {
    beforeEach(() => {
      getPictureSpy.mockReturnValue(freshPic)
    })
    it('should call getPicture with PreviousUnread', async () => {
      await navigateUnreadBack()
      expect(getPictureSpy.mock.calls[0]).toEqual([NavigateTo.PreviousUnread])
    })
    it('should set Pictures.current to the fall-through picture', async () => {
      await navigateUnreadBack()
      expect(Pictures.current).toBe(freshPic)
    })
    it('should push prior current onto history.next', async () => {
      const prior = Pictures.current
      await navigateUnreadBack()
      expect(Viewer.history.next).toEqual([prior])
    })
    it('should not push to history.next when prior current is null', async () => {
      Pictures.current = null
      await navigateUnreadBack()
      expect(Viewer.history.next).toEqual([])
    })
    it('should preserve pre-existing history.next entries below the prior current', async () => {
      const preserved: Picture = { name: 'preserved', path: '/preserved', seen: true }
      Viewer.history.next = [preserved]
      const prior = Pictures.current
      await navigateUnreadBack()
      expect(Viewer.history.next).toEqual([preserved, prior])
    })
    it('should call loadImage once', async () => {
      await navigateUnreadBack()
      expect(loadImageSpy.mock.calls.length).toBe(1)
    })
    it('should publish Menu:Hide', async () => {
      await navigateUnreadBack()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should tolerate loadImage rejecting', async () => {
      loadImageSpy.mockRejectedValue('FOO')
      await navigateUnreadBack()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
    })
    it('should cap history.next at HISTORY_SIZE by dropping the oldest entry', async () => {
      Viewer.history.next = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
      await navigateUnreadBack()
      expect(Viewer.history.next).toHaveLength(HISTORY_SIZE)
    })
    it('should drop the oldest history.next entry first when fall-through push overflows', async () => {
      Viewer.history.next = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
      await navigateUnreadBack()
      expect(Viewer.history.next[0]?.name).toBe('f1')
    })
  })

  describe('with empty history.prev and no fall-through target', () => {
    beforeEach(() => {
      getPictureSpy.mockReturnValue(undefined)
    })
    it('should not set Pictures.current', async () => {
      const prior = Pictures.current
      await navigateUnreadBack()
      expect(Pictures.current).toBe(prior)
    })
    it('should not push to history.next', async () => {
      await navigateUnreadBack()
      expect(Viewer.history.next).toEqual([])
    })
    it('should not call loadImage', async () => {
      await navigateUnreadBack()
      expect(loadImageSpy.mock.calls.length).toBe(0)
    })
    it('should not publish Menu:Hide', async () => {
      await navigateUnreadBack()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(0)
    })
    it('should publish Loading:Error', async () => {
      await navigateUnreadBack()
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(1)
    })
  })
})
