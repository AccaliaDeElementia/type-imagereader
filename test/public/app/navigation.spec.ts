'use sanity'

import { expect } from 'chai'
import { test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Navigation } from '../../../public/scripts/app/navigation'
import { Net } from '../../../public/scripts/app/net'
import { Cast } from '../../testutils/TypeGuards'

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

abstract class BaseNavigationTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  document: Document
  dom: JSDOM
  tabSelectedSpy: sinon.SinonStub

  constructor() {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.document = global.document
    this.dom = new JSDOM('', {})
    this.tabSelectedSpy = sinon.stub().resolves()
  }

  before(): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.document = this.dom.window.document
    this.existingWindow = global.window
    global.window = Cast<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    global.document = this.dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []
    this.tabSelectedSpy.resolves()
    PubSub.Subscribe('Tab:Selected', this.tabSelectedSpy)
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
    this.tabSelectedSpy.reset()
  }
}

export class AppNavigationBaseUrlTests extends BaseNavigationTests {
  @test
  'it should return the correct protocol for http site'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/',
    })
    expect(Navigation.GetBaseUrl()).to.equal('http://type-imagereader.example.com/')
  }

  @test
  'it should return the correct protocol for https site'(): void {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com/',
    })
    expect(Navigation.GetBaseUrl()).to.equal('https://type-imagereader.example.com/')
  }

  @test
  'it should return the correct port when using non standard port'(): void {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com:2999/',
    })
    expect(Navigation.GetBaseUrl()).to.equal('https://type-imagereader.example.com:2999/')
  }

  @test
  'it should return the correct path'(): void {
    this.dom.reconfigure({
      url: 'https://type-imagereader.example.com/show/foo/bar/baz?quux',
    })
    expect(Navigation.GetBaseUrl()).to.equal('https://type-imagereader.example.com/show')
  }
}

export class AppNavigationFolderPathTests extends BaseNavigationTests {
  @test
  'it should return the default path for no folder path'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com',
    })
    expect(Navigation.GetFolderPath()).to.equal('/')
  }

  @test
  'it should return the default path for blank folder path'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/',
    })
    expect(Navigation.GetFolderPath()).to.equal('/')
  }

  @test
  'it should return the default path for base folder path'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show',
    })
    expect(Navigation.GetFolderPath()).to.equal('/')
  }

  @test
  'it should return the default path for base folder path with trailing slash'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/',
    })
    expect(Navigation.GetFolderPath()).to.equal('/')
  }

  @test
  'it should return the correct path for deep folder path'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    expect(Navigation.GetFolderPath()).to.equal('/foo/bar/baz')
  }
}

export class AppNavigationIsMenuActiveTests extends BaseNavigationTests {
  @test
  'it should return true for missing menu'(): void {
    this.document.querySelector('#mainMenu')?.remove()
    expect(Navigation.IsMenuActive()).to.equal(true)
  }

  @test
  'it should return true for non hidden menu'(): void {
    expect(Navigation.IsMenuActive()).to.equal(true)
  }

  @test
  'it should return false for hidden menu'(): void {
    this.document.querySelector('#mainMenu')?.classList.add('hidden')
    expect(Navigation.IsMenuActive()).to.equal(false)
  }
}

export class AppNavigationIsSuppressMenuTests extends BaseNavigationTests {
  @test
  'it should return true for valueless noMenu flag'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/?noMenu',
    })
    expect(Navigation.IsSuppressMenu()).to.equal(true)
  }

  @test
  'it should return true for noMenu flag with value'(): void {
    const values = ['true', '1', 'noMenu', 'false', '0']
    for (const value of values) {
      this.dom.reconfigure({
        url: 'http://type-imagereader.example.com/?noMenu=' + value,
      })
      expect(Navigation.IsSuppressMenu()).to.equal(true)
    }
  }

  @test
  'it should return false for missing NoMenu'(): void {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/?',
    })
    expect(Navigation.IsSuppressMenu()).to.equal(false)
  }
}

