'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { Net } from '../../../public/scripts/app/net'
import { PubSub } from '../../../public/scripts/app/pubsub'
import { Bookmarks } from '../../../public/scripts/app/bookmarks'
import assert from 'assert'

const markup = `
html
  head
    title
  body
    div#mainMenu
      div#tabBookmarks
    template#BookmarkFolder 
      div.folder.closed
        div.title placeholder
    template#BookmarkCard
      div.card
        div.card-body
          h5.title placeholder
        button Remove
`

export type SubscriberPromiseFunction = (recievedData: string | undefined, actualTopic?: string) => Promise<void>

class TestBookmarks extends Bookmarks {
  public static get bookmarkCard (): DocumentFragment | undefined {
    return Bookmarks.bookmarkCard
  }

  public static set bookmarkCard (card: DocumentFragment | undefined) {
    Bookmarks.bookmarkCard = card
  }

  public static get bookmarkFolder (): DocumentFragment | undefined {
    return Bookmarks.bookmarkFolder
  }

  public static set bookmarkFolder (folder: DocumentFragment | undefined) {
    Bookmarks.bookmarkFolder = folder
  }

  public static get bookmarksTab (): HTMLElement | null {
    return Bookmarks.bookmarksTab
  }

  public static set bookmarksTab (folder: HTMLElement | null) {
    Bookmarks.bookmarksTab = folder
  }
}

abstract class BaseBookmarksTests extends PubSub {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  document: Document
  dom: JSDOM

  constructor () {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.document = global.document
    this.dom = new JSDOM('', {})
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

    TestBookmarks.bookmarkCard = undefined
    TestBookmarks.bookmarkFolder = undefined
  }

  after (): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

@suite
export class BookmarksInitTests extends BaseBookmarksTests {
  BuildBookmarksSpy: sinon.SinonStub = sinon.stub()
  GetJSONSpy: sinon.SinonStub = sinon.stub()
  PostJSONSpy: sinon.SinonStub = sinon.stub()

  before (): void {
    super.before()
    TestBookmarks.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    this.BuildBookmarksSpy = sinon.stub(Bookmarks, 'buildBookmarks')
    this.GetJSONSpy = sinon.stub(Net, 'GetJSON')
    this.GetJSONSpy.resolves()
    this.PostJSONSpy = sinon.stub(Net, 'PostJSON')
    this.PostJSONSpy.resolves()
  }

  after (): void {
    this.PostJSONSpy.restore()
    this.GetJSONSpy.restore()
    this.BuildBookmarksSpy.restore()
    super.after()
  }

  @test
  'it should set bookmarkCard on init' (): void {
    TestBookmarks.bookmarkCard = undefined
    Bookmarks.Init()
    expect(TestBookmarks.bookmarkCard).to.not.equal(undefined)
  }

  @test
  'it should set bookmarkFolder on init' (): void {
    TestBookmarks.bookmarkFolder = undefined
    Bookmarks.Init()
    expect(TestBookmarks.bookmarkFolder).to.not.equal(undefined)
  }

  @test
  'it should set bookmarksTab on init' (): void {
    TestBookmarks.bookmarksTab = null
    Bookmarks.Init()
    expect(TestBookmarks.bookmarksTab).to.not.equal(null)
  }

  @test
  'it should subscribe to Navigate:Data' (): void {
    Bookmarks.Init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  }

  @test
  'it should build bookmarks on Navigate:Data' (): void {
    Bookmarks.Init()
    const subscriberfn = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(subscriberfn !== undefined)
    expect(this.BuildBookmarksSpy.called).to.equal(false)
    subscriberfn('this is my test data')
    expect(this.BuildBookmarksSpy.calledWith('this is my test data')).to.equal(true)
  }

  @test
  'it should subscribe to Bookmarks:Load' (): void {
    Bookmarks.Init()
    expect(PubSub.subscribers['BOOKMARKS:LOAD']).to.have.length(1)
  }

