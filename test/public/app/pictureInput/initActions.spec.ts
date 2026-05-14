'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { initActions, Imports } from '#public/scripts/app/pictureInput.js'
import { NavigateTo } from '#public/scripts/app/pictureNavigation.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import type { Picture } from '#contracts/listing.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('public/app/pictures initActions()', () => {
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
    loadCurrentPageSpy = vi
      .spyOn(Imports, 'loadCurrentPageImages')
      .mockImplementation((..._args: unknown[]) => undefined)
    windowOpenSpy = vi.spyOn(global.window, 'open').mockReturnValue(null)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  const noMenuSubscribers: Array<[string, string]> = [
    ['Action:Keypress:ArrowUp', 'ShowMenu'],
    ['Action:Keypress:ArrowRight', 'Next'],
    ['Action:Keypress:ArrowLeft', 'Previous'],
    ['Action:Gamepad:Right', 'Next'],
    ['Action:Gamepad:LRight', 'NextUnseen'],
    ['Action:Gamepad:RRight', 'NextImage'],
    ['Action:Gamepad:Left', 'Previous'],
    ['Action:Gamepad:LLeft', 'PreviousUnseen'],
    ['Action:Gamepad:RLeft', 'PreviousImage'],
    ['Action:Keypress:ArrowDown', 'ShowMenu'],
  ]
  const changeToSubscribers: Array<[string, NavigateTo]> = [
    ['Action:Execute:First', NavigateTo.First],
    ['Action:Execute:PreviousImage', NavigateTo.Previous],
    ['Action:Execute:NextImage', NavigateTo.Next],
    ['Action:Execute:Last', NavigateTo.Last],
  ]
  const subscribers = [
    ...noMenuSubscribers.map((v) => v[0]),
    ...changeToSubscribers.map((v) => v[0]),
    'Action:Execute:PreviousUnseen',
    'Action:Execute:NextUnseen',
    'Action:Execute:Previous',
    'Action:Execute:Next',
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
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      await fn(undefined)
      expect(publishStub.mock.calls.length).toBe(1)
    })
    it(`should publish Action:Execute:${expected} for ${action} when menu is not active`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(false)
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      await fn(undefined)
      expect(publishStub.mock.calls[0]).toEqual([`Action:Execute:${expected}`])
    })
    it(`should call Action:Execute:HideMenu once for ${action} when menu is active`, async () => {
      initActions()
      Pictures.pictures = [cast<Picture>({})]
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(true)
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      await fn(undefined)
      expect(publishStub.mock.calls.length).toBe(1)
    })
    it(`should publish Action:Execute:HideMenu for ${action} when menu is active`, async () => {
      initActions()
      Pictures.pictures = [cast<Picture>({})]
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(true)
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      await fn(undefined)
      expect(publishStub.mock.calls[0]).toEqual(['Action:Execute:HideMenu'])
    })
    it(`should ignore ${action} when menu is active and no pictures`, async () => {
      initActions()
      Pictures.pictures = []
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.mockReturnValue(true)
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      await fn(undefined)
      expect(publishStub.mock.calls.length).toBe(0)
    })
  })
  changeToSubscribers.forEach(([action, direction]) => {
    it(`should call getPicture once for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(getPictureSpy.mock.calls.length).toBe(1)
    })
    it(`should navigate in expected direction for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(getPictureSpy.mock.calls[0]).toEqual([direction])
    })
    it(`should call changePicture once for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(changePictureSpy.mock.calls.length).toBe(1)
    })
    it(`should call changePicture with one argument for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(changePictureSpy.mock.calls[0]).toHaveLength(1)
    })
    it(`should change to fetched picture for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(changePictureSpy.mock.calls[0]?.[0]).toBe(getPictureFake)
    })
  })
  it('should call navigateUnreadBack once for Action:Execute:PreviousUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:PreviousUnseen')
    await fn(undefined)
    expect(navigateUnreadBackSpy.mock.calls.length).toBe(1)
  })
  it('should call navigateUnreadBack with no args for Action:Execute:PreviousUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:PreviousUnseen')
    await fn(undefined)
    expect(navigateUnreadBackSpy.mock.calls[0]).toHaveLength(0)
  })
  it('should not call changePicture for Action:Execute:PreviousUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:PreviousUnseen')
    await fn(undefined)
    expect(changePictureSpy.mock.calls.length).toBe(0)
  })
  it('should not call getPicture for Action:Execute:PreviousUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:PreviousUnseen')
    await fn(undefined)
    expect(getPictureSpy.mock.calls.length).toBe(0)
  })
  it('should call navigateUnreadForward once for Action:Execute:NextUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:NextUnseen')
    await fn(undefined)
    expect(navigateUnreadForwardSpy.mock.calls.length).toBe(1)
  })
  it('should call navigateUnreadForward with no args for Action:Execute:NextUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:NextUnseen')
    await fn(undefined)
    expect(navigateUnreadForwardSpy.mock.calls[0]).toHaveLength(0)
  })
  it('should not call changePicture for Action:Execute:NextUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:NextUnseen')
    await fn(undefined)
    expect(changePictureSpy.mock.calls.length).toBe(0)
  })
  it('should not call getPicture for Action:Execute:NextUnseen', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:NextUnseen')
    await fn(undefined)
    expect(getPictureSpy.mock.calls.length).toBe(0)
  })
  it('should translate Action:Execute:Previous as PreviousUnseen when ShowUnreadOnly is set', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    getShowUnreadOnly.mockReturnValue(true)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:PreviousUnseen')).toBe(true)
  })
  it('should translate Action:Execute:Previous as PreviousImage when ShowUnreadOnly is unset', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    getShowUnreadOnly.mockReturnValue(false)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:PreviousImage')).toBe(true)
  })
  it('should translate Action:Execute:Next as NextUnseen when ShowUnreadOnly is set', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    getShowUnreadOnly.mockReturnValue(true)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:NextUnseen')).toBe(true)
  })
  it('should translate Action:Execute:Next as NextImage when ShowUnreadOnly is unset', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    getShowUnreadOnly.mockReturnValue(false)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Action:Execute:NextImage')).toBe(true)
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
    const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Bookmarks:Add')).toBe(true)
  })
  it('should add current image as bookmark for Action:Execute:Bookmark', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    await fn(undefined)
    expect(publishStub.mock.calls[0]).toEqual(['Bookmarks:Add', '/this/is/my/foo'])
  })
  it('should ignore Action:Execute:Bookmark when no current image', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = null
    const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
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
