'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { initActions, Imports } from '#public/scripts/app/pictureInput.js'
import { NavigateTo } from '#public/scripts/app/pictureNavigation.js'
import type { Arrival } from '#public/scripts/app/imageViewport.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import type { Picture } from '#contracts/listing.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('public/app/pictureInput initActions()', () => {
  let dom = new JSDOM('<html></html>', {})
  let isMenuActiveSpy: MockInstance = vi.fn()
  let getShowUnreadOnly: MockInstance = vi.fn()
  let getPictureFake = { number: Math.random() }
  let getPictureSpy: MockInstance = vi.fn()
  let changePictureSpy: MockInstance = vi.fn()
  let navigateUnreadBackSpy: MockInstance = vi.fn()
  let navigateUnreadForwardSpy: MockInstance = vi.fn()
  let loadCurrentPageSpy: MockInstance = vi.fn()
  let windowOpenSpy: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let scrollForwardStub: MockInstance = vi.fn()
  let scrollBackwardStub: MockInstance = vi.fn()
  let nudgeUpStub: MockInstance = vi.fn()
  let nudgeDownStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Pictures.mainImage = null
    isMenuActiveSpy = vi.spyOn(Imports, 'isMenuActive').mockReturnValue(false)
    getShowUnreadOnly = vi.spyOn(Imports, 'getShowUnreadOnly').mockReturnValue(false)
    getPictureFake = { number: Math.random() }
    getPictureSpy = vi.spyOn(Imports, 'getPicture').mockReturnValue(cast<Picture>(getPictureFake))
    changePictureSpy = vi.spyOn(Imports, 'changePicture').mockResolvedValue(undefined)
    navigateUnreadBackSpy = vi.spyOn(Imports, 'navigateUnreadBack').mockResolvedValue(undefined)
    navigateUnreadForwardSpy = vi.spyOn(Imports, 'navigateUnreadForward').mockResolvedValue(undefined)
    loadCurrentPageSpy = vi.spyOn(Imports, 'loadCurrentPageImages').mockReturnValue(undefined)
    windowOpenSpy = vi.spyOn(global.window, 'open').mockReturnValue(null)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockReturnValue(undefined)
    scrollForwardStub = vi.spyOn(Imports, 'scrollForward').mockReturnValue('exhausted')
    scrollBackwardStub = vi.spyOn(Imports, 'scrollBackward').mockReturnValue('exhausted')
    nudgeUpStub = vi.spyOn(Imports, 'nudgeUp').mockReturnValue('exhausted')
    nudgeDownStub = vi.spyOn(Imports, 'nudgeDown').mockReturnValue('exhausted')
  })
  afterEach(() => {
    unmountDom()
  })
  const noMenuSubscribers: Array<[string, string]> = [
    ['Action:Keypress:ArrowUp', 'ScrollUp'],
    ['Action:Keypress:ArrowRight', 'Next'],
    ['Action:Keypress:ArrowLeft', 'Previous'],
    ['Action:Gamepad:Right', 'Next'],
    ['Action:Gamepad:LRight', 'NextUnseen'],
    ['Action:Gamepad:RRight', 'NextImage'],
    ['Action:Gamepad:Left', 'Previous'],
    ['Action:Gamepad:LLeft', 'PreviousUnseen'],
    ['Action:Gamepad:RLeft', 'PreviousImage'],
    ['Action:Keypress:ArrowDown', 'ScrollDown'],
  ]
  const changeToSubscribers: Array<[string, NavigateTo, Arrival]> = [
    ['Action:Execute:First', NavigateTo.First, 'freshStart'],
    ['Action:Execute:PreviousImage', NavigateTo.Previous, 'resumeFromEnd'],
    ['Action:Execute:NextImage', NavigateTo.Next, 'freshStart'],
    ['Action:Execute:Last', NavigateTo.Last, 'freshStart'],
  ]
  const subscribers = [
    ...noMenuSubscribers.map((v) => v[0]),
    ...changeToSubscribers.map((v) => v[0]),
    'Action:Execute:PreviousUnseen',
    'Action:Execute:NextUnseen',
    'Action:Execute:Previous',
    'Action:Execute:Next',
    'Action:Execute:ScrollUp',
    'Action:Execute:ScrollDown',
    'Action:Execute:ViewFullSize',
    'Action:Execute:Bookmark',
    'Action:Gamepad:South',
    'Pictures:selectPage',
  ]
  it('should only have expected subscribers', () => {
    initActions()
    const subscribedTopics = subscribeStub.mock.calls.map((c) => cast<string>(c[0]).toUpperCase())
    expect(subscribedTopics.sort()).toEqual([...subscribers.map((m) => m.toUpperCase())].sort())
  })
  subscribers.forEach((message) => {
    it(`should subscribe to ${message}`, () => {
      initActions()
      expect(subscribeStub.mock.calls.some((c) => c[0] === message)).toBe(true)
    })
  })
  noMenuSubscribers.forEach(([action, expected]) => {
    it(`should call Action:Execute:${expected} once for ${action} when menu is not active`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(false)
      const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
      await fn(undefined)
      expect(publishStub.mock.calls.length).toBe(1)
    })
    it(`should publish Action:Execute:${expected} for ${action} when menu is not active`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(false)
      const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
      await fn(undefined)
      expect(publishStub.mock.calls[0]).toEqual([`Action:Execute:${expected}`])
    })
    it(`should call Action:Execute:HideMenu once for ${action} when menu is active`, async () => {
      initActions()
      Pictures.pictures = [cast<Picture>({})]
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(true)
      const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
      await fn(undefined)
      expect(publishStub.mock.calls.length).toBe(1)
    })
    it(`should publish Action:Execute:HideMenu for ${action} when menu is active`, async () => {
      initActions()
      Pictures.pictures = [cast<Picture>({})]
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(true)
      const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
      await fn(undefined)
      expect(publishStub.mock.calls[0]).toEqual(['Action:Execute:HideMenu'])
    })
    it(`should ignore ${action} when menu is active and no pictures`, async () => {
      initActions()
      Pictures.pictures = []
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(true)
      const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
      await fn(undefined)
      expect(publishStub.mock.calls.length).toBe(0)
    })
  })
  const dispatch = async (action: string): Promise<void> => {
    initActions()
    await capturedSubscriber(subscribeStub, action)(undefined)
  }
  changeToSubscribers.forEach(([action, direction, corner]) => {
    it(`should fetch the ${direction} picture for ${action}`, async () => {
      await dispatch(action)
      expect(getPictureSpy.mock.calls).toEqual([[direction]])
    })
    it(`should change to the fetched picture arriving at its ${corner} for ${action}`, async () => {
      await dispatch(action)
      expect(changePictureSpy.mock.calls).toEqual([[getPictureFake, corner]])
    })
  })
  const unseenSubscribers: Array<[string, string, () => MockInstance]> = [
    ['Action:Execute:PreviousUnseen', 'navigateUnreadBack', () => navigateUnreadBackSpy],
    ['Action:Execute:NextUnseen', 'navigateUnreadForward', () => navigateUnreadForwardSpy],
  ]
  unseenSubscribers.forEach(([action, navigator, spyOf]) => {
    it(`should call ${navigator} once with no arguments for ${action}`, async () => {
      await dispatch(action)
      expect(spyOf().mock.calls).toEqual([[]])
    })
    it(`should bypass the getPicture/changePicture path for ${action}`, async () => {
      await dispatch(action)
      expect({
        fetched: getPictureSpy.mock.calls.length,
        changed: changePictureSpy.mock.calls.length,
      }).toEqual({ fetched: 0, changed: 0 })
    })
  })
  it('should translate Action:Execute:Previous as PreviousUnseen when ShowUnreadOnly is set', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    getShowUnreadOnly.mockReturnValue(true)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:PreviousUnseen')).toBe(true)
  })
  it('should translate Action:Execute:Previous as PreviousImage when ShowUnreadOnly is unset', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    getShowUnreadOnly.mockReturnValue(false)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:PreviousImage')).toBe(true)
  })
  it('should translate Action:Execute:Next as NextUnseen when ShowUnreadOnly is set', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    getShowUnreadOnly.mockReturnValue(true)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:NextUnseen')).toBe(true)
  })
  it('should translate Action:Execute:Next as NextImage when ShowUnreadOnly is unset', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    getShowUnreadOnly.mockReturnValue(false)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:NextImage')).toBe(true)
  })
  it('should offer Action:Execute:Next to the viewport first', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(scrollForwardStub.mock.calls.length).toBe(1)
  })
  it('should not change picture when Action:Execute:Next is consumed by the viewport', async () => {
    initActions()
    scrollForwardStub.mockReturnValue('consumed')
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.length).toBe(0)
  })
  it('should offer Action:Execute:Previous to the viewport first', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(scrollBackwardStub.mock.calls.length).toBe(1)
  })
  it('should not change picture when Action:Execute:Previous is consumed by the viewport', async () => {
    initActions()
    scrollBackwardStub.mockReturnValue('consumed')
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.length).toBe(0)
  })
  it('should offer Action:Execute:ScrollDown to the viewport first', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ScrollDown')
    vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(nudgeDownStub.mock.calls.length).toBe(1)
  })
  it('should not show the menu when Action:Execute:ScrollDown is consumed', async () => {
    initActions()
    nudgeDownStub.mockReturnValue('consumed')
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ScrollDown')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.length).toBe(0)
  })
  it('should show the menu when Action:Execute:ScrollDown finds no slack', async () => {
    initActions()
    nudgeDownStub.mockReturnValue('exhausted')
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ScrollDown')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.map((c) => cast<string>(c[0]))).toEqual(['Action:Execute:ShowMenu'])
  })
  it('should offer Action:Execute:ScrollUp to the viewport first', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ScrollUp')
    vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(nudgeUpStub.mock.calls.length).toBe(1)
  })
  it('should not show the menu when Action:Execute:ScrollUp is consumed', async () => {
    initActions()
    nudgeUpStub.mockReturnValue('consumed')
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ScrollUp')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.length).toBe(0)
  })
  it('should show the menu when Action:Execute:ScrollUp finds no slack', async () => {
    initActions()
    nudgeUpStub.mockReturnValue('exhausted')
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ScrollUp')
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.map((c) => cast<string>(c[0]))).toEqual(['Action:Execute:ShowMenu'])
  })
  it('should not offer Action:Execute:NextImage to the viewport', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:NextImage')
    await fn(undefined)
    expect(scrollForwardStub.mock.calls.length).toBe(0)
  })
  it('should not offer Action:Execute:PreviousImage to the viewport', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:PreviousImage')
    await fn(undefined)
    expect(scrollBackwardStub.mock.calls.length).toBe(0)
  })
  it('should call window.open once when Action:Execute:ViewFullSize', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ViewFullSize')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    await fn(undefined)
    expect(windowOpenSpy.mock.calls.length).toBe(1)
  })
  it('should open new window when Action:Execute:ViewFullSize', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ViewFullSize')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    await fn(undefined)
    expect(windowOpenSpy.mock.calls[0]).toEqual(['/images/full/this/is/my/foo'])
  })
  it('should ignore Action:Execute:ViewFullSize when no current image', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ViewFullSize')
    Pictures.current = null
    await fn(undefined)
    expect(windowOpenSpy.mock.calls.length).toBe(0)
  })
  it('should call Bookmarks:Add once when Action:Execute:Bookmark', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Bookmarks:Add')).toBe(true)
  })
  it('should add current image as bookmark for Action:Execute:Bookmark', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls[0]).toEqual(['Bookmarks:Add', '/this/is/my/foo'])
  })
  it('should ignore Action:Execute:Bookmark when no current image', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = null
    const publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.length).toBe(0)
  })
  it('should use same handler for Action:Execute:Bookmark and Action:Gamepad:South', () => {
    initActions()
    const fn1 = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    const fn2 = capturedSubscriber(subscribeStub, 'Action:Gamepad:South')
    expect(fn1).toBe(fn2)
  })
  it('should load images for Pictures:selectPage', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Pictures:selectPage')
    await fn(undefined)
    expect(loadCurrentPageSpy.mock.calls.length).toBe(1)
  })
})