export class AppnavigationLoadDataTests extends BaseNavigationTests {
  GetJSONStub: sinon.SinonStub = sinon.stub()
  PushStateStub: sinon.SinonStub = sinon.stub()
  PublishSpy: sinon.SinonStub = sinon.stub()

  before(): void {
    super.before()
    Navigation.current = {
      path: '/foo/bar/baz',
      name: '',
      parent: '',
    }
    this.GetJSONStub = sinon.stub(Net, 'GetJSON')
    this.GetJSONStub.resolves(Navigation.current)
    this.PushStateStub = sinon.stub(this.dom.window.history, 'pushState')
    this.PublishSpy = sinon.stub().resolves()
    PubSub.Subscribe('Loading:Show', this.PublishSpy)
    PubSub.Subscribe('Loading:Hide', this.PublishSpy)
    PubSub.Subscribe('Loading:Error', this.PublishSpy)
    PubSub.Subscribe('Navigate:Data', this.PublishSpy)
  }

  after(): void {
    this.PushStateStub.restore()
    this.GetJSONStub.restore()
    super.after()
  }

  @test
  async 'it should publish Loading:Show'(): Promise<void> {
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:SHOW')).to.equal(true)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:ERROR')).to.equal(false)
  }

  @test
  async 'it should call GetJSON with expected Path'(): Promise<void> {
    await Navigation.LoadData()
    expect(this.GetJSONStub.calledWith('/api/listing/foo/bar/baz')).to.equal(true)
  }

  @test
  async 'it should set noMenu based on call GetJSON with expected Path'(): Promise<void> {
    await Navigation.LoadData()
    expect(this.GetJSONStub.calledWith('/api/listing/foo/bar/baz')).to.equal(true)
  }

  @test
  async 'it should set noMenu false when not menu suppressed'(): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    await Navigation.LoadData()
    expect(Navigation.current.noMenu).to.equal(false)
  }

  @test
  async 'it should set noMenu true when menu suppressed'(): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz?noMenu',
    })
    await Navigation.LoadData()
    expect(Navigation.current.noMenu).to.equal(true)
  }

  @test
  async 'it should set page title to data name when set'(): Promise<void> {
    this.GetJSONStub.returns({
      name: 'Bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('Bazz')
  }

  @test
  async 'it should set navbar brand to data name when set'(): Promise<void> {
    this.GetJSONStub.returns({
      name: 'Bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('Bazz')
  }

  @test
  async 'it should set page title to data path when name is null'(): Promise<void> {
    this.GetJSONStub.returns({
      name: null,
      path: '/foo/bar/bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is null'(): Promise<void> {
    this.GetJSONStub.returns({
      name: null,
      path: '/foo/bar/bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set page title to data path when name is blank'(): Promise<void> {
    this.GetJSONStub.returns({
      name: '',
      path: '/foo/bar/bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is blank'(): Promise<void> {
    this.GetJSONStub.returns({
      name: '',
      path: '/foo/bar/bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set page title to data path when name is missing'(): Promise<void> {
    this.GetJSONStub.returns({
      path: '/foo/bar/bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('head title')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should set navbar brand to data path when name is missing'(): Promise<void> {
    this.GetJSONStub.returns({
      path: '/foo/bar/bazz',
    })
    await Navigation.LoadData()
    expect(this.document.querySelector('a.navbar-brand')?.innerHTML).to.equal('/foo/bar/bazz')
  }

  @test
  async 'it should push history when no history flag is not specified'(): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    await Navigation.LoadData()
    expect(this.PushStateStub.callCount).to.equal(1)
    expect(this.PushStateStub.firstCall.args).to.deep.equal([
      {},
      '',
      'http://type-imagereader.example.com/show/foo/bar/baz',
    ])
  }

  @test
  async 'it should push history when no history flag is false'(): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    await Navigation.LoadData(false)
    expect(this.PushStateStub.callCount).to.equal(1)
    expect(this.PushStateStub.firstCall.args).to.deep.equal([
      {},
      '',
      'http://type-imagereader.example.com/show/foo/bar/baz',
    ])
  }

  @test
  async 'it should not push history when no history flag is true'(): Promise<void> {
    this.dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    await Navigation.LoadData(true)
    expect(this.PushStateStub.callCount).to.equal(0)
  }

  @test
  async 'it should publish Loading:Hide'(): Promise<void> {
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:HIDE')).to.equal(true)
  }

  @test
  async 'it should publish Navigate:Data'(): Promise<void> {
    await Navigation.LoadData()
    expect(this.PublishSpy.callCount).to.equal(3)
    expect(this.PublishSpy.calledWith(Navigation.current, 'NAVIGATE:DATA')).to.equal(true)
  }

  @test
  async 'it should not publish Loading:Error on success'(): Promise<void> {
    await Navigation.LoadData()

    expect(
      this.PublishSpy.getCalls()
        .map((c) => Cast<string>(c.args[1]))
        .filter((signal) => signal === 'LOADING:ERROR'),
    ).to.deep.equal([])
  }

  @test
  async 'it should not publish Loading:Hide when GetJSON rejects'(): Promise<void> {
    const err = new Error('FOO!')
    this.GetJSONStub.rejects(err)
    await Navigation.LoadData()
    expect(this.PublishSpy.calledWith(undefined, 'LOADING:HIDE')).to.equal(false)
  }

  @test
  async 'it should publish Loading:Error when GetJSON rejects'(): Promise<void> {
    const err = new Error('FOO!')
    this.GetJSONStub.rejects(err)
    await Navigation.LoadData()
    expect(this.PublishSpy.calledWith(err, 'LOADING:ERROR')).to.equal(true)
  }
}

export class AppNavigatorNavigateTo extends BaseNavigationTests {
  LoadDataStub: sinon.SinonStub = sinon.stub()
  LoadingErrorStub: sinon.SinonStub = sinon.stub()

  before(): void {
    super.before()
    this.LoadDataStub = sinon.stub(Navigation, 'LoadData').resolves(undefined)
    this.LoadingErrorStub = sinon.stub().resolves()
    PubSub.subscribers['LOADING:ERROR'] = [this.LoadingErrorStub]
  }

  after(): void {
    this.LoadDataStub.restore()
    super.after()
  }

  @test
  'it should publish error for undefined path'(): void {
    Navigation.NavigateTo(undefined, 'TestCase')
    expect(this.LoadDataStub.called).to.equal(false)
    expect(this.LoadingErrorStub.calledWith('Action TestCase has no target')).to.equal(true)
  }

  @test
  'it should publish error for blank path'(): void {
    Navigation.NavigateTo('', 'TestCase')
    expect(this.LoadDataStub.called).to.equal(false)
    expect(this.LoadingErrorStub.calledWith('Action TestCase has no target')).to.equal(true)
  }

  @test
  'it should tolerate LoadData rejecting'(): void {
    const path = '/foo/bar/baz/' + Math.random()
    Navigation.current.path = '/'
    this.LoadDataStub.rejects(new Error('FOO!'))
    Navigation.NavigateTo(path, 'TestCase')
    expect(Navigation.current.path).to.equal(path)
  }

  @test
  'it should set current path'(): void {
    const path = '/foo/bar/baz/' + Math.random()
    Navigation.current.path = '/'
    Navigation.NavigateTo(path, 'TestCase')
    expect(Navigation.current.path).to.equal(path)
  }

  @test
  'it should set load data'(): void {
    const path = '/foo/bar/baz/' + Math.random()
    Navigation.current.path = '/'
    Navigation.NavigateTo(path, 'TestCase')
    expect(this.LoadDataStub.called).to.equal(true)
    expect(this.LoadingErrorStub.called).to.equal(false)
  }
}
