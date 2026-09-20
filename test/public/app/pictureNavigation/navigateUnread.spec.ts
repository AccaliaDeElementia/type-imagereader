'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import {
  Imports,
  Internals,
  NavigateTo,
  Viewer,
  navigateUnreadBack,
  navigateUnreadForward,
} from '#public/scripts/app/pictureNavigation.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const currentPic: Picture = { name: 'current', path: '/current', seen: false }
const historyPic: Picture = { name: 'history', path: '/history', seen: true }
const freshPic: Picture = { name: 'fresh', path: '/fresh', seen: false }

const HISTORY_SIZE = 10
const filler = (i: number): Picture => ({ name: `f${i}`, path: `/f${i}`, seen: true })

type HistoryStack = 'prev' | 'next'

interface DirectionCase {
  name: string
  navigate: () => Promise<void>
  /** the stack a target is popped from */
  from: HistoryStack
  /** the stack the prior current is pushed onto */
  onto: HistoryStack
  navigateTo: NavigateTo
  arrival: string
}

const directions: DirectionCase[] = [
  {
    name: 'navigateUnreadBack()',
    navigate: navigateUnreadBack,
    from: 'prev',
    onto: 'next',
    navigateTo: NavigateTo.PreviousUnread,
    arrival: 'resumeFromEnd',
  },
  {
    name: 'navigateUnreadForward()',
    navigate: navigateUnreadForward,
    from: 'next',
    onto: 'prev',
    navigateTo: NavigateTo.NextUnread,
    arrival: 'freshStart',
  },
]

