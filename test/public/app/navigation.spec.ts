'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Navigation } from '../../../public/scripts/app/navigation'
import type { Data } from '../../../public/scripts/app/navigation'
import { Net } from '../../../public/scripts/app/net'
import assert from 'assert'
import { Pictures } from '../../../public/scripts/app/pictures'

const markup = `
html
  head
    title
  body
    div
      a.navbar-brand
      a.menuButton
    div#mainMenu
      div.innerTarget
`

class TestNavigation extends Navigation {
  public static get current (): Data {
    return Navigation.current
  }

  public static set current (data: Data) {
    Navigation.current = data
  }
}

abstract class BaseNavigationTests extends PubSub {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  document: Document
  dom: JSDOM
  tabSelectedSpy: sinon.SinonStub

  constructor () {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.document = global.document
    this.dom = new JSDOM('', {})
    this.tabSelectedSpy = sinon.stub()
  }

  before (): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999'
    })
    this.document = this.dom.window.document
    this.existingWindow = global.window
    global.window = (this.dom.window as unknown) as Window & typeof globalThis
    this.existingDocument = global.document
    global.document = this.dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.Subscribe('Tab:Selected', this.tabSelectedSpy)
    this.tabSelectedSpy.reset()
  }

  after (): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

@suite
export class AppNavigationBaseUrlTests extends BaseNavigationTests {
  @test
  'it should return the correct protocol for http site' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/'
    })
    expect(Navigation.BaseUrl).to.equal('http://type-imagereader.example.com/')
  }

  @test
  'it should return the correct protocol for https site' (): void {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com/'
    })
    expect(Navigation.BaseUrl).to.equal('https://type-imagereader.example.com/')
  }

  @test
  'it should return the correct port when using non standard port' (): void {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com:2999/'
    })
    expect(Navigation.BaseUrl).to.equal('https://type-imagereader.example.com:2999/')
  }

  @test
  'it should return the correct path' (): void {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com/show/foo/bar/baz?quux'
    })
    expect(Navigation.BaseUrl).to.equal('https://type-imagereader.example.com/show')
  }
}

@suite
export class AppNavigationFolderPathTests extends BaseNavigationTests {
  @test
  'it should return the default path for no folder path' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the default path for blank folder path' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the default path for base folder path' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the default path for base folder path with trailing slash' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the correct path for deep folder path' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    expect(Navigation.FolderPath).to.equal('/foo/bar/baz')
  }
}

@suite
export class AppNavigationIsMenuActiveTests extends BaseNavigationTests {
  @test
  'it should return true for missing menu' (): void {
    this.document.querySelector('#mainMenu')?.remove()
    expect(Navigation.IsMenuActive).to.equal(true)
  }

  @test
  'it should return true for non hidden menu' (): void {
    expect(Navigation.IsMenuActive).to.equal(true)
  }

  @test
  'it should return false for hidden menu' (): void {
    this.document.querySelector('#mainMenu')?.classList.add('hidden')
    expect(Navigation.IsMenuActive).to.equal(false)
  }
}

@suite
export class AppNavigationIsSuppressMenuTests extends BaseNavigationTests {
  @test
  'it should return true for valueless noMenu flag' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/?noMenu'
    })
    expect(Navigation.IsSuppressMenu).to.equal(true)
  }

  @test
  'it should return true for noMenu flag with value' (): void {
    const values = [
      'true',
      '1',
      'noMenu',
      'false',
      '0'
    ]
    for (const value of values) {
      this.dom.reconfigure({
        url: 'http://type-imagereader.example.com/?noMenu=' + value
      })
      expect(Navigation.IsSuppressMenu).to.equal(true)
    }
  }

  @test
  'it should return false for missing NoMenu' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/?'
    })
    expect(Navigation.IsSuppressMenu).to.equal(false)
  }
}

@suite
export class AppnavigationLoadDataTests extends BaseNavigationTests {
  GetJSONStub: sinon.SinonStub = sinon.stub()
  PushStateStub: sinon.SinonStub = sinon.stub()
  PublishSpy: sinon.SinonStub = sinon.stub()