  @test
  async 'it should use GetJSON when loading Bookmarks' (): Promise<void> {
    Bookmarks.Init()
    const handler = PubSub.subscribers['BOOKMARKS:LOAD']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    await handler(undefined)
    expect(this.GetJSONSpy.calledWith('/api/bookmarks')).to.equal(true)
  }

  @test
  async 'it should build bookmarks with undefined when loading Bookmarks results in blank results' (): Promise<void> {
    Bookmarks.Init()
    const handler = PubSub.subscribers['BOOKMARKS:LOAD']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    await handler(undefined)
    expect(this.BuildBookmarksSpy.firstCall.args[0]).to.deep.equal({
      path: '',
      bookmarks: undefined
    })
  }

  @test
  async 'it should build bookmarks with results of loading Bookmarks' (): Promise<void> {
    Bookmarks.Init()
    const handler = PubSub.subscribers['BOOKMARKS:LOAD']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    this.GetJSONSpy.resolves([true, false, 42, 3.1415926])
    await handler(undefined)
    expect(this.BuildBookmarksSpy.firstCall.args[0]).to.deep.equal({
      path: '',
      bookmarks: [true, false, 42, 3.1415926]
    })
  }

  @test
  'it should subscribe to Bookmarks:Add' (): void {
    Bookmarks.Init()
    expect(PubSub.subscribers['BOOKMARKS:ADD']).to.have.length(1)
  }

  @test
  async 'it should use PostJSON when adding Bookmarks' (): Promise<void> {
    Bookmarks.Init()
    const successSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', successSpy)
    const handler = PubSub.subscribers['BOOKMARKS:ADD']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    await handler('/foo/bar/baz')
    expect(this.PostJSONSpy.calledWith('/api/bookmarks/add')).to.equal(true)
    expect(this.PostJSONSpy.firstCall.args[1]).to.deep.equal({
      path: '/foo/bar/baz'
    })
  }

  @test
  async 'it should use Publish Bookmarks:Load when adding Bookmarks' (): Promise<void> {
    Bookmarks.Init()
    const successSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', successSpy)
    const handler = PubSub.subscribers['BOOKMARKS:ADD']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    const spy = sinon.stub()
    PubSub.subscribers['BOOKMARKS:LOAD'] = [spy]
    await handler('/foo/bar/baz')
    expect(spy.called).to.equal(true)
    expect(spy.calledAfter(this.PostJSONSpy)).to.equal(true)
  }

  @test
  'it should subscribe to Bookmarks:Remove' (): void {
    Bookmarks.Init()
    expect(PubSub.subscribers['BOOKMARKS:REMOVE']).to.have.length(1)
  }

  @test
  async 'it should use PostJSON when removing Bookmarks' (): Promise<void> {
    Bookmarks.Init()
    const successSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', successSpy)
    const handler = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    await handler('/foo/bar/baz')
    expect(this.PostJSONSpy.calledWith('/api/bookmarks/remove')).to.equal(true)
    expect(this.PostJSONSpy.firstCall.args[1]).to.deep.equal({
      path: '/foo/bar/baz'
    })
  }

  @test
  async 'it should use Publish Bookmarks:Load when removing Bookmarks' (): Promise<void> {
    Bookmarks.Init()
    const successSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', successSpy)
    const handler = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    const spy = sinon.stub()
    PubSub.subscribers['BOOKMARKS:LOAD'] = [spy]
    await handler('/foo/bar/baz')
    expect(spy.called).to.equal(true)
    expect(spy.calledAfter(this.PostJSONSpy)).to.equal(true)
  }

  @test
  async 'it shhould tolerate PostJSON rejecting for Bookmarks:Load' (): Promise<void> {
    Bookmarks.Init()
    const handler = PubSub.subscribers['BOOKMARKS:LOAD']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    this.GetJSONSpy.rejects('FOO')
    await handler('/foo/bar/baz')
    await Promise.resolve()
    expect(this.BuildBookmarksSpy.called).to.equal(false)
  }

