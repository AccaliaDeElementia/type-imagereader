'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Inputs } from '#public/scripts/app/pictures/inputs.js'
import { Viewer, NavigateTo } from '#public/scripts/app/pictures/viewer.js'
import { Grid } from '#public/scripts/app/pictures/grid.js'
import { UnreadFilter } from '#public/scripts/app/pictures/unreadFilter.js'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { Navigation } from '#public/scripts/app/navigation.js'
import { getSubscriber, resetPubSub } from '#testutils/PubSub.js'
import type { Picture } from '#contracts/listing.js'
import { Cast } from '#testutils/TypeGuards.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures function InitActions()', () => {
  let dom = new JSDOM('<html></html>', {})
  let isMenuActiveSpy = sandbox.stub()
  let getShowUnreadOnly = sandbox.stub()
  let getPictureFake = { number: Math.random() }
  let getPictureSpy = sandbox.stub()
  let changePictureSpy = sandbox.stub()
  let loadCurrentPageSpy = sandbox.stub()
  let windowOpenSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Pictures.mainImage = null
    Pictures.imageCard = null
    isMenuActiveSpy = sandbox.stub(Navigation, 'IsMenuActive').returns(false)
    getShowUnreadOnly = sandbox.stub(UnreadFilter, 'GetShowUnreadOnly').returns(false)
    getPictureFake = { number: Math.random() }
    getPictureSpy = sandbox.stub(Viewer, 'GetPicture').returns(Cast<Picture>(getPictureFake))
    changePictureSpy = sandbox.stub(Viewer, 'ChangePicture')
    loadCurrentPageSpy = sandbox.stub(Grid, 'LoadCurrentPageImages')
    windowOpenSpy = sandbox.stub(global.window, 'open')
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
    'Pictures:SelectPage',
  ]
  it('should only have expected subscribers', () => {
    Inputs.InitActions()
    expect(PubSub.subscribers).to.have.all.keys(subscribers.map((m) => m.toUpperCase()))
  })
  subscribers.forEach((message) => {
    it(`should subscribe to ${message}`, () => {
      Inputs.InitActions()
      expect(PubSub.subscribers).to.contain.keys(message.toUpperCase())
    })
  })
  noMenuSubscribers.forEach(([action, expected]) => {
    it(`should call Action:Execute:${expected} once for ${action} when menu is not active`, async () => {
      Inputs.InitActions()
      const fn = getSubscriber(action.toUpperCase())
      isMenuActiveSpy.returns(false)
      const spy = sandbox.stub().resolves()
      PubSub.subscribers[`Action:Execute:${expected}`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.callCount).to.equal(1)
    })
    it(`should publish Action:Execute:${expected} for ${action} when menu is not active`, async () => {
      Inputs.InitActions()
      const subscriberName = `Action:Execute:${expected}`.toUpperCase()
      const fn = getSubscriber(action.toUpperCase())
      isMenuActiveSpy.returns(false)
      const spy = sandbox.stub().resolves()
      PubSub.subscribers[`Action:Execute:${expected}`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.firstCall.args).to.deep.equal([undefined, subscriberName])
    })
    it(`should call Action:Execute:HideMenu once for ${action} when menu is active`, async () => {
      Inputs.InitActions()
      Pictures.pictures = [Cast<Picture>({})]
      const fn = getSubscriber(action.toUpperCase())
      isMenuActiveSpy.returns(true)
      const spy = sandbox.stub().resolves()
      PubSub.subscribers[`Action:Execute:HideMenu`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.callCount).to.equal(1)
    })
    it(`should publish Action:Execute:HideMenu for ${action} when menu is active`, async () => {
      Inputs.InitActions()
      Pictures.pictures = [Cast<Picture>({})]
      const subscriberName = `Action:Execute:HideMenu`.toUpperCase()
      const fn = getSubscriber(action.toUpperCase())
      isMenuActiveSpy.returns(true)
      const spy = sandbox.stub().resolves()
      PubSub.subscribers[`Action:Execute:HideMenu`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.firstCall.args).to.deep.equal([undefined, subscriberName])
    })
    it(`should ignore ${action} when menu is active and no pictures`, async () => {
      Inputs.InitActions()
      Pictures.pictures = []
      const fn = getSubscriber(action.toUpperCase())
      isMenuActiveSpy.returns(true)
      const spy = sandbox.stub().resolves()
      PubSub.subscribers[`Action:Execute:`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.callCount).to.equal(0)
    })
  })
  changeToSubscribers.forEach(([action, direction]) => {
    it(`should call GetPicture once for ${action}`, async () => {
      Inputs.InitActions()
      const fn = getSubscriber(action.toUpperCase())
      await fn(undefined)
      expect(getPictureSpy.callCount).to.equal(1)
    })
    it(`should navigate in expected direction for ${action}`, async () => {
      Inputs.InitActions()
      const fn = getSubscriber(action.toUpperCase())
      await fn(undefined)
      expect(getPictureSpy.firstCall.args).to.deep.equal([direction])
    })
    it(`should call ChangePicture once for ${action}`, async () => {
      Inputs.InitActions()
      const fn = getSubscriber(action.toUpperCase())
      await fn(undefined)
      expect(changePictureSpy.callCount).to.equal(1)
    })
    it(`should call ChangePicture with one argument for ${action}`, async () => {
      Inputs.InitActions()
      const fn = getSubscriber(action.toUpperCase())
      await fn(undefined)
      expect(changePictureSpy.firstCall.args).to.have.lengthOf(1)
    })
    it(`should change to fetched picture for ${action}`, async () => {
      Inputs.InitActions()
      const fn = getSubscriber(action.toUpperCase())
      await fn(undefined)
      expect(changePictureSpy.firstCall.args[0]).to.equal(getPictureFake)
    })
  })
  it('should translate Action:Execute:Previous as PreviousUnseen when ShowUnreadOnly is set', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:PREVIOUS')
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSUNSEEN'] = [spy]
    getShowUnreadOnly.returns(true)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should translate Action:Execute:Previous as PreviousImage when ShowUnreadOnly is unset', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:PREVIOUS')
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSIMAGE'] = [spy]
    getShowUnreadOnly.returns(false)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should translate Action:Execute:Next as NextUnseen when ShowUnreadOnly is set', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:NEXT')
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:NEXTUNSEEN'] = [spy]
    getShowUnreadOnly.returns(true)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should translate Action:Execute:Next as NextImage when ShowUnreadOnly is unset', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:NEXT')
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:NEXTIMAGE'] = [spy]
    getShowUnreadOnly.returns(false)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should call window.open once when Action:Execute:ViewFullSize', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:VIEWFULLSIZE')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    await fn(undefined)
    expect(windowOpenSpy.callCount).to.equal(1)
  })
  it('should open new window when Action:Execute:ViewFullSize', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:VIEWFULLSIZE')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    await fn(undefined)
    expect(windowOpenSpy.firstCall.args).to.deep.equal(['/images/full/this/is/my/foo'])
  })
  it('should ignore Action:Execute:ViewFullSize when no current image', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:VIEWFULLSIZE')
    Pictures.current = null
    await fn(undefined)
    expect(windowOpenSpy.callCount).to.equal(0)
  })
  it('should call Bookmarks:Add once when Action:Execute:Bookmark', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:BOOKMARK')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['BOOKMARKS:ADD'] = [spy]
    await fn(undefined)
    expect(spy.callCount).to.equal(1)
  })
  it('should add current image as bookmark for Action:Execute:Bookmark', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:BOOKMARK')
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['BOOKMARKS:ADD'] = [spy]
    await fn(undefined)
    expect(spy.firstCall.args).to.deep.equal(['/this/is/my/foo', 'BOOKMARKS:ADD'])
  })
  it('should ignore Action:Execute:Bookmark when no current image', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('ACTION:EXECUTE:BOOKMARK')
    Pictures.current = null
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['BOOKMARKS:ADD'] = [spy]
    await fn(undefined)
    expect(spy.callCount).to.equal(0)
  })
  it('should use same handler for Action:Execute:Bookmark and Action:Gamepad:B', () => {
    Inputs.InitActions()
    const fn1 = getSubscriber('ACTION:EXECUTE:BOOKMARK')
    const fn2 = getSubscriber('ACTION:GAMEPAD:B')
    expect(fn1).to.equal(fn2)
  })
  it('should load images for Pictures:SelectPage', async () => {
    Inputs.InitActions()
    const fn = getSubscriber('PICTURES:SELECTPAGE')
    await fn(undefined)
    expect(loadCurrentPageSpy.callCount).to.equal(1)
  })
})