  before (): void {
    super.before()
    TestNavigation.current = {
      path: '/foo/bar/baz'
    }
    this.GetJSONStub = sinon.stub(Net, 'GetJSON')
    this.GetJSONStub.resolves(TestNavigation.current)
    this.PushStateStub = sinon.stub(this.dom.window.history, 'pushState')
    this.PublishSpy = sinon.stub()
    PubSub.Subscribe('Loading:Show', this.PublishSpy)
    PubSub.Subscribe('Loading:Hide', this.PublishSpy)
    PubSub.Subscribe('Loading:Error', this.PublishSpy)
    PubSub.Subscribe('Navigate:Data', this.PublishSpy)
  }

  after (): void {
    this.PushStateStub.restore()
    this.GetJSONStub.restore()
    super.after()
  }

  @test
  async 'it should publish Loading:Show' (): Promise<void> {
    TestNavigation.current = {
      path: '/'
    }
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:SHOW')).to.equal(true)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:ERROR')).to.equal(false)
  }

  @test
  async 'it should call GetJSON with expected Path' (): Promise<void> {
    await Navigation.LoadData()
    expect(this.GetJSONStub.calledWith('/api/listing/foo/bar/baz')).to.equal(true)
  }

  @test
  async 'it should set noMenu based on call GetJSON with expected Path' (): Promise<void> {
    await Navigation.LoadData()
    expect(this.GetJSONStub.calledWith('/api/listing/foo/bar/baz')).to.equal(true)
  }

  @test
  async 'it should set noMenu false when not menu suppressed' (): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    await Navigation.LoadData()
    expect(TestNavigation.current.noMenu).to.equal(false)
  }

  @test
  async 'it should set noMenu true when menu suppressed' (): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz?noMenu'
    })
    await Navigation.LoadData()
    expect(TestNavigation.current.noMenu).to.equal(true)
  }

  @test
  async 'it should set page title to data name when set' (): Promise<void> {
    this.GetJSONStub.returns({
      name: 'Bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('Bazz')
  }

  @test
  async 'it should set navbar brand to data name when set' (): Promise<void> {
    this.GetJSONStub.returns({
      name: 'Bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('Bazz')
  }

  @test
  async 'it should set page title to data path when name is null' (): Promise<void> {
    this.GetJSONStub.returns({
      name: null,
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is null' (): Promise<void> {
    this.GetJSONStub.returns({
      name: null,
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set page title to data path when name is blank' (): Promise<void> {
    this.GetJSONStub.returns({
      name: '',
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is blank' (): Promise<void> {
    this.GetJSONStub.returns({
      name: '',
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set page title to data path when name is missing' (): Promise<void> {
    this.GetJSONStub.returns({
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is missing' (): Promise<void> {
    this.GetJSONStub.returns({
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should push history when no history flag is not specified' (): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    await Navigation.LoadData()
    expect(this.PushStateStub.callCount).to.equal(1)
    expect(this.PushStateStub.firstCall.args).to.deep.equal(
      [{}, '', 'http://type-imagereader.example.com/show/foo/bar/baz']
    )
  }

  @test
  async 'it should push history when no history flag is false' (): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    await Navigation.LoadData(false)
    expect(this.PushStateStub.callCount).to.equal(1)
    expect(this.PushStateStub.firstCall.args).to.deep.equal(
      [{}, '', 'http://type-imagereader.example.com/show/foo/bar/baz']
    )
  }

  @test
  async 'it should not push history when no history flag is true' (): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    await Navigation.LoadData(true)
    expect(this.PushStateStub.callCount).to.equal(0)
  }

  @test
  async 'it should publish Loading:Hide' (): Promise<void> {
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:HIDE')).to.equal(true)
  }

  @test
  async 'it should publish Navigate:Data' (): Promise<void> {
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(TestNavigation.current, 'NAVIGATE:DATA')).to.equal(true)
  }

  @test
  async 'it should not publish Loading:Error on success' (): Promise<void> {
    await Navigation.LoadData()

    expect(this.PublishSpy.getCalls()
      .map(c => c.args[1])
      .filter(signal => signal === 'LOADING:ERROR')
    ).to.deep.equal([])
  }

  @test
  async 'it should not publish Loading:Hide when GetJSON rejects' (): Promise<void> {
    const err = new Error('FOO!')
    this.GetJSONStub.rejects(err)
    await Navigation.LoadData()
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:HIDE')).to.equal(false)
  }

  @test
  async 'it should publish Loading:Error when GetJSON rejects' (): Promise<void> {
    const err = new Error('FOO!')
    this.GetJSONStub.rejects(err)
    await Navigation.LoadData()
    expect(this.PublishSpy.calledWith(err, 'LOADING:ERROR')).to.equal(true)
  }
}

@suite
export class AppNavigaterInitTests extends BaseNavigationTests {
  consoleLog: sinon.SinonStub = sinon.stub()
  LoadDataStub: sinon.SinonStub = sinon.stub()
  NavigateToStub: sinon.SinonStub = sinon.stub()
  PostJSONStub: sinon.SinonStub = sinon.stub()
  RequestFullscreenStub: sinon.SinonStub = sinon.stub()
  ExitFullscreenStub: sinon.SinonStub = sinon.stub()
  ShowUnreadOnlyGetStub: sinon.SinonStub = sinon.stub()

  before (): void {
    super.before()
    this.consoleLog = sinon.stub(global.window.console, 'log')
    this.LoadDataStub = sinon.stub(Navigation, 'LoadData')
    this.LoadDataStub.resolves()
    this.NavigateToStub = sinon.stub(Navigation, 'NavigateTo')
    this.PostJSONStub = sinon.stub(Net, 'PostJSON')
    this.PostJSONStub.resolves({})
    this.ShowUnreadOnlyGetStub = sinon.stub(Pictures, 'ShowUnreadOnly').get(() => false)
    this.RequestFullscreenStub = sinon.stub()
    this.RequestFullscreenStub.resolves()
    this.dom.window.document.body.requestFullscreen = this.RequestFullscreenStub
    this.ExitFullscreenStub = sinon.stub()
    this.ExitFullscreenStub.resolves()
    this.dom.window.document.exitFullscreen = this.ExitFullscreenStub
    TestNavigation.current = {
      path: '/'
    }
  }

  after (): void {
    this.ShowUnreadOnlyGetStub.restore()
    this.PostJSONStub.restore()
    this.NavigateToStub.restore()
    this.LoadDataStub.restore()
    this.consoleLog.restore()
    super.after()
  }

  @test
  'it should set path of current data on Init' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    Navigation.Init()
    expect(TestNavigation.current.path).to.equal('/foo/bar/baz')
  }

  @test
  'it should execute LoadData with defaults' (): void {
    Navigation.Init()
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([])
  }

  @test
  'it should tolerate LoadData rejecting' (): void {
    this.LoadDataStub.rejects(new Error('FOO!'))
    expect(PubSub.subscribers).to.not.have.any.keys('NAVIGATE:LOAD')
    Navigation.Init()
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:LOAD')
  }

  @test
  'it should subscribe to "Navigate:Load"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:LOAD')
    expect(PubSub.subscribers['NAVIGATE:LOAD']).to.have.length(1)
  }

  @test
  'Navigate:Load handler should tolerate LoadData rejecting' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    this.LoadDataStub.rejects(new Event('FOO!'))
    const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    expect(() => { handler('a string') }).to.not.throw()
  }

  @test
  'Navigate:Load handler should set path when called with string' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler('a string')
    expect(TestNavigation.current).to.deep.equal({
      path: 'a string'
    })
  }

  @test
  'Navigate:Load handler should clear current when called with string' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    TestNavigation.current = {
      path: '/',
      name: 'WRONG NAME'
    }
    const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler('a string')
    expect(TestNavigation.current).to.deep.equal({
      path: 'a string'
    })
  }

  @test
  'Navigate:Load handler should set current when called with NoMenuPath' (): void {
    const obj = {
      path: 'a string',
      noMenu: true
    }
    Navigation.Init()
    TestNavigation.current = {
      path: '/',
      name: 'WRONG NAME'
    }
    this.LoadDataStub.resetHistory()
    const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(obj)
    expect(TestNavigation.current).to.equal(obj)
  }

  @test
  'Navigate:Load handler should call LoadData with defaults' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler('a string')
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([])
  }

  @test
  'it should subscribe to "Navigate:Reload"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:RELOAD')
    expect(PubSub.subscribers['NAVIGATE:RELOAD']).to.have.length(1)
  }

  @test
  'Navigate:Reload handler should tolerate LoadData rejecting' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    this.LoadDataStub.rejects(new Event('FOO!'))
    const handler = PubSub.subscribers['NAVIGATE:RELOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    expect(() => { handler('a string') }).to.not.throw()
  }

  @test
  'Navigate:Reload handler should call LoadData with defaults' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    const handler = PubSub.subscribers['NAVIGATE:RELOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler('a string')
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([])
  }

  @test
  'it should register popstate listener that sets current when triggered' (): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/quux'
    })
    Navigation.Init()
    TestNavigation.current = {
      path: '/',
      name: 'WRONG NAME'
    }
    const popStateEvent = new this.dom.window.PopStateEvent('popstate', { state: {} })
    this.dom.window.dispatchEvent(popStateEvent)
    expect(TestNavigation.current).to.deep.equal({
      path: '/quux'
    })
  }

  @test
  'it should register popstate listener that tolerates LoadData rejecting' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    this.LoadDataStub.rejects(new Event('FOO!'))
    const popStateEvent = new this.dom.window.PopStateEvent('popstate', { state: {} })
    this.dom.window.dispatchEvent(popStateEvent)
    expect(this.LoadDataStub.callCount).to.equal(1)
  }

  @test
  'it should register popstate listener that calls LoadData with no history flag set' (): void {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    const popStateEvent = new this.dom.window.PopStateEvent('popstate', { state: {} })
    this.dom.window.dispatchEvent(popStateEvent)
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([true])
  }

  @test
  'it should subscribe to "Navigate:Data"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:DATA')
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  }

  @test
  'Navigate:Data handler should log first argument' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    const obj = {
      pi: 3.1415926
    }
    handler(obj)
    expect(this.consoleLog.callCount).to.equal(1)
    expect(this.consoleLog.firstCall.args).to.have.length(1)
    expect(this.consoleLog.firstCall.args.pop()).to.equal(obj)
  }

  @test
  'it should subscribe to "Menu:Show"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('MENU:SHOW')
    expect(PubSub.subscribers['MENU:SHOW']).to.have.length(1)
  }

  @test
  'Menu:Show handler should remove hidden class to main menu' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['MENU:SHOW']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    const mainMenu = this.document.querySelector('#mainMenu')
    assert(mainMenu, 'mainMenu must exist')
    mainMenu.classList.add('hidden')
    handler(undefined)
    expect(mainMenu.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should subscribe to "Menu:Hide"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('MENU:HIDE')
    expect(PubSub.subscribers['MENU:HIDE']).to.have.length(1)
  }

  @test
  'Menu:Hide handler should add hidden class to main menu' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['MENU:HIDE']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    const mainMenu = this.document.querySelector('#mainMenu')
    assert(mainMenu, 'mainMenu must exist')
    mainMenu.classList.remove('hidden')
    handler(undefined)
    expect(mainMenu.classList.contains('hidden')).to.equal(true)
  }

  @test
  '#mainMenu Click handler ignores click not targeting #mainMenu' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:HIDE'] = [spy]
    const target = this.document.querySelector('.innerTarget')
    assert(target, 'target must exist')
    TestNavigation.current.pictures = [{}]
    const event = new this.dom.window.MouseEvent('click', { bubbles: true })
    target.dispatchEvent(event)
    expect(spy.callCount).to.equal(0)
  }

  @test
  '#mainMenu Click handler ignores click with empty pictures list' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:HIDE'] = [spy]
    const target = this.document.querySelector('#mainMenu')
    assert(target, 'target must exist')
    TestNavigation.current.pictures = []
    const event = new this.dom.window.MouseEvent('click')
    target.dispatchEvent(event)
    expect(spy.callCount).to.equal(0)
  }

  @test
  '#mainMenu Click handler ignores click with missing pictures list' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:HIDE'] = [spy]
    const target = this.document.querySelector('#mainMenu')
    assert(target, 'target must exist')
    expect(TestNavigation.current.pictures).to.equal(undefined)
    const event = new this.dom.window.MouseEvent('click')
    target.dispatchEvent(event)
    expect(spy.callCount).to.equal(0)
  }

  @test
  '#mainMenu Click handler hides menu for direct click with pictures' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:HIDE'] = [spy]
    const target = this.document.querySelector('#mainMenu')
    assert(target, 'target must exist')
    TestNavigation.current.pictures = [{}]
    const event = new this.dom.window.MouseEvent('click')
    target.dispatchEvent(event)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'menuButton Click handler showsmenu' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:SHOW'] = [spy]
    const target = this.document.querySelector('.menuButton')
    assert(target, 'target must exist')
    TestNavigation.current.pictures = [{}]
    const event = new this.dom.window.MouseEvent('click')
    target.dispatchEvent(event)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Execute:PreviousFolder"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:PREVIOUSFOLDER')
    expect(PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']).to.have.length(1)
  }

  @test
  'Action:Execute:PreviousFolder handler should NavigateTo previousFolder with ShowUnreadOnly unset' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.prev = {
      path: '/foo/bar/baz'
    }
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'PreviousFolder')).to.equal(true)
  }

  @test
  'Action:Execute:PreviousFolder handler should NavigateTo previousUnreadFolder with ShowUnreadOnly set' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.prevUnread = {
      path: '/foo/bar/baz'
    }
    this.ShowUnreadOnlyGetStub.get(() => true)
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'PreviousFolder')).to.equal(true)
  }

  @test
  'Action:Execute:PreviousFolder handler should NavigateTo undefined previousFolder when node missing and with ShowUnreadOnly unset' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.prev = undefined
    TestNavigation.current.prevUnread = {
      path: '/foo/bar/baz'
    }
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'PreviousFolder')).to.equal(true)
  }

  @test
  'Action:Execute:PreviousFolder handler should NavigateTo undefined previousFolder when node missing and with ShowUnreadOnly set' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.prev = {
      path: '/foo/bar/baz'
    }
    TestNavigation.current.prevUnread = undefined
    this.ShowUnreadOnlyGetStub.get(() => true)
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'PreviousFolder')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:NextFolder"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:NEXTFOLDER')
    expect(PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']).to.have.length(1)
  }

  @test
  'Action:Execute:NextFolder handler should NavigateTo nextFolder with ShowUnreadOnly unset' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.next = {
      path: '/foo/bar/baz'
    }
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'NextFolder')).to.equal(true)
  }

  @test
  'Action:Execute:NextFolder handler should NavigateTo nextFolder with ShowUnreadOnly set' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.nextUnread = {
      path: '/foo/bar/baz'
    }
    this.ShowUnreadOnlyGetStub.get(() => true)
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'NextFolder')).to.equal(true)
  }

  @test
  'Action:Execute:NextFolder handler should NavigateTo undefined nextFolder when node missing and with ShowUnreadOnly unset' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.next = undefined
    TestNavigation.current.nextUnread = {
      path: '/foo/bar/baz'
    }
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'NextFolder')).to.equal(true)
  }

  @test
  'Action:Execute:NextFolder handler should NavigateTo undefined nextFolder when node missing and with ShowUnreadOnly set' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.next = {
      path: '/foo/bar/baz'
    }
    TestNavigation.current.nextUnread = undefined
    this.ShowUnreadOnlyGetStub.get(() => true)
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'NextFolder')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:ParentFolder"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:PARENTFOLDER')
    expect(PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']).to.have.length(1)
  }

  @test
  'Action:Execute:ParentFolder handler should NavigateTo parentFolder' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.parent = '/foo/bar/baz'
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'ParentFolder')).to.equal(true)
  }

  @test
  'Action:Execute:ParentFolder handler should NavigateTo undefined parentFolder when node missing' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.parent = undefined
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'ParentFolder')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:FirstUnfinished"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:FIRSTUNFINISHED')
    expect(PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']).to.have.length(1)
  }

  @test
  'Action:Execute:FirstUnfinished handler should NavigateTo First Unfinished' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.children = [
      {
        name: 'baz',
        path: '/foo/bar/baz',
        totalCount: 100,
        totalSeen: 50
      }, {
        name: 'quux',
        path: '/foo/bar/quux',
        totalCount: 100,
        totalSeen: 50
      }
    ]
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'FirstUnfinished')).to.equal(true)
  }

  @test
  'Action:Execute:FirstUnfinished handler should NavigateTo First Unfinished with some finished' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.children = [
      {
        name: 'quux',
        path: '/foo/bar/quux',
        totalCount: 100,
        totalSeen: 100
      }, {
        name: 'baz',
        path: '/foo/bar/baz',
        totalCount: 100,
        totalSeen: 50
      }
    ]
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'FirstUnfinished')).to.equal(true)
  }

  @test
  'Action:Execute:FirstUnfinished handler should NavigateTo First Unfinished with all finished' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.children = [
      {
        name: 'quux',
        path: '/foo/bar/quux',
        totalCount: 100,
        totalSeen: 100
      }, {
        name: 'baz',
        path: '/foo/bar/baz',
        totalCount: 100,
        totalSeen: 100
      }
    ]
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'FirstUnfinished')).to.equal(true)
  }

  @test
  'Action:Execute:FirstUnfinished handler should NavigateTo First Unfinished with no children' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.children = []
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'FirstUnfinished')).to.equal(true)
  }

  @test
  'Action:Execute:FirstUnfinished handler should NavigateTo First Unfinished with undefined children' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.children = undefined
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'FirstUnfinished')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:ShowMenu"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:SHOWMENU')
    expect(PubSub.subscribers['ACTION:EXECUTE:SHOWMENU']).to.have.length(1)
  }

  @test
  'Action:Execute:ShowMenu shoud publish Menu:Show' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:SHOW'] = [spy]
    const handler = PubSub.subscribers['ACTION:EXECUTE:SHOWMENU']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Execute:HideMenu"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:HIDEMENU')
    expect(PubSub.subscribers['ACTION:EXECUTE:HIDEMENU']).to.have.length(1)
  }

  @test
  'Action:Execute:HideMenu shoud publish Menu:Hide' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:HIDE'] = [spy]
    const handler = PubSub.subscribers['ACTION:EXECUTE:HIDEMENU']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Execute:MarkAllSeen"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:MARKALLSEEN')
    expect(PubSub.subscribers['ACTION:EXECUTE:MARKALLSEEN']).to.have.length(1)
  }

  @test
  async 'Action:Execute:MarkAllSeen should post to /api/mark/read' (): Promise<void> {
    Navigation.Init()
    expect(this.PostJSONStub.callCount).to.equal(0)
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.PostJSONStub.calledWith('/api/mark/read')).to.equal(true)
  }

  @test
  async 'Action:Execute:MarkAllSeen should post current path as payload' (): Promise<void> {
    Navigation.Init()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const path = {
      path: '/foo/bar/baz/' + Math.random()
    }
    TestNavigation.current.path = path.path
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    const payload = this.PostJSONStub.firstCall.args[1]
    expect(payload).to.deep.equal(path)
  }

  @test
  async 'Action:Execute:MarkAllSeen reloads data after successful post' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
  }

  @test
  async 'Action:Execute:MarkAllSeen tolerates LoadData rejecting' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    this.LoadDataStub.rejects('FOO')
    expect(this.PostJSONStub.callCount).to.equal(0)
    const spy = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [spy]
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
    expect(spy.called).to.equal(false)
  }

  @test
  async 'Action:Execute:MarkAllSeen publishes error after rejected post' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const err = new Error('oopsies')
    this.PostJSONStub.rejects(err)
    const spy = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [spy]
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(spy.called).to.equal(true)
    expect(spy.firstCall.args[1]).to.equal('LOADING:ERROR')
    expect(spy.firstCall.args[0]).to.equal(err)
  }

  @test
  async 'Action:Execute:MarkAllSeen does not reload data after rejected post' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const err = new Error('oopsies')
    this.PostJSONStub.rejects(err)
    PubSub.subscribers['LOADING:ERROR'] = [() => {}]
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.called).to.equal(false)
  }

  @test
  'it should subscribe to "Action:Execute:MarkAllUnseen"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:MARKALLUNSEEN')
    expect(PubSub.subscribers['ACTION:EXECUTE:MARKALLUNSEEN']).to.have.length(1)
  }

  @test
  async 'Action:Execute:MarkAllUnseen should post to /api/mark/unread' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.PostJSONStub.calledWith('/api/mark/unread')).to.equal(true)
  }

  @test
  async 'Action:Execute:MarkAllUnseen should post current path as payload' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const path = {
      path: '/foo/bar/baz/' + Math.random()
    }
    TestNavigation.current.path = path.path
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    const payload = this.PostJSONStub.firstCall.args[1]
    expect(payload).to.deep.equal(path)
  }

  @test
  async 'Action:Execute:MarkAllUnseen reloads data after successful post' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
  }

  @test
  async 'Action:Execute:MarkAllUnseen publishes error after rejected post' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const err = new Error('oopsies')
    this.PostJSONStub.rejects(err)
    const spy = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [spy]
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(spy.called).to.equal(true)
    expect(spy.firstCall.args[0]).to.equal(err)
  }

  @test
  async 'Action:Execute:MarkAllUnseen does not reload data after rejected post' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const err = new Error('oopsies')
    this.PostJSONStub.rejects(err)
    PubSub.subscribers['LOADING:ERROR'] = [() => {}]
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.called).to.equal(false)
  }

  @test
  async 'Action:Execute:MarkAllUnseen tolerates LoadData rejecting' (): Promise<void> {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    this.LoadDataStub.rejects('FOO')
    expect(this.PostJSONStub.callCount).to.equal(0)
    const spy = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [spy]
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
    expect(spy.called).to.equal(false)
  }

  @test
  'it should subscribe to "Action:Execute:Slideshow"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:SLIDESHOW')
    expect(PubSub.subscribers['ACTION:EXECUTE:SLIDESHOW']).to.have.length(1)
  }

  @test
  'Action:Execute:SlideShow shoud alter location' (): void {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:SLIDESHOW']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    const path = '/foo/bar/baz/' + Math.random()
    TestNavigation.current.path = path

    const assignStub = sinon.stub(Navigation, 'LocationAssign')
    try {
      expect(assignStub.called).to.equal(false)
      handler(undefined)
      expect(assignStub.calledWith('/slideshow' + path)).to.equal(true)
    } finally {
      assignStub.restore()
    }
  }

  @test
  'it should subscribe to "Action:Execute:FullScreen"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:FULLSCREEN')
    expect(PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']).to.have.length(1)
  }

  @test
  'it should execute requestFullscreen when no fullscreen element exists' (): void {
    expect(this.dom.window.document.fullscreenElement == null).to.equal(true)
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(this.RequestFullscreenStub.called).to.equal(true)
    expect(this.ExitFullscreenStub.called).to.equal(false)
  }

  @test
  'it should execute exitFullscreen when fullscreen element exists' (): void {
    Navigation.Init()
    const newFullscreenElement = Object.defineProperties(
      {},
      {
        ...Object.getOwnPropertyDescriptors(global.document),
        fullscreenElement: {
          configurable: true,
          value: {}
        }
      }
    )
    // @ts-expect-error Force deletion of document for tests
    delete global.document
    // @ts-expect-error Ignore overwrite of readonly element
    global.document = newFullscreenElement

    expect(global.document.fullscreenElement == null).to.equal(false)
    const handler = PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(this.RequestFullscreenStub.called).to.equal(false)
    expect(this.ExitFullscreenStub.called).to.equal(true)
  }

  @test
  async 'it should publish error when requestFullscreen rejects' (): Promise<void> {
    expect(this.dom.window.document.fullscreenElement == null).to.equal(true)
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    const spy = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [spy]
    const err = new Error('oops')
    this.RequestFullscreenStub.rejects(err)
    handler(undefined)
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.RequestFullscreenStub.called).to.equal(true)
    expect(this.ExitFullscreenStub.called).to.equal(false)
    expect(spy.called).to.equal(true)
    expect(spy.firstCall.args[0]).to.equal(err)
  }

  @test
  async 'it should publish error when exitFullscreen rejects' (): Promise<void> {
    Navigation.Init()
    const newFullscreenElement = Object.defineProperties(
      {},
      {
        ...Object.getOwnPropertyDescriptors(global.document),
        fullscreenElement: {
          configurable: true,
          value: {}
        }
      }
    )
    // @ts-expect-error ignore readonly global document for tests
    delete global.document
    // @ts-expect-error ignore readonly global document for tests
    global.document = newFullscreenElement

    expect(global.document.fullscreenElement == null).to.equal(false)
    const handler = PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    const spy = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [spy]
    const err = new Error('oops')
    this.ExitFullscreenStub.rejects(err)
    handler(undefined)
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.RequestFullscreenStub.called).to.equal(false)
    expect(this.ExitFullscreenStub.called).to.equal(true)
    expect(spy.called).to.equal(true)
    expect(spy.firstCall.args[0]).to.equal(err)
  }

  @test
  'it should subscribe to "Action:Keypress:<Ctrl>ArrowUp"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:KEYPRESS:<CTRL>ARROWUP')
    expect(PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWUP']).to.have.length(1)
  }

  @test
  'Action:Keypress:<Ctrl>ArrowUp shoud publish Action:Execute:ParentFolder' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWUP']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Keypress:<Ctrl>ArrowDown"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:KEYPRESS:<CTRL>ARROWDOWN')
    expect(PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWDOWN']).to.have.length(1)
  }

  @test
  'Action:Keypress:<Ctrl>ArrowDown shoud publish Action:Execute:FirstUnfinished' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED'] = [spy]
    const handler = PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWDOWN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Keypress:<Ctrl>ArrowLeft"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:KEYPRESS:<CTRL>ARROWLEFT')
    expect(PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWLEFT']).to.have.length(1)
  }

  @test
  'Action:Keypress:<Ctrl>ArrowUp shoud publish Action:Execute:PreviousFolder' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWLEFT']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Keypress:<Ctrl>ArrowRight"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:KEYPRESS:<CTRL>ARROWRIGHT')
    expect(PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWRIGHT']).to.have.length(1)
  }

  @test
  'Action:Keypress:<Ctrl>ArrowUp shoud publish Action:Execute:NextFolder' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWRIGHT']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Gamepad:Down"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:DOWN')
    expect(PubSub.subscribers['ACTION:GAMEPAD:DOWN']).to.have.length(1)
  }

  @test
  'Action:GamePad:Down shoud publish Action:Execute:PreviousFolder' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:GAMEPAD:DOWN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:GamePad:Up"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:UP')
    expect(PubSub.subscribers['ACTION:GAMEPAD:UP']).to.have.length(1)
  }

  @test
  'Action:GamePad:Up shoud publish Action:Execute:NextFolder' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:GAMEPAD:UP']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:GamePad:Y"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:Y')
    expect(PubSub.subscribers['ACTION:GAMEPAD:Y']).to.have.length(1)
  }

  @test
  'Action:GamePad:Y shoud publish Action:Execute:ParentFolder' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:GAMEPAD:Y']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:GamePad:A"' (): void {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:A')
    expect(PubSub.subscribers['ACTION:GAMEPAD:A']).to.have.length(1)
  }

  @test
  'Action:GamePad:A shoud publish Action:Execute:FirstUnfinished' (): void {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED'] = [spy]
    const handler = PubSub.subscribers['ACTION:GAMEPAD:A']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }
}