  @test
  async 'it shhould tolerate PostJSON rejecting for Bookmarks:Add' (): Promise<void> {
    Bookmarks.Init()
    const successSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', successSpy)
    const loadSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', loadSpy)
    const handler = PubSub.subscribers['BOOKMARKS:ADD']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    this.PostJSONSpy.rejects('FOO')
    await handler('/foo/bar/baz')
    await Promise.resolve()
    expect(successSpy.called).to.equal(false)
    expect(loadSpy.called).to.equal(false)
  }

  @test
  async 'it shhould tolerate PostJSON rejecting for Bookmarks:Remove' (): Promise<void> {
    Bookmarks.Init()
    const successSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', successSpy)
    const loadSpy = sinon.stub()
    PubSub.Subscribe('Loading:Success', loadSpy)
    const handler = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop() as SubscriberPromiseFunction | undefined
    assert(handler !== undefined, 'Handler must be found to have valid test')
    this.PostJSONSpy.rejects('FOO')
    await handler('/foo/bar/baz')
    await Promise.resolve()
    expect(successSpy.called).to.equal(false)
    expect(loadSpy.called).to.equal(false)
  }
}

@suite
export class BookmarksBuildCardTests extends BaseBookmarksTests {
  BookmarksRemoveSpy: sinon.SinonStub = sinon.stub()
  NavigateLoadSpy: sinon.SinonStub = sinon.stub()
  PostJSONSpy: sinon.SinonStub = sinon.stub()

  before (): void {
    super.before()
    TestBookmarks.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    this.BookmarksRemoveSpy = sinon.stub()
    PubSub.subscribers['BOOKMARKS:REMOVE'] = [this.BookmarksRemoveSpy]
    this.NavigateLoadSpy = sinon.stub()
    PubSub.subscribers['NAVIGATE:LOAD'] = [this.NavigateLoadSpy]
    this.PostJSONSpy = sinon.stub(Net, 'PostJSON')
    this.PostJSONSpy.resolves()
  }

  after (): void {
    this.PostJSONSpy.restore()
    super.after()
  }

  @test
  'it should return null if card template is missing' (): void {
    TestBookmarks.bookmarkCard = undefined
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar'
    })
    expect(result).to.equal(null)
  }

  @test
  'it should return HTMLElement if card template exist' (): void {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar'
    })
    expect(result).to.be.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should set title in result card' (): void {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar'
    })
    const elem = result?.querySelector('.title')
    expect(elem?.innerHTML).to.equal('foo')
  }

  @test
  'it should set background image to bookmark in result card' (): void {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/foo/bar.png',
      folder: 'bar'
    })
    const style = result?.style.backgroundImage
    expect(style).to.equal('url(/images/preview/foo/bar.png-image.webp)')
  }

  @test
  'it should strip leading folder path from title in result card' (): void {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar'
    })
    const elem = result?.querySelector('.title')
    expect(elem?.innerHTML).to.equal('foo')
  }

  @test
  'it should publish Bookmarks:Remove on button click' (): void {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar'
    })

    const spy = sinon.stub()
    PubSub.Subscribe('Bookmarks:Remove', spy)

    const evt = new this.dom.window.MouseEvent('click')
    const button = result?.querySelector('button')
    button?.dispatchEvent(evt)

    expect(spy.calledWith('/path/to/foo/folder/foo')).to.equal(true)
  }

  @test
  async 'it should navigate latest on bookmark click' (): Promise<void> {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar'
    })

    this.PostJSONSpy.reset()
    const waiter = Promise.resolve()
    this.PostJSONSpy.callsFake(async () => { await waiter })

    const evt = new this.dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)

    await waiter

    expect(this.PostJSONSpy.calledWith('/api/navigate/latest')).to.equal(true)
    expect(this.PostJSONSpy.firstCall.args[1]).to.deep.equal({ path: '/path/to/foo/folder/foo', modCount: -1 })
  }

  @test
  async 'it should navigate load on bookmark click' (): Promise<void> {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: '/path/to/foo/folder'
    })

    this.PostJSONSpy.reset()
    const waiter = Promise.resolve()
    this.PostJSONSpy.callsFake(async () => {
      await waiter
    })

    const evt = new this.dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)

    await waiter
    await Promise.resolve()

    expect(this.NavigateLoadSpy.calledAfter(this.PostJSONSpy)).to.equal(true)
    expect(this.NavigateLoadSpy.called).to.equal(true)
    expect(this.NavigateLoadSpy.firstCall.args[0]).to.deep.equal({
      path: '/path/to/foo/folder',
      noMenu: true
    })
  }

  @test
  async 'it should not Navigate:Load when PostJSON rejects on bookmark click' (): Promise<void> {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: '/path/to/foo/folder'
    })

    const spy = sinon.stub()
    PubSub.Subscribe('Navigate:Load', spy)

    this.PostJSONSpy.reset()
    const waiter = Promise.resolve()
    this.PostJSONSpy.callsFake(async () => {
      await waiter.then(async () => await Promise.reject(new Error('FOO!')))
    })

    const evt = new this.dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)

    await waiter

    expect(spy.called).to.equal(false)
  }
}

