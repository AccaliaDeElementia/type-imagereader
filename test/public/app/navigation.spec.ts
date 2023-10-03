'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Navigation, Data } from '../../../public/scripts/app/navigation'
import { Net } from '../../../public/scripts/app/net'
import assert from 'assert'

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
  public static get current () : Data {
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
  'it should return the correct protocol for http site' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/'
    })
    expect(Navigation.BaseUrl).to.equal('http://type-imagereader.example.com/')
  }

  @test
  'it should return the correct protocol for https site' () {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com/'
    })
    expect(Navigation.BaseUrl).to.equal('https://type-imagereader.example.com/')
  }

  @test
  'it should return the correct port when using non standard port' () {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com:2999/'
    })
    expect(Navigation.BaseUrl).to.equal('https://type-imagereader.example.com:2999/')
  }

  @test
  'it should return the correct path' () {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com/show/foo/bar/baz?quux'
    })
    expect(Navigation.BaseUrl).to.equal('https://type-imagereader.example.com/show')
  }
}

@suite
export class AppNavigationFolderPathTests extends BaseNavigationTests {
  @test
  'it should return the default path for no folder path' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the default path for blank folder path' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the default path for base folder path' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the default path for base folder path with trailing slash' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/'
    })
    expect(Navigation.FolderPath).to.equal('/')
  }

  @test
  'it should return the correct path for deep folder path' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    expect(Navigation.FolderPath).to.equal('/foo/bar/baz')
  }
}

@suite
export class AppNavigationIsMenuActiveTests extends BaseNavigationTests {
  @test
  'it should return true for missing menu' () {
    this.document.querySelector('#mainMenu')?.remove()
    expect(Navigation.IsMenuActive).to.equal(true)
  }

  @test
  'it should return true for non hidden menu' () {
    expect(Navigation.IsMenuActive).to.equal(true)
  }

  @test
  'it should return false for hidden menu' () {
    this.document.querySelector('#mainMenu')?.classList.add('hidden')
    expect(Navigation.IsMenuActive).to.equal(false)
  }
}