describe.each(directions)(
  'public/app/pictureNavigation $name',
  ({ navigate, from, onto, navigateTo, arrival }: DirectionCase) => {
    let isLoadingSpy: MockInstance = vi.fn()
    let loadImageSpy: MockInstance = vi.fn()
    let publishStub: MockInstance = vi.fn()
    let getPictureSpy: MockInstance = vi.fn()
    let setArrivalStub: MockInstance = vi.fn()
    beforeEach(() => {
      resetPubSub()
      Pictures.current = { ...currentPic }
      Viewer.history = { prev: [], next: [] }
      isLoadingSpy = vi.spyOn(Imports, 'isLoading').mockReturnValue(false)
      loadImageSpy = vi.spyOn(Internals, 'loadImage').mockResolvedValue(undefined)
      publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
      getPictureSpy = vi.spyOn(Internals, 'getPicture').mockReturnValue(undefined)
      setArrivalStub = vi.spyOn(Imports, 'setArrival').mockReturnValue(undefined)
    })
    it(`should record a ${arrival} arrival when resuming from history`, async () => {
      Viewer.history[from] = [{ ...historyPic }]
      await navigate()
      expect(setArrivalStub.mock.calls).toEqual([[arrival]])
    })
    it(`should record a ${arrival} arrival when falling through to the index search`, async () => {
      getPictureSpy.mockReturnValue({ ...freshPic })
      await navigate()
      expect(setArrivalStub.mock.calls).toEqual([[arrival]])
    })
    it('should not record an arrival when there is nowhere to go', async () => {
      await navigate()
      expect(setArrivalStub.mock.calls.length).toBe(0)
    })
    describe('isLoading guard', () => {
      beforeEach(() => {
        isLoadingSpy.mockReturnValue(true)
        Viewer.history[from] = [{ ...historyPic }]
      })
      it(`should not pop from history.${from}`, async () => {
        await navigate()
        expect(Viewer.history[from]).toHaveLength(1)
      })
      it('should not call loadImage', async () => {
        await navigate()
        expect(loadImageSpy.mock.calls.length).toBe(0)
      })
      it('should not call getPicture', async () => {
        await navigate()
        expect(getPictureSpy.mock.calls.length).toBe(0)
      })
      it('should not publish anything', async () => {
        await navigate()
        expect(publishStub.mock.calls.length).toBe(0)
      })
    })

    describe(`with non-empty history`, () => {
      let popped: Picture = { ...historyPic }
      beforeEach(() => {
        popped = { ...historyPic }
        Viewer.history[from] = [popped]
      })
      it(`should pop the newest entry off history.${from}`, async () => {
        await navigate()
        expect(Viewer.history[from]).toHaveLength(0)
      })
      it(`should push prior current onto history.${onto}`, async () => {
        const prior = Pictures.current
        await navigate()
        expect(Viewer.history[onto]).toEqual([prior])
      })
      it(`should not push to history.${onto} when prior current is null`, async () => {
        Pictures.current = null
        await navigate()
        expect(Viewer.history[onto]).toEqual([])
      })
      it('should set Pictures.current to the popped picture', async () => {
        await navigate()
        expect(Pictures.current).toBe(popped)
      })
      it('should call loadImage once', async () => {
        await navigate()
        expect(loadImageSpy.mock.calls.length).toBe(1)
      })
      it('should publish Menu:Hide', async () => {
        await navigate()
        expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
      })
      it('should tolerate loadImage rejecting', async () => {
        loadImageSpy.mockRejectedValue('FOO')
        await navigate()
        expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
      })
      it('should not call getPicture', async () => {
        await navigate()
        expect(getPictureSpy.mock.calls.length).toBe(0)
      })
    })

    describe('with empty history and an unread fall-through target', () => {
      beforeEach(() => {
        getPictureSpy.mockReturnValue(freshPic)
      })
      it(`should call getPicture with ${NavigateTo[navigateTo]}`, async () => {
        await navigate()
        expect(getPictureSpy.mock.calls[0]).toEqual([navigateTo])
      })
      it('should set Pictures.current to the fall-through picture', async () => {
        await navigate()
        expect(Pictures.current).toBe(freshPic)
      })
      it(`should push prior current onto history.${onto}`, async () => {
        const prior = Pictures.current
        await navigate()
        expect(Viewer.history[onto]).toEqual([prior])
      })
      it(`should not push to history.${onto} when prior current is null`, async () => {
        Pictures.current = null
        await navigate()
        expect(Viewer.history[onto]).toEqual([])
      })
      it(`should preserve pre-existing history.${onto} entries below the prior current`, async () => {
        const preserved: Picture = { name: 'preserved', path: '/preserved', seen: true }
        Viewer.history[onto] = [preserved]
        const prior = Pictures.current
        await navigate()
        expect(Viewer.history[onto]).toEqual([preserved, prior])
      })
      it('should call loadImage once', async () => {
        await navigate()
        expect(loadImageSpy.mock.calls.length).toBe(1)
      })
      it('should publish Menu:Hide', async () => {
        await navigate()
        expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
      })
      it('should tolerate loadImage rejecting', async () => {
        loadImageSpy.mockRejectedValue('FOO')
        await navigate()
        expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
      })
      it(`should cap history.${onto} at HISTORY_SIZE by dropping the oldest entry`, async () => {
        Viewer.history[onto] = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
        await navigate()
        expect(Viewer.history[onto]).toHaveLength(HISTORY_SIZE)
      })
      it(`should drop the oldest history.${onto} entry first when fall-through push overflows`, async () => {
        Viewer.history[onto] = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
        await navigate()
        expect(Viewer.history[onto][0]?.name).toBe('f1')
      })
    })

    describe('with empty history and no fall-through target', () => {
      beforeEach(() => {
        getPictureSpy.mockReturnValue(undefined)
      })
      it('should not set Pictures.current', async () => {
        const prior = Pictures.current
        await navigate()
        expect(Pictures.current).toBe(prior)
      })
      it(`should not push to history.${onto}`, async () => {
        await navigate()
        expect(Viewer.history[onto]).toEqual([])
      })
      it('should not call loadImage', async () => {
        await navigate()
        expect(loadImageSpy.mock.calls.length).toBe(0)
      })
      it('should not publish Menu:Hide', async () => {
        await navigate()
        expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(0)
      })
      it('should publish Loading:Error', async () => {
        await navigate()
        expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(1)
      })
    })
  },
)
