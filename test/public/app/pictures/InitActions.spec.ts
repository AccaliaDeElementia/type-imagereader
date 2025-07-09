'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { NavigateTo, Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../public/scripts/app/navigation'
import assert from 'assert'
import type { Picture } from '../../../../contracts/listing'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pictures function ResetMarkup()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let isMenuActiveSpy = Sinon.stub()
  let getShowUnreadOnly = Sinon.stub()
  let getPictureFake = { number: Math.random() }
  let getPictureSpy = Sinon.stub()
  let changePictureSpy = Sinon.stub()
  let loadCurrentPageSpy = Sinon.stub()
  let windowOpenSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    Pictures.mainImage = null
    Pictures.imageCard = null
    isMenuActiveSpy = Sinon.stub(Navigation, 'IsMenuActive').returns(false)
    getShowUnreadOnly = Sinon.stub(Pictures, 'GetShowUnreadOnly').returns(false)
    getPictureFake = { number: Math.random() }
    getPictureSpy = Sinon.stub(Pictures, 'GetPicture').returns(Cast<Picture>(getPictureFake))
    changePictureSpy = Sinon.stub(Pictures, 'ChangePicture')
    loadCurrentPageSpy = Sinon.stub(Pictures, 'LoadCurrentPageImages')
    windowOpenSpy = Sinon.stub(global.window, 'open')
  })
  afterEach(() => {
    windowOpenSpy.restore()
    loadCurrentPageSpy.restore()
    changePictureSpy.restore()
    getPictureSpy.restore()
    getShowUnreadOnly.restore()
    isMenuActiveSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  const noMenuSubscribers: Array<[string, string]> = [
    ['Action:Keypress:ArrowUp', 'ShowMenu'],
    ['Action:Keypress:ArrowRight', 'Next'],
    ['Action:Keypress:ArrowLeft', 'Previous'],
    ['Action:Gamepad:Right', 'Next'],
    ['Action:Gamepad:LRight', 'NextUnseen'],
    ['Action:Gamepad:RRight', 'NextImage'],
    ['Action:GamePad:Left', 'Previous'],
    ['Action:GamePad:LLeft', 'PreviousUnseen'],
    ['Action:GamePad:RLeft', 'PreviousImage'],
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
    Pictures.InitActions()
    expect(PubSub.subscribers).to.have.all.keys(subscribers.map((m) => m.toUpperCase()))
  })
  subscribers.forEach((message) => {
    it(`should subscribe to ${message}`, () => {
      Pictures.InitActions()
      expect(PubSub.subscribers).to.contain.keys(message.toUpperCase())
    })
  })
  noMenuSubscribers.forEach(([action, expected]) => {
    it(`should publish Action:Execute:${expected} for ${action} when menu is not active`, async () => {
      Pictures.InitActions()
      const subscriberName = `Action:Execute:${expected}`.toUpperCase()
      const fn = PubSub.subscribers[action.toUpperCase()]?.pop()
      assert(fn != null)
      isMenuActiveSpy.returns(false)
      const spy = Sinon.stub().resolves()
      PubSub.subscribers[`Action:Execute:${expected}`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.callCount).to.equal(1)
      expect(spy.firstCall.args).to.deep.equal([undefined, subscriberName])
    })
    it(`should publish Action:Execute:HideMenu for ${action} when menu is active`, async () => {
      Pictures.InitActions()
      Pictures.pictures = [Cast<Picture>({})]
      const subscriberName = `Action:Execute:HideMenu`.toUpperCase()
      const fn = PubSub.subscribers[action.toUpperCase()]?.pop()
      assert(fn != null)
      isMenuActiveSpy.returns(true)
      const spy = Sinon.stub().resolves()
      PubSub.subscribers[`Action:Execute:HideMenu`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.callCount).to.equal(1)
      expect(spy.firstCall.args).to.deep.equal([undefined, subscriberName])
    })
    it(`should ignore ${action} when menu is active and no pictures`, async () => {
      Pictures.InitActions()
      Pictures.pictures = []
      const fn = PubSub.subscribers[action.toUpperCase()]?.pop()
      assert(fn != null)
      isMenuActiveSpy.returns(true)
      const spy = Sinon.stub().resolves()
      PubSub.subscribers[`Action:Execute:`.toUpperCase()] = [spy]
      await fn(undefined)
      expect(spy.callCount).to.equal(0)
    })
  })
  changeToSubscribers.forEach(([action, direction]) => {
    it(`should navigate in expected direction for ${action}`, async () => {
      Pictures.InitActions()
      const fn = PubSub.subscribers[action.toUpperCase()]?.pop()
      assert(fn != null)
      await fn(undefined)
      expect(getPictureSpy.callCount).to.equal(1)
      expect(getPictureSpy.firstCall.args).to.deep.equal([direction])
    })
    it(`should change to fetched picture for ${action}`, async () => {
      Pictures.InitActions()
      const fn = PubSub.subscribers[action.toUpperCase()]?.pop()
      assert(fn != null)
      await fn(undefined)
      expect(changePictureSpy.callCount).to.equal(1)
      expect(changePictureSpy.firstCall.args).to.have.lengthOf(1)
      expect(changePictureSpy.firstCall.args[0]).to.equal(getPictureFake)
    })
  })
  it('should translate Action:Execute:Previous as PreviousUnseen when ShowUnreadOnly is set', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:PREVIOUS']?.pop()
    assert(fn != null)
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSUNSEEN'] = [spy]
    getShowUnreadOnly.returns(true)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should translate Action:Execute:Previous as PreviousImage when ShowUnreadOnly is unset', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:PREVIOUS']?.pop()
    assert(fn != null)
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSIMAGE'] = [spy]
    getShowUnreadOnly.returns(false)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should translate Action:Execute:Next as NextUnseen when ShowUnreadOnly is set', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:NEXT']?.pop()
    assert(fn != null)
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:NEXTUNSEEN'] = [spy]
    getShowUnreadOnly.returns(true)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should translate Action:Execute:Next as NextImage when ShowUnreadOnly is unset', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:NEXT']?.pop()
    assert(fn != null)
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:NEXTIMAGE'] = [spy]
    getShowUnreadOnly.returns(false)
    await fn(undefined)
    expect(spy.callCount).that.equal(1)
  })
  it('should open new window when Action:Execute:ViewFullSize', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:VIEWFULLSIZE']?.pop()
    assert(fn != null)
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    await fn(undefined)
    expect(windowOpenSpy.callCount).to.equal(1)
    expect(windowOpenSpy.firstCall.args).to.deep.equal(['/images/full/this/is/my/foo'])
  })
  it('should ignore Action:Execute:ViewFullSize when no current image', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:VIEWFULLSIZE']?.pop()
    assert(fn != null)
    Pictures.current = null
    await fn(undefined)
    expect(windowOpenSpy.callCount).to.equal(0)
  })
  it('should add current image as bookmark for Action:Execute:Bookmark', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:BOOKMARK']?.pop()
    assert(fn != null)
    Pictures.current = { path: '/this/is/my/foo', name: 'foo', seen: false }
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['BOOKMARKS:ADD'] = [spy]
    await fn(undefined)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args).to.deep.equal(['/this/is/my/foo', 'BOOKMARKS:ADD'])
  })
  it('should ignore Action:Execute:Bookmark when no current image', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['ACTION:EXECUTE:BOOKMARK']?.pop()
    assert(fn != null)
    Pictures.current = null
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['BOOKMARKS:ADD'] = [spy]
    await fn(undefined)
    expect(spy.callCount).to.equal(0)
  })
  it('should use same handler for Action:Execute:Bookmark and Action:Gamepad:B', () => {
    Pictures.InitActions()
    const fn1 = PubSub.subscribers['ACTION:EXECUTE:BOOKMARK']?.pop()
    assert(fn1 != null)
    const fn2 = PubSub.subscribers['ACTION:GAMEPAD:B']?.pop()
    assert(fn2 != null)
    expect(fn1).to.equal(fn2)
  })
  it('should load images for Pictures:SelectPage', async () => {
    Pictures.InitActions()
    const fn = PubSub.subscribers['PICTURES:SELECTPAGE']?.pop()
    assert(fn != null)
    await fn(undefined)
    expect(loadCurrentPageSpy.callCount).to.equal(1)
  })
})
