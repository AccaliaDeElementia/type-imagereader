'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictures/state.js'
import { initActions, Imports } from '#public/scripts/app/pictures/inputs.js'
import { NavigateTo } from '#public/scripts/app/pictures/viewer.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import type { Picture } from '#contracts/listing.js'
import { cast } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures initActions()', () => {
  let dom = new JSDOM('<html></html>', {})
  let isMenuActiveSpy = sandbox.stub()
  let getShowUnreadOnly = sandbox.stub()
  let getPictureFake = { number: Math.random() }
  let getPictureSpy = sandbox.stub()
  let changePictureSpy = sandbox.stub()
  let loadCurrentPageSpy = sandbox.stub()
  let windowOpenSpy = sandbox.stub()
  let subscribeStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Pictures.mainImage = null
    isMenuActiveSpy = sandbox.stub(Imports, 'isMenuActive').returns(false)
    getShowUnreadOnly = sandbox.stub(Imports, 'getShowUnreadOnly').returns(false)
    getPictureFake = { number: Math.random() }
    getPictureSpy = sandbox.stub(Imports, 'getPicture').returns(cast<Picture>(getPictureFake))
    changePictureSpy = sandbox.stub(Imports, 'changePicture')
    loadCurrentPageSpy = sandbox.stub(Imports, 'loadCurrentPageImages')
    windowOpenSpy = sandbox.stub(global.window, 'open')
    subscribeStub = sandbox.stub(Imports, 'subscribe')
  })
  afterEach(() => {
    sandbox.restore()
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
    ['Action:Execute:PreviousUnseen', NavigateTo.PreviousUnread],
    ['Action:Execute:NextImage', NavigateTo.Next],
    ['Action:Execute:NextUnseen', NavigateTo.NextUnread],
    ['Action:Execute:Last', NavigateTo.Last],
  ]
  const subscribers = [
    ...noMenuSubscribers.map((v) => v[0]),
    ...changeToSubscribers.map((v) => v[0]),
    'Action:Execute:Previous',
    'Action:Execute:Next',
    'Action:Execute:ViewFullSize',
    'Action:Execute:Bookmark',
    'Action:Gamepad:B',
    'Pictures:selectPage',
  ]
  it('should only have expected subscribers', () => {
    initActions()
    const subscribedTopics = subscribeStub.getCalls().map((c) => cast<string>(c.args[0]).toUpperCase())
    expect(subscribedTopics.sort()).toEqual([...subscribers.map((m) => m.toUpperCase())].sort())
  })
  subscribers.forEach((message) => {
    it(`should subscribe to ${message}`, () => {
      initActions()
      expect(subscribeStub.calledWith(message)).toBe(true)
    })
  })
  noMenuSubscribers.forEach(([action, expected]) => {
    it(`should call Action:Execute:${expected} once for ${action} when menu is not active`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.returns(false)
      const publishStub = sandbox.stub(Imports, 'publish')
      await fn(undefined)
      expect(publishStub.callCount).toBe(1)
    })
    it(`should publish Action:Execute:${expected} for ${action} when menu is not active`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.returns(false)
      const publishStub = sandbox.stub(Imports, 'publish')
      await fn(undefined)
      expect(publishStub.firstCall.args).toEqual([`Action:Execute:${expected}`])
    })
    it(`should call Action:Execute:HideMenu once for ${action} when menu is active`, async () => {
      initActions()
      Pictures.pictures = [cast<Picture>({})]
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.returns(true)
      const publishStub = sandbox.stub(Imports, 'publish')
      await fn(undefined)
      expect(publishStub.callCount).toBe(1)
    })
    it(`should publish Action:Execute:HideMenu for ${action} when menu is active`, async () => {
      initActions()
      Pictures.pictures = [cast<Picture>({})]
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.returns(true)
      const publishStub = sandbox.stub(Imports, 'publish')
      await fn(undefined)
      expect(publishStub.firstCall.args).toEqual(['Action:Execute:HideMenu'])
    })
    it(`should ignore ${action} when menu is active and no pictures`, async () => {
      initActions()
      Pictures.pictures = []
      const fn = capturedSubscriber(subscribeStub, action)
      isMenuActiveSpy.returns(true)
      const publishStub = sandbox.stub(Imports, 'publish')
      await fn(undefined)
      expect(publishStub.callCount).toBe(0)
    })
  })
  changeToSubscribers.forEach(([action, direction]) => {
    it(`should call getPicture once for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(getPictureSpy.callCount).toBe(1)
    })
    it(`should navigate in expected direction for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(getPictureSpy.firstCall.args).toEqual([direction])
    })
    it(`should call changePicture once for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(changePictureSpy.callCount).toBe(1)
    })
    it(`should call changePicture with one argument for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(changePictureSpy.firstCall.args).toHaveLength(1)
    })
    it(`should change to fetched picture for ${action}`, async () => {
      initActions()
      const fn = capturedSubscriber(subscribeStub, action)
      await fn(undefined)
      expect(changePictureSpy.firstCall.args[0]).toBe(getPictureFake)
    })
  })
  it('should translate Action:Execute:Previous as PreviousUnseen when ShowUnreadOnly is set', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    const publishStub = sandbox.stub(Imports, 'publish')
    getShowUnreadOnly.returns(true)
    await fn(undefined)
    expect(publishStub.calledWith('Action:Execute:PreviousUnseen')).toBe(true)
  })
  it('should translate Action:Execute:Previous as PreviousImage when ShowUnreadOnly is unset', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Previous')
    const publishStub = sandbox.stub(Imports, 'publish')
    getShowUnreadOnly.returns(false)
    await fn(undefined)
    expect(publishStub.calledWith('Action:Execute:PreviousImage')).toBe(true)
  })
  it('should translate Action:Execute:Next as NextUnseen when ShowUnreadOnly is set', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    const publishStub = sandbox.stub(Imports, 'publish')
    getShowUnreadOnly.returns(true)
    await fn(undefined)
    expect(publishStub.calledWith('Action:Execute:NextUnseen')).toBe(true)
  })
  it('should translate Action:Execute:Next as NextImage when ShowUnreadOnly is unset', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Next')
    const publishStub = sandbox.stub(Imports, 'publish')
    getShowUnreadOnly.returns(false)
    await fn(undefined)
    expect(publishStub.calledWith('Action:Execute:NextImage')).toBe(true)
  })
  it('should call window.open once when Action:Execute:ViewFullSize', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ViewFullSize')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    await fn(undefined)
    expect(windowOpenSpy.callCount).toBe(1)
  })
  it('should open new window when Action:Execute:ViewFullSize', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ViewFullSize')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    await fn(undefined)
    expect(windowOpenSpy.firstCall.args).toEqual(['/images/full/this/is/my/foo'])
  })
  it('should ignore Action:Execute:ViewFullSize when no current image', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:ViewFullSize')
    Pictures.current = null
    await fn(undefined)
    expect(windowOpenSpy.callCount).toBe(0)
  })
  it('should call Bookmarks:Add once when Action:Execute:Bookmark', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const publishStub = sandbox.stub(Imports, 'publish')
    await fn(undefined)
    expect(publishStub.calledWith('Bookmarks:Add')).toBe(true)
  })
  it('should add current image as bookmark for Action:Execute:Bookmark', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const publishStub = sandbox.stub(Imports, 'publish')
    await fn(undefined)
    expect(publishStub.firstCall.args).toEqual(['Bookmarks:Add', '/this/is/my/foo'])
  })
  it('should ignore Action:Execute:Bookmark when no current image', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    Pictures.current = null
    const publishStub = sandbox.stub(Imports, 'publish')
    await fn(undefined)
    expect(publishStub.callCount).toBe(0)
  })
  it('should use same handler for Action:Execute:Bookmark and Action:Gamepad:B', () => {
    initActions()
    const fn1 = capturedSubscriber(subscribeStub, 'Action:Execute:Bookmark')
    const fn2 = capturedSubscriber(subscribeStub, 'Action:Gamepad:B')
    expect(fn1).toBe(fn2)
  })
  it('should load images for Pictures:selectPage', async () => {
    initActions()
    const fn = capturedSubscriber(subscribeStub, 'Pictures:selectPage')
    await fn(undefined)
    expect(loadCurrentPageSpy.callCount).toBe(1)
  })
})