@suite
export class AppNavigationIsSuppressMenuTests extends BaseNavigationTests {
  @test
  'it should return true for valueless noMenu flag' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/?noMenu'
    })
    expect(Navigation.IsSuppressMenu).to.equal(true)
  }

  @test
  'it should return true for noMenu flag with value' () {
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
  'it should return false for missing NoMenu' () {
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

  before () {
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

  after () {
    this.PushStateStub.restore()
    this.GetJSONStub.restore()
    super.after()
  }

  @test
  async 'it should publish Loading:Show' () {
    TestNavigation.current = {
      path: '/'
    }
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:SHOW')).to.equal(true)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:ERROR')).to.equal(false)
  }

  @test
  async 'it should call GetJSON with expected Path' () {
    await Navigation.LoadData()
    expect(this.GetJSONStub.calledWith('/api/listing/foo/bar/baz')).to.equal(true)
  }

  @test
  async 'it should set noMenu based on call GetJSON with expected Path' () {
    await Navigation.LoadData()
    expect(this.GetJSONStub.calledWith('/api/listing/foo/bar/baz')).to.equal(true)
  }

  @test
  async 'it should set noMenu false when not menu suppressed' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    await Navigation.LoadData()
    expect(TestNavigation.current.noMenu).to.equal(false)
  }

  @test
  async 'it should set noMenu true when menu suppressed' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz?noMenu'
    })
    await Navigation.LoadData()
    expect(TestNavigation.current.noMenu).to.equal(true)
  }

  @test
  async 'it should set page title to data name when set' () {
    this.GetJSONStub.returns({
      name: 'Bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('Bazz')
  }

  @test
  async 'it should set navbar brand to data name when set' () {
    this.GetJSONStub.returns({
      name: 'Bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('Bazz')
  }

  @test
  async 'it should set page title to data path when name is blank' () {
    this.GetJSONStub.returns({
      name: '',
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is blank' () {
    this.GetJSONStub.returns({
      name: '',
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set page title to data path when name is missing' () {
    this.GetJSONStub.returns({
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is missing' () {
    this.GetJSONStub.returns({
      path: '/foo/bar/bazz'
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should push history when no history flag is not specified' () {
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
  async 'it should push history when no history flag is false' () {
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
  async 'it should not push history when no history flag is true' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    await Navigation.LoadData(true)
    expect(this.PushStateStub.callCount).to.equal(0)
  }

  @test
  async 'it should publish Loading:Hide' () {
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:HIDE')).to.equal(true)
  }

  @test
  async 'it should publish Navigate:Data' () {
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(TestNavigation.current, 'NAVIGATE:DATA')).to.equal(true)
  }

  @test
  async 'it should not publish Loading:Error on success' () {
    await Navigation.LoadData()

    expect(this.PublishSpy.getCalls()
      .map(c => c.args[1])
      .filter(signal => signal === 'LOADING:ERROR')
    ).to.deep.equal([])
  }

  @test
  async 'it should not publish Loading:Hide when GetJSON rejects' () {
    const err = new Error('FOO!')
    this.GetJSONStub.rejects(err)
    await Navigation.LoadData()
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:HIDE')).to.equal(false)
  }

  @test
  async 'it should publish Loading:Error when GetJSON rejects' () {
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

  before () {
    super.before()
    this.consoleLog = sinon.stub(global.window.console, 'log')
    this.LoadDataStub = sinon.stub(Navigation, 'LoadData')
    this.LoadDataStub.resolves()
    this.NavigateToStub = sinon.stub(Navigation, 'NavigateTo')
    this.PostJSONStub = sinon.stub(Net, 'PostJSON')
    this.PostJSONStub.resolves({})
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

  after () {
    this.PostJSONStub.restore()
    this.NavigateToStub.restore()
    this.LoadDataStub.restore()
    this.consoleLog.restore()
    super.after()
  }

  @test
  'it should set path of current data on Init' () {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz'
    })
    Navigation.Init()
    expect(TestNavigation.current.path).to.equal('/foo/bar/baz')
  }

  @test
  'it should execute LoadData with defaults' () {
    Navigation.Init()
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([])
  }

  @test
  'it should subscribe to "Navigate:Load"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:LOAD')
    expect(PubSub.subscribers['NAVIGATE:LOAD']).to.have.length(1)
  }

  @test
  'Navigate:Load handler should set path when called with string' () {
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
  'Navigate:Load handler should clear current when called with string' () {
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
  'Navigate:Load handler should set current when called with NoMenuPath' () {
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
  'Navigate:Load handler should call LoadData with defaults' () {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler('a string')
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([])
  }

  @test
  'it should subscribe to "Navigate:Reload"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:RELOAD')
    expect(PubSub.subscribers['NAVIGATE:RELOAD']).to.have.length(1)
  }

  @test
  'Navigate:Reload handler should call LoadData with defaults' () {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    const handler = PubSub.subscribers['NAVIGATE:RELOAD']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler('a string')
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([])
  }

  @test
  'it should register popstate listener that sets current when triggered' () {
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
  'it should register popstate listener that calls LoadData with no history flag set' () {
    Navigation.Init()
    this.LoadDataStub.resetHistory()
    const popStateEvent = new this.dom.window.PopStateEvent('popstate', { state: {} })
    this.dom.window.dispatchEvent(popStateEvent)
    expect(this.LoadDataStub.callCount).to.equal(1)
    expect(this.LoadDataStub.firstCall.args).to.deep.equal([true])
  }

  @test
  'it should subscribe to "Navigate:Data"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:DATA')
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  }

  @test
  'Navigate:Data handler should log first argument' () {
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
  'it should subscribe to "Menu:Show"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('MENU:SHOW')
    expect(PubSub.subscribers['MENU:SHOW']).to.have.length(1)
  }

  @test
  'Menu:Show handler should remove hidden class to main menu' () {
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
  'it should subscribe to "Menu:Hide"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('MENU:HIDE')
    expect(PubSub.subscribers['MENU:HIDE']).to.have.length(1)
  }

  @test
  'Menu:Hide handler should add hidden class to main menu' () {
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
  '#mainMenu Click handler ignores click not targeting #mainMenu' () {
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
  '#mainMenu Click handler ignores click with empty pictures list' () {
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
  '#mainMenu Click handler ignores click with missing pictures list' () {
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
  '#mainMenu Click handler hides menu for direct click with pictures' () {
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
  'menuButton Click handler showsmenu' () {
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
  'it should subscribe to "Action:Execute:PreviousFolder"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:PREVIOUSFOLDER')
    expect(PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']).to.have.length(1)
  }

  @test
  'Action:Execute:PreviousFolder handler should NavigateTo previousFolder' () {
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
  'Action:Execute:PreviousFolder handler should NavigateTo undefined previousFolder when node missing' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.prev = undefined
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'PreviousFolder')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:NextFolder"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:NEXTFOLDER')
    expect(PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']).to.have.length(1)
  }

  @test
  'Action:Execute:NextFolder handler should NavigateTo nextFolder' () {
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
  'Action:Execute:NextFolder handler should NavigateTo undefined nextFolder when node missing' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.next = undefined
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'NextFolder')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:ParentFolder"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:PARENTFOLDER')
    expect(PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']).to.have.length(1)
  }

  @test
  'Action:Execute:ParentFolder handler should NavigateTo parentFolder' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.parent = '/foo/bar/baz'
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'ParentFolder')).to.equal(true)
  }

  @test
  'Action:Execute:ParentFolder handler should NavigateTo undefined parentFolder when node missing' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.parent = undefined
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'ParentFolder')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Gamepad:Y"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:Y')
    expect(PubSub.subscribers['ACTION:GAMEPAD:Y']).to.have.length(1)
  }

  @test
  'Action:Gamepad:Y handler should NavigateTo parentFolder' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:GAMEPAD:Y']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.parent = '/foo/bar/baz'
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith('/foo/bar/baz', 'ParentFolder')).to.equal(true)
  }

  @test
  'Action:Gamepad:Y handler should NavigateTo undefined parentFolder when node missing' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:GAMEPAD:Y']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.parent = undefined
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'ParentFolder')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Gamepad:A"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:A')
    expect(PubSub.subscribers['ACTION:GAMEPAD:A']).to.have.length(1)
  }

  @test
  'Action:Gamepad:A handler should NavigateTo First Unfinished' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:GAMEPAD:A']?.pop()
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
  'Action:Gamepad:A handler should NavigateTo First Unfinished with some finished' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:GAMEPAD:A']?.pop()
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
  'Action:Gamepad:A handler should NavigateTo First Unfinished with all finished' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:GAMEPAD:A']?.pop()
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
  'Action:Gamepad:A handler should NavigateTo First Unfinished with no children' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:GAMEPAD:A']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.children = []
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'FirstUnfinished')).to.equal(true)
  }

  @test
  'Action:Gamepad:A handler should NavigateTo First Unfinished with undefined children' () {
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:GAMEPAD:A']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    TestNavigation.current.children = undefined
    handler(undefined)
    expect(this.NavigateToStub.callCount).to.equal(1)
    expect(this.NavigateToStub.calledWith(undefined, 'FirstUnfinished')).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:ShowMenu"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:SHOWMENU')
    expect(PubSub.subscribers['ACTION:EXECUTE:SHOWMENU']).to.have.length(1)
  }

  @test
  'Action:Execute:ShowMenu shoud publish Menu:Show' () {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:SHOW'] = [spy]
    const handler = PubSub.subscribers['ACTION:EXECUTE:SHOWMENU']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Execute:HideMenu"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:HIDEMENU')
    expect(PubSub.subscribers['ACTION:EXECUTE:HIDEMENU']).to.have.length(1)
  }

  @test
  'Action:Execute:HideMenu shoud publish Menu:Hide' () {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['MENU:HIDE'] = [spy]
    const handler = PubSub.subscribers['ACTION:EXECUTE:HIDEMENU']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Execute:MarkAllSeen"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:MARKALLSEEN')
    expect(PubSub.subscribers['ACTION:EXECUTE:MARKALLSEEN']).to.have.length(1)
  }

  @test
  async 'Action:Execute:MarkAllSeen should post to /api/mark/read' () {
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
  async 'Action:Execute:MarkAllSeen should post current path as payload' () {
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
  async 'Action:Execute:MarkAllSeen reloads data after successful post' () {
    Navigation.Init()
    expect(this.PostJSONStub.callCount).to.equal(0)
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
  }

  @test
  async 'Action:Execute:MarkAllSeen reloads data after rejected post' () {
    Navigation.Init()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const err = new Error('oopsies')
    this.PostJSONStub.rejects(err)
    PubSub.Publish('Action:Execute:MarkAllSeen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:MarkAllUnseen"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:MARKALLUNSEEN')
    expect(PubSub.subscribers['ACTION:EXECUTE:MARKALLUNSEEN']).to.have.length(1)
  }

  @test
  async 'Action:Execute:MarkAllUnseen should post to /api/mark/unread' () {
    Navigation.Init()
    expect(this.PostJSONStub.callCount).to.equal(0)
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.PostJSONStub.calledWith('/api/mark/unread')).to.equal(true)
  }

  @test
  async 'Action:Execute:MarkAllUnseen should post current path as payload' () {
    Navigation.Init()
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
  async 'Action:Execute:MarkAllUnseen reloads data after successful post' () {
    Navigation.Init()
    expect(this.PostJSONStub.callCount).to.equal(0)
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
  }

  @test
  async 'Action:Execute:MarkAllUnseen reloads data after rejected post' () {
    Navigation.Init()
    expect(this.PostJSONStub.callCount).to.equal(0)
    const err = new Error('oopsies')
    this.PostJSONStub.rejects(err)
    PubSub.Publish('Action:Execute:MarkAllUnseen')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.LoadDataStub.calledWith(true)).to.equal(true)
  }

  @test
  'it should subscribe to "Action:Execute:Slideshow"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:SLIDESHOW')
    expect(PubSub.subscribers['ACTION:EXECUTE:SLIDESHOW']).to.have.length(1)
  }

  @test
  'Action:Execute:SlideShow shoud alter location' () {
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
  'it should subscribe to "Action:Execute:FullScreen"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:EXECUTE:FULLSCREEN')
    expect(PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']).to.have.length(1)
  }

  @test
  'it should execute requestFullscreen when no fullscreen element exists' () {
    expect(!this.dom.window.document.fullscreenElement).to.equal(true)
    Navigation.Init()
    const handler = PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(this.RequestFullscreenStub.called).to.equal(true)
    expect(this.ExitFullscreenStub.called).to.equal(false)
  }

  @test
  'it should execute exitFullscreen when fullscreen element exists' () {
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
    // @ts-ignore
    delete global.document
    // @ts-ignore
    global.document = newFullscreenElement

    expect(!global.document.fullscreenElement).to.equal(false)
    const handler = PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(this.RequestFullscreenStub.called).to.equal(false)
    expect(this.ExitFullscreenStub.called).to.equal(true)
  }

  @test
  async 'it should publish error when requestFullscreen rejects' () {
    expect(!this.dom.window.document.fullscreenElement).to.equal(true)
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
  async 'it should publish error when exitFullscreen rejects' () {
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
    // @ts-ignore
    delete global.document
    // @ts-ignore
    global.document = newFullscreenElement

    expect(!global.document.fullscreenElement).to.equal(false)
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
  'it should subscribe to "Action:Keypress:<Ctrl>ArrowUp"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:KEYPRESS:<CTRL>ARROWUP')
    expect(PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWUP']).to.have.length(1)
  }

  @test
  'Action:Keypress:<Ctrl>ArrowUp shoud publish Action:Execute:ParentFolder' () {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWUP']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Keypress:<Ctrl>ArrowLeft"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:KEYPRESS:<CTRL>ARROWLEFT')
    expect(PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWLEFT']).to.have.length(1)
  }

  @test
  'Action:Keypress:<Ctrl>ArrowUp shoud publish Action:Execute:PreviousFolder' () {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWLEFT']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Keypress:<Ctrl>ArrowRight"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:KEYPRESS:<CTRL>ARROWRIGHT')
    expect(PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWRIGHT']).to.have.length(1)
  }

  @test
  'Action:Keypress:<Ctrl>ArrowUp shoud publish Action:Execute:NextFolder' () {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:KEYPRESS:<CTRL>ARROWRIGHT']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:Gamepad:Down"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:DOWN')
    expect(PubSub.subscribers['ACTION:GAMEPAD:DOWN']).to.have.length(1)
  }

  @test
  'Action:GamePad:Down shoud publish Action:Execute:PreviousFolder' () {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:GAMEPAD:DOWN']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }

  @test
  'it should subscribe to "Action:GamePad:Up"' () {
    Navigation.Init()
    expect(PubSub.subscribers).to.have.any.keys('ACTION:GAMEPAD:UP')
    expect(PubSub.subscribers['ACTION:GAMEPAD:UP']).to.have.length(1)
  }

  @test
  'Action:GamePad:Up shoud publish Action:Execute:NextFolder' () {
    Navigation.Init()
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER'] = [spy]
    const handler = PubSub.subscribers['ACTION:GAMEPAD:UP']?.pop()
    assert(handler !== undefined, 'handler must have a value')
    handler(undefined)
    expect(spy.callCount).to.equal(1)
  }
}

@suite
export class AppNavigatorNavigateTo extends BaseNavigationTests {
  LoadDataStub: sinon.SinonStub = sinon.stub()
  LoadingErrorStub: sinon.SinonStub = sinon.stub()

  before () {
    super.before()
    this.LoadDataStub = sinon.stub(Navigation, 'LoadData')
    this.LoadingErrorStub = sinon.stub()
    PubSub.subscribers['LOADING:ERROR'] = [this.LoadingErrorStub]
  }

  after () {
    this.LoadDataStub.restore()
    super.after()
  }

  @test
  'it should publish error for undefined path' () {
    Navigation.NavigateTo(undefined, 'TestCase')
    expect(this.LoadDataStub.called).to.equal(false)
    expect(this.LoadingErrorStub.calledWith('Action TestCase has no target')).to.equal(true)
  }

  @test
  'it should publish error for blank path' () {
    Navigation.NavigateTo('', 'TestCase')
    expect(this.LoadDataStub.called).to.equal(false)
    expect(this.LoadingErrorStub.calledWith('Action TestCase has no target')).to.equal(true)
  }

  @test
  'it should set current path' () {
    const path = '/foo/bar/baz/' + Math.random()
    TestNavigation.current.path = '/'
    Navigation.NavigateTo(path, 'TestCase')
    expect(TestNavigation.current.path).to.equal(path)
  }

  @test
  'it should set load data' () {
    const path = '/foo/bar/baz/' + Math.random()
    TestNavigation.current.path = '/'
    Navigation.NavigateTo(path, 'TestCase')
    expect(this.LoadDataStub.called).to.equal(true)
    expect(this.LoadingErrorStub.called).to.equal(false)
  }
}