@suite
export class BookmarksGetFolderTests extends BaseBookmarksTests {
  before (): void {
    super.before()
    TestBookmarks.bookmarkFolder = this.dom.window.document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    TestBookmarks.bookmarksTab = this.dom.window.document.querySelector<HTMLElement>('#tabBookmarks')
    Bookmarks.BookmarkFolders = []
  }

  after (): void {
    TestBookmarks.bookmarkFolder = undefined
    TestBookmarks.bookmarksTab = null
    super.after()
  }

  @test
  'it should return an HTMLElement' (): void {
    const result = Bookmarks.GetFolder('', {
      name: '',
      path: '/foo/bar.jpg',
      bookmarks: []
    })
    expect(result).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should add folder to folder list on creation' (): void {
    expect(Bookmarks.BookmarkFolders).to.have.length(0)
    const result = Bookmarks.GetFolder('', {
      name: '/foo',
      path: '/foo/bar.jpg',
      bookmarks: []
    })
    expect(Bookmarks.BookmarkFolders).to.have.length(1)
    const folder = Bookmarks.BookmarkFolders.pop()
    assert(folder !== undefined, 'Folder should exist')
    expect(folder.name).to.equal('/foo')
    expect(result).to.equal(folder.element)
  }

  @test
  'it should return existing folder element for matching name' (): void {
    const element = this.dom.window.document.createElement('div')
    Bookmarks.BookmarkFolders.push({
      name: '/foo/bar/baz/',
      element
    })
    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/',
      bookmarks: []
    })
    expect(result).to.equal(element)
  }

  @test
  'it should return null for folder when template is missing' (): void {
    TestBookmarks.bookmarkFolder = undefined

    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/quux.png',
      bookmarks: []
    })
    expect(result).to.equal(null)
  }

  @test
  'it should set data attribute for folderPath' (): void {
    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/',
      bookmarks: []
    })
    const value = result?.getAttribute('data-folderPath')
    expect(value).to.equal('/foo/bar/baz/')
  }

  @test
  'it should set title' (): void {
    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/quux.png',
      bookmarks: []
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title?.innerText).to.equal('/foo/bar/baz')
  }

  @test
  'it should uridecode title' (): void {
    const result = Bookmarks.GetFolder('', {
      name: '%7C',
      path: '',
      bookmarks: []
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title?.innerText).to.equal('|')
  }

  @test
  'it should not create title if element is missing from template' (): void {
    TestBookmarks.bookmarkFolder?.querySelector('.title')?.remove()
    const result = Bookmarks.GetFolder('', {
      name: '%7C',
      path: '',
      bookmarks: []
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title).to.equal(null)
  }

  @test
  'it should not add the closed class with matching path' (): void {
    const result = Bookmarks.GetFolder('/bar', {
      name: '/bar',
      path: '/bar/baz.png',
      bookmarks: []
    })
    expect(result?.classList.contains('clsoed')).to.equal(false)
  }

  @test
  'it should add the closed class with non matching path' (): void {
    const result = Bookmarks.GetFolder('/foo', {
      name: '/bar',
      path: '/bar/baz.png',
      bookmarks: []
    })
    expect(result?.classList.contains('closed')).to.equal(true)
  }

  @test
  'it should have on click handler to open self' (): void {
    const result = Bookmarks.GetFolder('/foo', {
      name: '',
      path: '/bar/baz.png',
      bookmarks: []
    })
    const folder = TestBookmarks.BookmarkFolders[0]
    assert(folder !== undefined, 'must have folder to be valid test')
    const title = result?.querySelector<HTMLElement>('.title')
    assert(title !== null && title !== undefined, 'must get a result to issue event to')
    const evt = new this.dom.window.MouseEvent('click')
    title.dispatchEvent(evt)
    expect(folder.element.classList.contains('closed')).to.equal(false)
  }

  @test
  'it should have on click handler to close others' (): void {
    for (let i = 1; i <= 50; i++) {
      Bookmarks.GetFolder('/foo', {
        name: `/bar${i}`,
        path: `/bar${i}/baz${i}.png`,
        bookmarks: []
      })
    }
    const folder = TestBookmarks.BookmarkFolders[25]
    assert(folder !== undefined, 'must have folder to be valid test')
    const title = folder.element.querySelector<HTMLElement>('.title')
    assert(title !== null, 'must get a result to issue event to')
    const evt = new this.dom.window.MouseEvent('click')
    title.dispatchEvent(evt)
    for (let i = 0; i < TestBookmarks.BookmarkFolders.length; i++) {
      expect(TestBookmarks.BookmarkFolders[i]?.element.classList.contains('closed')).to.equal(i !== 25)
    }
  }
}

@suite
export class BookmarksBuildBookmarksTests extends BaseBookmarksTests {
  GetFolderSpy = sinon.stub()
  BuildBookmarkSpy = sinon.stub()
  before (): void {
    super.before()
    TestBookmarks.bookmarkCard = this.document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    TestBookmarks.bookmarkFolder = this.document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    TestBookmarks.bookmarksTab = this.document.querySelector<HTMLElement>('#tabBookmarks')

    this.GetFolderSpy = sinon.stub(Bookmarks, 'GetFolder')
    this.BuildBookmarkSpy = sinon.stub(Bookmarks, 'BuildBookmark')
  }

  after (): void {
    this.BuildBookmarkSpy.restore()
    this.GetFolderSpy.restore()
    super.after()
  }

  @test
  'it should bail when bookmarksTab is missing' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    TestBookmarks.bookmarksTab = null
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.called).to.equal(false)
    expect(this.BuildBookmarkSpy.called).to.equal(false)
  }

  @test
  'it should bail when bookmarkCard is missing' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    TestBookmarks.bookmarkCard = undefined
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.called).to.equal(false)
    expect(this.BuildBookmarkSpy.called).to.equal(false)
  }

  @test
  'it should bail when bookmarkFolder is missing' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    TestBookmarks.bookmarkFolder = undefined
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.called).to.equal(false)
    expect(this.BuildBookmarkSpy.called).to.equal(false)
  }

  @test
  'it should use the current path when no open details exist' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.firstCall.args[0]).to.equal('/')
  }

  @test
  'it should use the current path when open details with no path exists' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    const element = this.document.createElement('div')
    element.classList.add('folder')
    TestBookmarks.bookmarksTab?.appendChild(element)
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.firstCall.args[0]).to.equal('/')
  }

  @test
  'it should use the openPath fron open details when path exists' (): void {
    const data = {
      path: '/foo/bar/baz/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    const element = this.document.createElement('div')
    element.classList.add('folder')
    element.setAttribute('data-folderPath', '/foo/bar/baz')
    TestBookmarks.bookmarksTab?.appendChild(element)
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.firstCall.args[0]).to.equal('/foo/bar/baz')
  }

  @test
  'it should remove existing details from bookmark tab' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    for (let i = 1; i <= 25; i++) {
      const element = this.document.createElement('div.folder')
      if (i === 12) {
        element.setAttribute('open', '')
      }
      element.setAttribute('data-folderPath', '/foo/bar/baz' + i)
      TestBookmarks.bookmarksTab?.appendChild(element)
    }
    Bookmarks.buildBookmarks(data)
    expect(TestBookmarks.bookmarksTab?.querySelectorAll('div.folder')).to.have.length(0)
  }

  @test
  'it should call GetFolder to retrieve folder for bookmarks' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
  }

  @test
  'it should not call BuildBookmark if GetFolder fails' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
    expect(this.BuildBookmarkSpy.called).to.equal(false)
  }

  @test
  'it should call BuildBookmark when GetFolder succeeds' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    const folder = this.document.createElement('div')
    this.GetFolderSpy.returns(folder)
    Bookmarks.buildBookmarks(data)
    expect(this.GetFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
    expect(this.BuildBookmarkSpy.calledWith(data.bookmarks[0]?.bookmarks[0])).to.equal(true)
  }

  @test
  'it should not appendChild when BuildBookmark fails' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    const folder = this.document.createElement('details')
    this.GetFolderSpy.returns(folder)
    const spy = sinon.stub(folder, 'appendChild')
    Bookmarks.buildBookmarks(data)
    expect(spy.called).to.equal(false)
  }

  @test
  'it should appendChild when BuildBookmark succeeds' (): void {
    const data = {
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    }
    const folder = this.document.createElement('details')
    this.GetFolderSpy.returns(folder)
    const spy = sinon.stub(folder, 'appendChild')
    const card = this.document.createElement('div')
    this.BuildBookmarkSpy.returns(card)
    Bookmarks.buildBookmarks(data)
    expect(spy.calledWith(card)).to.equal(true)
  }

  @test
  'it should sort BookmarkFolders' (): void {
    this.GetFolderSpy.callsFake(() => {
      Bookmarks.BookmarkFolders = [
        {
          name: 'Z',
          element: this.document.createElement('details')
        },
        {
          name: 'M',
          element: this.document.createElement('details')
        },
        {
          name: 'A',
          element: this.document.createElement('details')
        },
        {
          name: 'M',
          element: this.document.createElement('details')
        }
      ]
    })
    Bookmarks.buildBookmarks({
      path: '/',
      bookmarks: [
        {
          path: '/',
          name: '',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    })
    expect(Bookmarks.BookmarkFolders).to.have.length(4)
    expect(Bookmarks.BookmarkFolders[0]?.name).to.equal('A')
    expect(Bookmarks.BookmarkFolders[1]?.name).to.equal('M')
    expect(Bookmarks.BookmarkFolders[2]?.name).to.equal('M')
    expect(Bookmarks.BookmarkFolders[3]?.name).to.equal('Z')
  }

  @test
  'it should add elements from BookmarkFolders' (): void {
    this.GetFolderSpy.callsFake(() => {
      Bookmarks.BookmarkFolders = []
      for (let i = 1; i <= 100; i++) {
        Bookmarks.BookmarkFolders.push({
          name: 'Z' + (101 - i),
          element: this.document.createElement('details')
        })
      }
    })
    assert(TestBookmarks.bookmarksTab !== null, 'tab must exist')
    const appendChildSpy = sinon.stub(TestBookmarks.bookmarksTab, 'appendChild')
    Bookmarks.buildBookmarks({
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [{
            name: '',
            path: '/foo/bar.png',
            folder: '/foo'
          }]
        }
      ]
    })
    expect(appendChildSpy.callCount).to.equal(100)
    for (const folder of Bookmarks.BookmarkFolders) {
      expect(appendChildSpy.calledWith(folder.element)).to.equal(true)
    }
  }
}