@suite
export class AppNavigatorNavigateTo extends BaseNavigationTests {
  LoadDataStub: sinon.SinonStub = sinon.stub()
  LoadingErrorStub: sinon.SinonStub = sinon.stub()

  before (): void {
    super.before()
    this.LoadDataStub = sinon.stub(Navigation, 'LoadData').resolves(undefined)
    this.LoadingErrorStub = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [this.LoadingErrorStub]
  }

  after (): void {
    this.LoadDataStub.restore()
    super.after()
  }

  @test
  'it should publish error for undefined path' (): void {
    Navigation.NavigateTo(undefined, 'TestCase')
    expect(this.LoadDataStub.called).to.equal(false)
    expect(this.LoadingErrorStub.calledWith('Action TestCase has no target')).to.equal(true)
  }

  @test
  'it should publish error for blank path' (): void {
    Navigation.NavigateTo('', 'TestCase')
    expect(this.LoadDataStub.called).to.equal(false)
    expect(this.LoadingErrorStub.calledWith('Action TestCase has no target')).to.equal(true)
  }

  @test
  'it should tolerate LoadData rejecting' (): void {
    const path = '/foo/bar/baz/' + Math.random()
    TestNavigation.current.path = '/'
    this.LoadDataStub.rejects(new Error('FOO!'))
    Navigation.NavigateTo(path, 'TestCase')
    expect(TestNavigation.current.path).to.equal(path)
  }

  @test
  'it should set current path' (): void {
    const path = '/foo/bar/baz/' + Math.random()
    TestNavigation.current.path = '/'
    Navigation.NavigateTo(path, 'TestCase')
    expect(TestNavigation.current.path).to.equal(path)
  }

  @test
  'it should set load data' (): void {
    const path = '/foo/bar/baz/' + Math.random()
    TestNavigation.current.path = '/'
    Navigation.NavigateTo(path, 'TestCase')
    expect(this.LoadDataStub.called).to.equal(true)
    expect(this.LoadingErrorStub.called).to.equal(false)
  }
}
