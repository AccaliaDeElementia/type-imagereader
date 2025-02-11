'use sanity'

import { promisify } from 'util'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { Net } from '../../../public/scripts/app/net'
import { Publish, PubSub, Subscribe } from '../../../public/scripts/app/pubsub'
import { NavigateTo, Pictures } from '../../../public/scripts/app/pictures'
import type { PageSelector, Picture } from '../../../public/scripts/app/pictures'
import { Loading } from '../../../public/scripts/app/loading'
import { Navigation } from '../../../public/scripts/app/navigation'
import assert from 'assert'

const markup = `
html
  body
    div.selectUnreadAll
      div
        span.all Show All
        span.unread Show Unread
    div#mainMenu
    div#bigImage
      img.hidden
    div.tab-list
      ul
        li
          a(href="#tabImages") Pictures
    div#tabImages
    div#screenText
      div.statusBar.top
        div.left
        div.center
        div.right
      div.statusBar.bottom
        div.left
        div.center
        div.right
    template#ImageCard
      div.card
        div.card-body
          h5 placeholder
    template#PaginatorItem
      li.page-item
        a.page-link(href='#')
          span(aria-hidden='true')
    template#Paginator
      nav.pages
        ul.pagination
`

interface TestVisualViewport {
  scale: number
}

const Delay = async (ms = 10): Promise<void> => {
  await (promisify(cb => { setTimeout(() => { cb(null, null) }, ms)}))()
}

class TestPics extends Pictures {
  public static get pictures (): Picture[] {
    return Pictures.pictures
  }

  public static set pictures (value: Picture[]) {
    Pictures.pictures = value
  }

  public static get current (): Picture | null {
    return Pictures.current
  }

  public static set current (value: Picture | null) {
    Pictures.current = value
  }

  public static get mainImage (): HTMLImageElement | null {
    return Pictures.mainImage
  }

  public static set mainImage (value: HTMLImageElement | null) {
    Pictures.mainImage = value
  }

  public static get imageCard (): Element | null {
    return Pictures.imageCard
  }

  public static get pageSize (): number {
    return Pictures.pageSize
  }

  public static set pageSize (value: number) {
    Pictures.pageSize = value
  }

  public static get modCount (): number {
    return Pictures.modCount
  }

  public static set modCount (value: number) {
    Pictures.modCount = value
  }

  public static get nextPending (): boolean {
    return Pictures.nextPending
  }

  public static set nextPending (value: boolean) {
    Pictures.nextPending = value
  }

  public static get nextLoader (): Promise<void> {
    return Pictures.nextLoader
  }

  public static set nextLoader (value: Promise<void>) {
    Pictures.nextLoader = value
  }

  public static Reset (): void {
    Pictures.pictures = []
    Pictures.current = null
    Pictures.imageCard = null
    Pictures.mainImage = null
    Pictures.pageSize = 32
    Pictures.modCount = -1
    Pictures.nextPending = true
    Pictures.nextLoader = Promise.resolve()
  }

  public static ResetMarkup (): void {
    Pictures.ResetMarkup()
  }

  public static GetPicture (navi: NavigateTo): Picture | undefined {
    return Pictures.GetPicture(navi)
  }

  public static ChangePicture (pic: Picture | undefined): void {
    Pictures.ChangePicture(pic)
  }

  public static get ShowUnreadOnly (): boolean {
    return Pictures.ShowUnreadOnly
  }

  public static set ShowUnreadOnly (value: boolean) {
    Pictures.ShowUnreadOnly = value
  }

  public static UpdateUnreadSelectorSlider (): void {
    Pictures.UpdateUnreadSelectorSlider()
  }
}

abstract class BaseAppPicturesTests extends PubSub {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  document: Document
  dom: JSDOM
  tabSelectedSpy: sinon.SinonStub
  visualViewport: TestVisualViewport | undefined

  constructor () {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.document = global.document
    this.dom = new JSDOM('', {})
    this.tabSelectedSpy = sinon.stub()
    this.visualViewport = undefined
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

    // @ts-expect-error Ignore that visualviewport is read-only
    this.dom.window.visualViewport = this.visualViewport

    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.Subscribe('Tab:Selected', this.tabSelectedSpy)
    this.tabSelectedSpy.reset()

    TestPics.Reset()
    Pictures.Init()
  }

  after (): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

@suite
export class AppPicturesInitTests extends BaseAppPicturesTests {
  loadDataSpy: Sinon.SinonStub = sinon.stub()

  before (): void {
    super.before()
    this.loadDataSpy = sinon.stub(Pictures, 'LoadData')
  }

  after (): void {
    this.loadDataSpy.restore()
    super.after()
  }

  @test
  'sets image defaults' (): void {
    TestPics.Reset()
    Pictures.Init()

    expect(TestPics.current).to.equal(null)
    expect(TestPics.pictures).to.deep.equal([])

    const expectedImage = this.document.querySelector<HTMLElement>('#bigImage img')
    const expectedCard = this.document.querySelector<HTMLTemplateElement>('#ImageCard')
      ?.content.firstElementChild

    expect(expectedImage).to.not.equal(undefined)
    expect(expectedImage).to.not.equal(null)
    expect(TestPics.mainImage).to.equal(expectedImage)

    expect(expectedCard).to.not.equal(undefined)
    expect(expectedCard).to.not.equal(null)
    expect(TestPics.imageCard).to.equal(expectedCard)
  }

  @test
  'registers mainImage:load that publishes Loading:Hide' (): void {
    let hidden = false
    PubSub.Subscribe('Loading:Hide', () => {
      hidden = true
    })
    const image = this.document.querySelector('#bigImage img') as unknown as HTMLElement
    const event = new this.dom.window.Event('load')
    expect(hidden).to.equal(false)
    image.dispatchEvent(event)
    expect(hidden).to.equal(true)
  }

  @test
  'registers mainImage:error that publishes Loading:Error with src' (): void {
    let hidden = false
    PubSub.Subscribe('Loading:Error', () => {
      hidden = true
    })
    const image = this.document.querySelector('#bigImage img') as unknown as HTMLImageElement
    const event = new this.dom.window.Event('error')
    image.src = 'foobar'
    expect(hidden).to.equal(false)
    image.dispatchEvent(event)
    expect(hidden).to.equal(true)
  }

  @test
  'registers mainImage:error that doesn not publishes Loading:Error without src' (): void {
    let hidden = false
    PubSub.Subscribe('Loading:Error', () => {
      hidden = true
    })
    const image = this.document.querySelector('#bigImage img') as unknown as HTMLImageElement
    const event = new this.dom.window.Event('error')
    expect(hidden).to.equal(false)
    image.dispatchEvent(event)
    expect(hidden).to.equal(false)
    image.src = ''
    image.dispatchEvent(event)
    expect(hidden).to.equal(false)
  }

  @test
  'it should subscribe to Navigate:Data with a call to LoadData()' (): void {
    const expected = {
      a: Math.random()
    }
    PubSub.Publish('Navigate:Data', expected)
    expect(this.loadDataSpy.calledWithExactly(expected)).to.equal(true)
  }
}

@suite
export class AppPicturesResetTests extends BaseAppPicturesTests {
  @test
  'locates critical elements' (): void {
    const expectedImage = this.document.querySelector<HTMLElement>('#bigImage img')
    const expectedCard = this.document.querySelector<HTMLTemplateElement>('#ImageCard')
      ?.content.firstElementChild

    TestPics.ResetMarkup()

    expect(expectedImage).to.not.equal(undefined)
    expect(expectedImage).to.not.equal(null)
    expect(TestPics.mainImage).to.equal(expectedImage)

    expect(expectedCard).to.not.equal(undefined)
    expect(expectedCard).to.not.equal(null)
    expect(TestPics.imageCard).to.equal(expectedCard)
  }

  @test
  'allows missing critical elements' (): void {
    this.document.querySelector<HTMLElement>('#bigImage img')?.remove()
    this.document.querySelector<HTMLTemplateElement>('#ImageCard')?.remove()
    TestPics.ResetMarkup()
    expect(TestPics.mainImage).to.equal(null)
    expect(TestPics.imageCard).to.equal(null)
  }

  @test
  'force clears big image source' (): void {
    expect(TestPics.mainImage).to.not.equal(null)
    TestPics.mainImage?.setAttribute('src', 'http://example.com/image.png')
    TestPics.ResetMarkup()
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('')
  }

  @test
  'clears all statusbar text' (): void {
    for (const bar of ['top', 'bottom']) {
      for (const position of ['left', 'center', 'right']) {
        this.document.querySelector(`.statusBar.${bar} .${position}`)?.replaceChildren('foobar')
      }
    }
    for (const bar of ['top', 'bottom']) {
      for (const position of ['left', 'center', 'right']) {
        const text = this.document.querySelector<HTMLElement>(`.statusBar.${bar} .${position}`)?.innerHTML
        expect(text).to.equal('foobar')
      }
    }
    TestPics.ResetMarkup()
    for (const bar of ['top', 'bottom']) {
      for (const position of ['left', 'center', 'right']) {
        const text = this.document.querySelector<HTMLElement>(`.statusBar.${bar} .${position}`)?.innerHTML
        expect(text).to.equal('')
      }
    }
  }

  @test
  'deletes page list from markup' (): void {
    const tab = this.document.querySelector('#tabImages')
    expect(tab).to.not.equal(null)
    for (let i = 0; i < 10; i++) {
      const page = this.document.createElement('div')
      page.classList.add('pages')
      tab?.appendChild(page)
    }
    expect(this.document.querySelectorAll('#tabImages .pages')).to.have.length(10)
    TestPics.ResetMarkup()
    expect(this.document.querySelectorAll('#tabImages .pages')).to.have.length(0)
  }
}

@suite
export class AppPicturesCurrentPageTests extends BaseAppPicturesTests {
  @test
  'returns -1 for no pages' (): void {
    expect(Pictures.CurrentPage).to.equal(-1)
  }

  @test
  'returns -1 for no active pages' (): void {
    const pages = this.document.createElement('div')
    pages.classList.add('pagination')
    for (let i = 1; i <= 10; i++) {
      const page = this.document.createElement('div')
      page.classList.add('page-item')
      pages.appendChild(page)
    }
    this.document.querySelector('body')?.appendChild(pages)
    expect(Pictures.CurrentPage).to.equal(-1)
  }

  @test
  'returns number for active page' (): void {
    const pages = this.document.createElement('div')
    pages.classList.add('pagination')
    const activePage = Math.ceil(Math.random() * 8)
    for (let i = 0; i < 10; i++) {
      const page = this.document.createElement('div')
      page.classList.add('page-item')
      if (i === activePage) {
        page.classList.add('active')
      }
      pages.appendChild(page)
    }
    this.document.querySelector('body')?.appendChild(pages)
    expect(Pictures.CurrentPage).to.equal(activePage)
  }
}

@suite
export class AppPicturesSelectPageTests extends BaseAppPicturesTests {
  activePageLink: HTMLElement | undefined
  activePageElement: HTMLElement | undefined
  activePage = -1
  nextPageLink: HTMLElement | undefined
  nextPageElement: HTMLElement | undefined
  nextPage = 0
  totalpages = 8
  before (): void {
    super.before()
    const tab = this.document.querySelector('#tabImages')
    const pages = this.document.createElement('div')
    pages.classList.add('pagination')
    this.activePage = Math.ceil(Math.random() * this.totalpages)
    do {
      this.nextPage = Math.ceil(Math.random() * this.totalpages)
    } while (this.activePage === this.nextPage)
    for (let i = 0; i < this.totalpages + 2; i++) {
      const pagelink = this.document.createElement('div')
      pagelink.classList.add('page-item')
      if (i === this.activePage) {
        pagelink.classList.add('active')
        this.activePageLink = pagelink
      }
      if (i === this.nextPage) {
        this.nextPageLink = pagelink
      }
      pages.appendChild(pagelink)
      const page = this.document.createElement('div')
      page.classList.add('page')
      if (i !== this.activePage - 1) {
        page.classList.add('hidden')
      } else {
        this.activePageElement = page
      }
      if (i === this.nextPage - 1) {
        this.nextPageElement = page
      }
      tab?.appendChild(page)
    }
    this.document.querySelector('body')?.appendChild(pages)
  }

  @test
  'it does not publish error when called on no pages' (): void {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    this.document.querySelector('.pagination')
      ?.replaceChildren(this.document.createElement('div'))
    Pictures.SelectPage(0)
    Pictures.SelectPage(-1)
    Pictures.SelectPage(1e9)
    expect(publishSpy.called).to.equal(false)
  }

  @test
  'it publishes select of default page when called on no pages' (): void {
    const publishSpy = sinon.stub()
    Subscribe('Pictures:SelectPage', publishSpy)
    this.document.querySelector('.pagination')
      ?.replaceChildren(this.document.createElement('div'))
    Pictures.SelectPage(0)
    expect(publishSpy.callCount).to.equal(1)
    expect(publishSpy.firstCall.args).to.have.lengthOf(2)
    expect(publishSpy.firstCall.args[0]).to.equal('Default Page Selected')
    expect(publishSpy.firstCall.args[1]).to.equal('PICTURES:SELECTPAGE')
  }

  @test
  'Publishes error when called on negative page' (): void {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(-1)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Publishes error when called on zero page' (): void {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(0)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Publishes error when called on huge page' (): void {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(this.totalpages + 1)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Does not publish error on valid page' (): void {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(this.activePage)
    expect(publishSpy.called).to.equal(false)
  }

  @test
  'Removes active class from current active page link when switching' (): void {
    expect(this.activePageLink?.classList.contains('active')).to.equal(true)
    Pictures.SelectPage(this.nextPage)
    expect(this.activePageLink?.classList.contains('active')).to.equal(false)
  }

  @test
  'Adds hidden class to current active page when switching' (): void {
    expect(this.activePageElement?.classList.contains('hidden')).to.equal(false)
    Pictures.SelectPage(this.nextPage)
    expect(this.activePageElement?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'Adds active class to next active page link when switching' (): void {
    expect(this.nextPageLink?.classList.contains('active')).to.equal(false)
    Pictures.SelectPage(this.nextPage)
    expect(this.nextPageLink?.classList.contains('active')).to.equal(true)
  }

  @test
  'Removes hidden class from next active page when switching' (): void {
    expect(this.nextPageElement?.classList.contains('hidden')).to.equal(true)
    Pictures.SelectPage(this.nextPage)
    expect(this.nextPageElement?.classList.contains('hidden')).to.equal(false)
  }

  @test
  'Publishes notification that page has been selected' (): void {
    const spy = sinon.stub()
    PubSub.Subscribe('Pictures:SelectPage', spy)
    Pictures.SelectPage(this.nextPage)
    expect(spy.called).to.equal(true)
  }

  @test
  'Does not publishes notification that page has been selected on error' (): void {
    const spy = sinon.stub()
    PubSub.Subscribe('Pictures:SelectPage', spy)
    Subscribe('Loading:Error', sinon.stub())
    Pictures.SelectPage(this.totalpages + 1)
    expect(spy.called).to.equal(false)
  }
}

@suite
export class AppPicturesMakePictureCardTests extends BaseAppPicturesTests {
  changePictureSpy: Sinon.SinonStub = Sinon.stub()

  before (): void {
    super.before()
    this.changePictureSpy = sinon.stub(Pictures, 'ChangePicture')
  }

  after (): void {
    this.changePictureSpy.restore()
    super.after()
  }

  @test
  'returns a HTMLElement' (): void {
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    })
    expect(card).to.be.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'adds card to input picture' (): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    const card = Pictures.MakePictureCard(pic)
    expect(pic.element).to.equal(card)
  }

  @test
  'sets background image' (): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.getAttribute('data-backgroundImage'))
      .to.equal(`url("/images/preview${pic.path}-image.webp")`)
  }

  @test
  'omits seen class when not seen' (): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.classList.contains('seen')).to.equal(pic.seen)
  }

  @test
  'sets seen class when seen' (): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: true
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.classList.contains('seen')).to.equal(pic.seen)
  }

  @test
  'sets image title' (): void {
    const pic: Picture = {
      name: 'foobar' + Math.random(),
      path: '/foo/bar/baz.jpg',
      seen: true
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.querySelector('h5')?.innerHTML).to.equal(pic.name)
  }

  @test
  'Registers click handler that updates current image' (): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    PubSub.Subscribe('Pictures:Load', () => 0)
    PubSub.Subscribe('Menu:Hide', () => 0)
    expect(TestPics.current).to.equal(null)
    const card = Pictures.MakePictureCard(pic)
    const event = new this.dom.window.MouseEvent('click')
    card.dispatchEvent(event)
    expect(this.changePictureSpy.calledOnceWithExactly(pic)).to.equal(true)
  }

  @test
  'Registers click handler that hides menu' (): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    let executed = false
    PubSub.Subscribe('Pictures:Load', () => 0)
    PubSub.Subscribe('Menu:Hide', () => {
      executed = true
    })
    expect(TestPics.current).to.equal(null)
    const card = Pictures.MakePictureCard(pic)
    const event = new this.dom.window.MouseEvent('click')
    card.dispatchEvent(event)
    expect(executed).to.equal(true)
  }

  @test
  'Registers click handler that publishes Picture:Load' (): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    PubSub.Subscribe('Menu:Hide', () => 0)
    expect(TestPics.current).to.equal(null)
    const card = Pictures.MakePictureCard(pic)
    const event = new this.dom.window.MouseEvent('click')
    card.dispatchEvent(event)
    expect(this.changePictureSpy.called).to.equal(true)
  }
}

@suite
export class AppPicturesMakePicturesPageTests extends BaseAppPicturesTests {
  makePics (count: number): Picture[] {
    const results: Picture[] = []
    for (let i = 1; i <= count; i++) {
      results.push({
        name: `Picture ${i}`,
        path: `/foo/bar/${i}.jpg`,
        seen: false
      })
    }
    return results
  }

  @test
  'Returns a div element' (): void {
    const result = Pictures.MakePicturesPage(0, [])
    expect(result).to.be.an.instanceOf(this.dom.window.HTMLDivElement)
  }

  @test
  'adds page number to all pictures' (): void {
    const pics = this.makePics(20)
    const page = Math.ceil(Math.random() * 9000) + 1000
    Pictures.MakePicturesPage(page, pics)
    expect(pics.every(pic => pic.page === page)).to.equal(true)
  }

  @test
  'creates cards for each picture' (): void {
    const pics = this.makePics(20)
    const results = Pictures.MakePicturesPage(1, pics)
    expect(results.querySelectorAll('div.card').length).to.equal(20)
  }
}

@suite
export class AppPicturesMakePaginatorItemTests extends BaseAppPicturesTests {
  selectPageSpy: Sinon.SinonStub = sinon.stub()
  before (): void {
    super.before()
    this.selectPageSpy = sinon.stub(Pictures, 'SelectPage')
    this.selectPageSpy.returns(undefined)
  }

  after (): void {
    this.selectPageSpy.restore()
    super.after()
  }

  @test
  'it returns an List Item Element' (): void {
    const result = Pictures.MakePaginatorItem('foobar', () => 0)
    expect(result).to.be.an.instanceOf(this.dom.window.HTMLLIElement)
  }

  @test
  'it sets inner span to provided label' (): void {
    const label = `LABEL ${Math.random()}`
    const result = Pictures.MakePaginatorItem(label, () => 0)
    expect(result.querySelector('span')?.innerHTML).to.equal(label)
  }

  @test
  'it adds click handler that calls selector to determine page index' (): void {
    const selector = sinon.stub()
    selector.returns(0)
    const item = Pictures.MakePaginatorItem('label', selector)
    const event = new this.dom.window.MouseEvent('click')
    expect(selector.called).to.equal(false)
    item.dispatchEvent(event)
    expect(selector.called).to.equal(true)
  }

  @test
  'it adds click handler that selects appropriate page' (): void {
    const expected = Math.ceil(Math.random() * 9000) + 1000
    const item = Pictures.MakePaginatorItem('label', () => expected)
    const event = new this.dom.window.MouseEvent('click')
    item.dispatchEvent(event)
    expect(this.selectPageSpy.calledOnceWithExactly(expected)).to.equal(true)
  }
}

@suite
export class AppPicturesMakePaginatorTests extends BaseAppPicturesTests {
  makeItemSpy: Sinon.SinonStub = sinon.stub()
  currentPageSpy: Sinon.SinonStub = sinon.stub()
  pages: { [index: string]: PageSelector } = {}
  before (): void {
    super.before()
    this.makeItemSpy = sinon.stub(Pictures, 'MakePaginatorItem')
    this.makeItemSpy.callsFake((title: string, fn: PageSelector) => {
      this.pages[title] = fn
      return this.dom.window.document.createElement('li')
    })
    this.currentPageSpy = sinon.stub(Pictures, 'CurrentPage')
  }

  after (): void {
    this.makeItemSpy.restore()
    this.currentPageSpy.restore()
    super.after()
  }

  @test
  'it should return null for fewer than two pages' (): void {
    expect(Pictures.MakePaginator(-5)).to.equal(null)
    expect(Pictures.MakePaginator(-1)).to.equal(null)
    expect(Pictures.MakePaginator(0)).to.equal(null)
    expect(Pictures.MakePaginator(1)).to.equal(null)
  }

  @test
  'it should return an HTMLElement for two or more pages' (): void {
    expect(Pictures.MakePaginator(50)).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should include number of pages + 2 child elements' (): void {
    const result = Pictures.MakePaginator(50)
    const domItems = result?.querySelector('.pagination')
    expect(domItems?.children).to.have.length(52)
  }

  @test
  'it should set "Previous Page" selector' (): void {
    Pictures.MakePaginator(50)
    expect(this.pages).to.have.any.keys('«')
    const selector = this.pages['«']
    assert(selector != null, 'Selector must be found')
    const testCases = [
      [25, 24],
      [99, 98],
      [1, 1],
      [-12, 1]
    ]
    for (const [input, expected] of testCases) {
      this.currentPageSpy.get(() => input)
      expect(selector()).to.equal(expected)
    }
  }

  @test
  'it should set "Next Page" selector' (): void {
    Pictures.MakePaginator(50)
    expect(this.pages).to.have.any.keys('»')
    const selector = this.pages['»']
    assert(selector != null, 'Selector must be found')
    const testCases = [
      [25, 26],
      [99, 50],
      [1, 2],
      [49, 50],
      [50, 50]
    ]
    for (const [input, expected] of testCases) {
      this.currentPageSpy.get(() => input)
      expect(selector()).to.equal(expected)
    }
  }

  @test
  'it should set "Fixed Page" selectors' (): void {
    Pictures.MakePaginator(50)
    for (let i = 1; i <= 50; i++) {
      const key = `${i}`
      expect(this.pages).to.have.any.keys(key)
      const selector = this.pages[key]
      assert(selector != null, 'Selector must be found')
      expect(selector()).to.equal(i)
    }
  }
}

@suite
export class AppPicturesMakeTabTests extends BaseAppPicturesTests {
  makePicturesPageSpy: Sinon.SinonStub = sinon.stub()
  makePaginatorSpy: Sinon.SinonStub = sinon.stub()
  tab: HTMLElement | null = null
  before (): void {
    super.before()
    this.makePicturesPageSpy = sinon.stub(Pictures, 'MakePicturesPage')
    this.makePicturesPageSpy.callsFake((pagenum: number, _: Picture[]) => {
      const retval = this.dom.window.document.createElement('div')
      retval.classList.add('page')
      retval.classList.add(`data-page-${pagenum}`)
      return retval
    })
    this.makePaginatorSpy = sinon.stub(Pictures, 'MakePaginator')
    this.makePaginatorSpy.callsFake(() => {
      const retval = this.dom.window.document.createElement('div')
      retval.classList.add('paginator')
      return retval
    })
    TestPics.pictures = Array.from({ length: 32 })
      .map((_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false
      }))
    this.tab = this.dom.window.document.querySelector('#tabImages')
  }

  after (): void {
    this.makePicturesPageSpy.restore()
    this.makePaginatorSpy.restore()
    super.after()
  }

  @test
  'it should add provided page to pictures tab' (): void {
    Pictures.MakeTab()
    expect(this.makePicturesPageSpy.calledWith(1)).to.equal(true)
    expect(this.tab?.querySelector('.page')).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should make pages according to pageSize' (): void {
    TestPics.pageSize = 2
    Pictures.MakeTab()
    expect(this.makePicturesPageSpy.callCount).to.equal(16)
    expect(this.tab?.querySelectorAll('.page')).to.have.length(16)
  }

  @test
  'it should make paginator' (): void {
    Pictures.MakeTab()
    expect(this.makePaginatorSpy.callCount).to.equal(1)
    expect(this.tab?.querySelector('.paginator')).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should omit pagniinator when MakePaginator returns null' (): void {
    this.makePaginatorSpy.returns(null)
    Pictures.MakeTab()
    expect(this.makePaginatorSpy.callCount).to.equal(1)
    expect(this.tab?.querySelector('.paginator')).to.equal(null)
  }
}

@suite
export class AppPicturesLoadCurrentPageImagesTests extends BaseAppPicturesTests {
  tab: HTMLElement | null = null
  before (): void {
    super.before()
    TestPics.pictures = Array.from({ length: 32 })
      .map((_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false
      }))
    Pictures.MakeTab()
    this.tab = this.dom.window.document.querySelector('#tabImages')
  }

  after (): void {
    super.after()
  }

  @test
  'it should add background image to active page(s)' (): void {
    const cards = Array.prototype.slice.apply(this.tab?.querySelectorAll('.page:not(.hidden) .card'))
    expect(cards).to.have.length(32)
    for (const card of cards) {
      expect(card.style.backgroundImage).to.equal('')
    }
    Pictures.LoadCurrentPageImages()
    for (const card of cards) {
      expect(card.style.backgroundImage).to.not.equal('')
    }
  }

  @test
  'it should not add background image to card with blank data attribute' (): void {
    const cards = Array.prototype.slice.apply(this.tab?.querySelectorAll('.page:not(.hidden) .card'))
    expect(cards).to.have.length(32)
    for (const card of cards) {
      card.setAttribute('data-backgroundImage', '')
    }
    Pictures.LoadCurrentPageImages()
    for (const card of cards) {
      expect(card.style.backgroundImage).to.equal('')
    }
  }

  @test
  'it should not add background image to card missing data attribute' (): void {
    const cards = Array.prototype.slice.apply(this.tab?.querySelectorAll('.page:not(.hidden) .card'))
    expect(cards).to.have.length(32)
    for (const card of cards) {
      card.removeAttribute('data-backgroundImage')
    }
    Pictures.LoadCurrentPageImages()
    for (const card of cards) {
      expect(card.style.backgroundImage).to.equal('')
    }
  }
}

@suite
export class AppPicturesLoadImageTests extends BaseAppPicturesTests {
  totalCount = 1500
  current: Picture = {
    path: '',
    name: '',
    seen: false
  }

  element: HTMLElement | null = null
  postJSONSpy: Sinon.SinonStub = sinon.stub()
  selectPageSpy: Sinon.SinonStub = sinon.stub()
  getPictureSpy: sinon.SinonStub = sinon.stub()
  loadingShowSpy: Sinon.SinonStub = sinon.stub()
  loadingErrorSpy: Sinon.SinonStub = sinon.stub()
  loadNewSpy: Sinon.SinonStub = sinon.stub()
  fetchStub: sinon.SinonStub = sinon.stub()
  bottomLeftText: HTMLElement | null = null
  bottomCenterText: HTMLElement | null = null
  bottomRightText: HTMLElement | null = null
  reloadSpy: Sinon.SinonSpy = sinon.spy()

  before (): void {
    super.before()
    TestPics.pictures = Array.from({ length: this.totalCount })
      .map((_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false
      }))
    this.current = TestPics.pictures[1250] ?? {
      path: '',
      name: '',
      seen: false
    }
    TestPics.current = this.current

    this.element = this.dom.window.document.createElement('div')
    this.current.element = this.element
    this.current.page = 40
    this.current.index = 1250
    this.postJSONSpy = sinon.stub(Net, 'PostJSON')
    this.postJSONSpy.resolves(50)
    this.fetchStub = sinon.stub(global, 'fetch').resolves()
    this.getPictureSpy = sinon.stub(Pictures, 'GetPicture').returns(undefined)
    this.selectPageSpy = sinon.stub(Pictures, 'SelectPage')
    this.reloadSpy = sinon.spy()
    Subscribe('Loading:Show', this.loadingShowSpy)
    Subscribe('Loading:Error', this.loadingErrorSpy)
    Subscribe('Picture:LoadNew', this.loadNewSpy)
    Subscribe('Navigate:Reload', this.reloadSpy)

    this.bottomCenterText = this.dom.window.document.querySelector('.statusBar.bottom .center')
    this.bottomLeftText = this.dom.window.document.querySelector('.statusBar.bottom .left')
    this.bottomRightText = this.dom.window.document.querySelector('.statusBar.bottom .right')
  }

  after (): void {
    this.postJSONSpy.restore()
    this.selectPageSpy.restore()
    this.getPictureSpy.restore()
    this.fetchStub.restore()
    super.after()
  }

  @test
  async 'it should be noop when current image is null' (): Promise<void> {
    TestPics.current = null
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(false)
  }

  @test
  async 'it should not await next loader when image is null' (): Promise<void> {
    TestPics.current = null
    let awaited = false
    TestPics.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(false)
  }

  @test
  async 'it should publish Loading:Show when next is pending' (): Promise<void> {
    TestPics.nextPending = true
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(true)
  }

  @test
  async 'it should not publish Loading:Show when next is not pending' (): Promise<void> {
    TestPics.nextPending = false
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(false)
  }

  @test
  async 'it should set seen on current picture' (): Promise<void> {
    expect(TestPics.current?.seen).to.equal(false)
    await Pictures.LoadImage()
    expect(TestPics.current?.seen).to.equal(true)
  }

  @test
  async 'it should set seen class on current menu element' (): Promise<void> {
    expect(this.element?.classList.contains('seen')).to.equal(false)
    await Pictures.LoadImage()
    expect(this.element?.classList.contains('seen')).to.equal(true)
  }

  @test
  async 'it should post to /api/navigate/latest' (): Promise<void> {
    TestPics.modCount = 50
    await Pictures.LoadImage()
    expect(this.postJSONSpy.callCount).to.equal(1)
    expect(this.postJSONSpy.calledWith('/api/navigate/latest')).to.equal(true)
    expect(this.postJSONSpy.firstCall.args[1]).to.deep.equal({
      path: '/some/path/1250.png',
      modCount: 50
    })
  }

  @test
  async 'it should await next loader when loading image' (): Promise<void> {
    let awaited = false
    TestPics.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(true)
  }

  @test
  async 'it should set src on image' (): Promise<void> {
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('')
    await Pictures.LoadImage()
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('/images/scaled/0/0/some/path/1250.png-image.webp')
  }

  @test
  async 'it should set src height on image' (): Promise<void> {
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('')
    assert(TestPics.mainImage !== null)
    TestPics.mainImage.height = 512
    await Pictures.LoadImage()
    expect(TestPics.mainImage.getAttribute('src')).to.equal('/images/scaled/0/512/some/path/1250.png-image.webp')
  }

  @test
  async 'it should set src width on image' (): Promise<void> {
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('')
    assert(TestPics.mainImage !== null)
    TestPics.mainImage.width = 1024
    await Pictures.LoadImage()
    expect(TestPics.mainImage.getAttribute('src')).to.equal('/images/scaled/1024/0/some/path/1250.png-image.webp')
  }

  @test
  async 'it should set statusbar name' (): Promise<void> {
    expect(this.bottomCenterText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomCenterText?.innerHTML).to.equal('1250.png')
  }

  @test
  async 'it should set statusbar percent' (): Promise<void> {
    expect(this.bottomRightText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomRightText?.innerHTML).to.equal('(83.4%)')
  }

  @test
  async 'it should set statusbar position' (): Promise<void> {
    expect(this.bottomLeftText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomLeftText?.innerHTML).to.equal('(1,251/1,500)')
  }

  @test
  async 'it should default to first image on missing index' (): Promise<void> {
    assert(TestPics.current !== null, 'Current Image must be set for valid test')
    TestPics.current.index = undefined
    await Pictures.LoadImage()
    expect(this.bottomLeftText?.innerHTML).to.equal('(1/1,500)')
    expect(this.bottomCenterText?.innerHTML).to.equal('1250.png')
    expect(this.bottomRightText?.innerHTML).to.equal('(0%)')
  }

  @test
  async 'it should select page of currnet image' (): Promise<void> {
    await Pictures.LoadImage()
    expect(this.selectPageSpy.calledWith(40)).to.equal(true)
  }

  @test
  async 'it should select default page when current image omits page marker' (): Promise<void> {
    assert(TestPics.current != null, 'Current Image must be set for valid test')
    TestPics.current.page = undefined
    await Pictures.LoadImage()
    expect(this.selectPageSpy.calledWith(1)).to.equal(true)
  }

  @test
  async 'it should publish error when process throws error' (): Promise<void> {
    const expectedErr = new Error('IGGY WIGGY, LETS GET JIGGY')
    this.postJSONSpy.rejects(expectedErr)
    await Pictures.LoadImage()
    expect(this.loadingErrorSpy.calledWith(expectedErr)).to.equal(true)
  }

  @test
  async 'it should reload when navigate replies with undefined modcount' (): Promise<void> {
    this.postJSONSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(this.reloadSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(false)
  }

  @test
  async 'it should reload when navigate replies with negative modcount' (): Promise<void> {
    this.postJSONSpy.resolves(-1)
    await Pictures.LoadImage()
    expect(this.reloadSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(false)
  }

  @test
  async 'it should not await next loader navigate returns undefined modcount' (): Promise<void> {
    this.postJSONSpy.resolves()
    let awaited = false
    TestPics.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(false)
  }

  @test
  async 'it should not await next loader navigate returns negative modcount' (): Promise<void> {
    this.postJSONSpy.resolves(-1)
    let awaited = false
    TestPics.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(false)
  }

  @test
  async 'it should not reload when navigate replies with positive modcount' (): Promise<void> {
    this.postJSONSpy.resolves(42)
    await Pictures.LoadImage()
    expect(this.reloadSpy.called).to.equal(false)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(true)
  }

  @test
  async 'it should pass retrieved modcount to next call to navigate/latest' (): Promise<void> {
    const expected = Math.random() * 100000
    this.postJSONSpy.resolves(expected)
    await Pictures.LoadImage()
    await Pictures.LoadImage()
    expect(this.postJSONSpy.secondCall.args[1]).to.deep.equal({
      path: '/some/path/1250.png',
      modCount: expected
    })
    expect(this.reloadSpy.called).to.equal(false)
  }

  @test
  async 'it should get next picture when ShowUnreadOnly is not set' (): Promise<void> {
    TestPics.ShowUnreadOnly = false
    await Pictures.LoadImage()
    expect(this.getPictureSpy.callCount).to.equal(1)
    expect(this.getPictureSpy.firstCall.args).to.deep.equal([NavigateTo.Next])
  }

  @test
  async 'it should get next unread picture when ShowUnreadOnly is set' (): Promise<void> {
    TestPics.ShowUnreadOnly = true
    await Pictures.LoadImage()
    expect(this.getPictureSpy.callCount).to.equal(1)
    expect(this.getPictureSpy.firstCall.args).to.deep.equal([NavigateTo.NextUnread])
  }

  @test
  async 'it should not set next pending to false when there is no next image' (): Promise<void> {
    TestPics.nextPending = true
    this.getPictureSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(TestPics.nextPending).to.equal(false)
  }

  @test
  async 'it should request expected next URI' (): Promise<void> {
    TestPics.nextPending = false
    this.getPictureSpy.returns({ path: '/foo.png' })
    assert(TestPics.mainImage !== null)
    TestPics.mainImage.width = 1000
    TestPics.mainImage.height = 900
    await Pictures.LoadImage()
    expect(this.fetchStub.callCount).to.equal(1)
    expect(this.fetchStub.firstCall.args).to.have.lengthOf(1)
    expect(this.fetchStub.firstCall.args[0]).to.equal('/images/scaled/1000/900/foo.png-image.webp')
  }

  @test
  async 'it should set next pending to false when there is next image' (): Promise<void> {
    TestPics.nextPending = false
    this.getPictureSpy.resolves({ path: 'foo.png' })
    const delay = Delay(1)
    this.fetchStub.resolves(delay)
    await Pictures.LoadImage()
    expect(TestPics.nextPending).to.equal(true)
    await delay
  }

  @test
  async 'it should clear next pending when next fetch resolves' (): Promise<void> {
    TestPics.nextPending = false
    this.getPictureSpy.resolves({ path: 'foo.png' })
    const delay = Delay(1)
    this.fetchStub.resolves(delay)
    await Pictures.LoadImage()
    expect(TestPics.nextPending).to.equal(true)
    await delay
    expect(TestPics.nextPending).to.equal(false)
  }

  @test
  async 'it should clear next pending when next fetch rejects' (): Promise<void> {
    TestPics.nextPending = false
    this.getPictureSpy.resolves({ path: 'foo.png' })
    const delay = Delay(1).then(async () => { await Promise.reject(new Error('WAARIO!')) })
    this.fetchStub.resolves(delay)
    await Pictures.LoadImage()
    expect(TestPics.nextPending).to.equal(true)
    await delay.catch(() => null)
    expect(TestPics.nextPending).to.equal(false)
  }

  @test
  async 'it should publish Picture:LoadNew on success' (): Promise<void> {
    await Pictures.LoadImage()
    expect(this.loadNewSpy.callCount).to.equal(1)
  }

  @test
  async 'it should not publish Picture:LoadNew on error' (): Promise<void> {
    this.postJSONSpy.rejects('nope')
    await Pictures.LoadImage()
    expect(this.loadNewSpy.callCount).to.equal(0)
  }

  @test
  async 'it should not publish Picture:LoadNew on navigate:reload' (): Promise<void> {
    this.postJSONSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(this.loadNewSpy.callCount).to.equal(0)
  }
}

@suite
export class AppPicturesLoadDataTests extends BaseAppPicturesTests {
  makeTabSpy: Sinon.SinonStub = sinon.stub()
  loadImageSpy: Sinon.SinonStub = sinon.stub()
  menuShowSpy: Sinon.SinonStub = sinon.stub()
  menuHideSpy: Sinon.SinonStub = sinon.stub()
  tabSelectSpy: Sinon.SinonStub = sinon.stub()
  pictures: Picture[] = []
  before (): void {
    super.before()
    this.makeTabSpy = sinon.stub(Pictures, 'MakeTab')
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage').resolves(undefined)
    Subscribe('Menu:Show', this.menuShowSpy)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Tab:Select', this.tabSelectSpy)
    this.pictures = Array.from({ length: 64 })
      .map((_, i) => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false,
        index: -1
      }))
  }

  after (): void {
    this.makeTabSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  @test
  async 'it should tolerate LoadImage rejecting' (): Promise<void> {
    const awaiter = Delay(1)
    this.loadImageSpy.rejects(new Error('FOO!'))
    Pictures.LoadData({
      pictures: this.pictures
    })
    await awaiter
    expect(this.loadImageSpy.called).to.equal(true)
  }

  @test
  'it should reset markup to clear tab' (): void {
    TestPics.mainImage = null
    const mainImage = this.dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(mainImage != null, 'MainImage must exist for test to be valid')
    Pictures.LoadData({})
    expect(TestPics.mainImage).to.equal(mainImage)
  }

  @test
  'it should hide main image with null pictures' (): void {
    TestPics.mainImage?.classList.remove('hidden')
    Pictures.LoadData({
      pictures: undefined
    })
    expect(TestPics.mainImage?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should hide main image with empty pictures' (): void {
    TestPics.mainImage?.classList.remove('hidden')
    Pictures.LoadData({
      pictures: []
    })
    expect(TestPics.mainImage?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should publish Menu:Show on null pictures' (): void {
    Pictures.LoadData({
      pictures: undefined
    })
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Show on empty pictures' (): void {
    Pictures.LoadData({
      pictures: []
    })
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should hide tab label with null pictures' (): void {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    assert(tabLabel != null, 'Invalid markup to begin test')
    Pictures.LoadData({
      pictures: undefined
    })
    expect(tabLabel.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should hide tab label with empty pictures' (): void {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    assert(tabLabel != null, 'Invalid markup to begin test')
    tabLabel.classList.remove('hidden')
    Pictures.LoadData({
      pictures: []
    })
    expect(tabLabel.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should abort execution on null pictures' (): void {
    Pictures.LoadData({
      pictures: undefined
    })
    expect(this.makeTabSpy.called).to.equal(false)
    expect(this.tabSelectSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadImageSpy.called).to.equal(false)
  }

  @test
  'it should abort execution on empty pictures' (): void {
    Pictures.LoadData({
      pictures: []
    })
    expect(this.makeTabSpy.called).to.equal(false)
    expect(this.tabSelectSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadImageSpy.called).to.equal(false)
  }

  @test
  'it should remove hidden from main image when loading with pictures' (): void {
    TestPics.mainImage?.classList.add('hidden')
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(TestPics.mainImage?.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should show tab label when loading with pictures pictures' (): void {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    assert(tabLabel != null, 'Invalid markup to begin test')
    tabLabel.classList.add('hidden')
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(tabLabel.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should save pictuers list when loading pictuers' (): void {
    expect(TestPics.pictures).to.not.equal(this.pictures)
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(TestPics.pictures).to.equal(this.pictures)
  }

  @test
  'it should set selected image to cover image when match found' (): void {
    Pictures.LoadData({
      cover: '/some/path/42.png',
      pictures: this.pictures
    })
    expect(TestPics.current).to.equal(this.pictures[42])
  }

  @test
  'it should set selected image to cover image when no match found' (): void {
    Pictures.LoadData({
      cover: '/not/a/valid/path.png',
      pictures: this.pictures
    })
    expect(TestPics.current).to.equal(this.pictures[0])
  }

  @test
  'it should call maketab to generate relevant markup' (): void {
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.makeTabSpy.called).to.equal(true)
  }

  @test
  'it should publis Tab:Select to notify that the picture tab has been selected' (): void {
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.tabSelectSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Hide when loading pictures with no seen pics' (): void {
    this.pictures.forEach(pic => {
      pic.seen = false
    })
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.menuShowSpy.called).to.equal(false)
  }

  @test
  'it should publish Menu:Hide when loading pictures with some seen pics' (): void {
    this.pictures.forEach((pic, i) => {
      pic.seen = i % 2 === 0
    })
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.menuShowSpy.called).to.equal(false)
  }

  @test
  'it should publish Menu:Show when loading pictures with all seen pics' (): void {
    this.pictures.forEach(pic => {
      pic.seen = true
    })
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Hide when loading pictures with all seen pics and noMenu flag set' (): void {
    this.pictures.forEach(pic => {
      pic.seen = true
    })
    Pictures.LoadData({
      pictures: this.pictures,
      noMenu: true
    })
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.menuShowSpy.called).to.equal(false)
  }

  @test
  'it should call LoadImage to load selected image' (): void {
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.loadImageSpy.called).to.equal(true)
  }

  @test
  'it should set index field of pictures' (): void {
    Pictures.LoadData({
      pictures: this.pictures
    })
    for (let i = 0; i < this.pictures.length; i++) {
      expect(TestPics.pictures[i]?.index).to.equal(i)
    }
  }
}

@suite
export class AppPicturesGetPictureTests extends BaseAppPicturesTests {
  makeTabSpy: Sinon.SinonStub = sinon.stub()
  loadImageSpy: Sinon.SinonStub = sinon.stub()
  menuShowSpy: Sinon.SinonStub = sinon.stub()
  menuHideSpy: Sinon.SinonStub = sinon.stub()
  tabSelectSpy: Sinon.SinonStub = sinon.stub()
  pictures: Picture[] = []

  before (): void {
    super.before()
    this.makeTabSpy = sinon.stub(Pictures, 'MakeTab')
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage').resolves(undefined)
    Subscribe('Menu:Show', this.menuShowSpy)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Tab:Select', this.tabSelectSpy)
    this.pictures = Array.from({ length: 64 })
      .map((_, i) => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: i >= 16 && i < 48,
        index: -1
      }))
    Pictures.Init()
  }

  after (): void {
    this.makeTabSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  loadPictures (): void {
    Pictures.LoadData({
      pictures: this.pictures,
      cover: '/some/path/32.png'
    })
  }

  @test
  'it should return undefined when there is no current picture' (): void {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.First)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigateFirst on no pictures' (): void {
    TestPics.current = this.pictures[0] ?? null
    const pic = TestPics.GetPicture(NavigateTo.First)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return first picture on navigate first' (): void {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.First)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for PreviousUnread with unread ahead and behind' (): void {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[15])
  }

  @test
  'it should return expected for PreviousUnread with unread only behind' (): void {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i < 48
    })
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[63])
  }

  @test
  'it should return expected for PreviousUnread with unread only first' (): void {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i > 0
    })
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for PreviousUnread with no unread' (): void {
    this.loadPictures()
    this.pictures.forEach(pic => {
      pic.seen = true
    })
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for no pictures on navigate previous' (): void {
    TestPics.pictures = []
    TestPics.current = this.pictures[31] ?? null
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for null current picture on navigate previous' (): void {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for undefined current picture index on navigate previous' (): void {
    this.loadPictures()
    assert(TestPics.current != null, 'current picture should have been set')
    TestPics.current.index = undefined
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for zero current picture index on navigate previous' (): void {
    this.loadPictures()
    assert(TestPics.current != null, 'current picture should have been set')
    TestPics.current.index = 0
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return expected for current picture index = 1 on navigate previous' (): void {
    this.loadPictures()
    assert(TestPics.current != null, 'current picture should have been set')
    TestPics.current.index = 1
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for valid current picture index on navigate previous' (): void {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(this.pictures[31])
  }

  @test
  'it should return undefined for no pictures on navigate next' (): void {
    TestPics.pictures = []
    TestPics.current = this.pictures[31] ?? null
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for null current picture on navigate next' (): void {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for undefined current picture index on navigate next' (): void {
    this.loadPictures()
    assert(TestPics.current != null, 'current picture should have been set')
    TestPics.current.index = undefined
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for maximum current picture index on navigate next' (): void {
    this.loadPictures()
    assert(TestPics.current != null, 'current picture should have been set')
    TestPics.current.index = this.pictures.length - 1
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return expected for current picture index = max - 1  on navigate next' (): void {
    this.loadPictures()
    assert(TestPics.current != null, 'current picture should have been set')
    TestPics.current.index = this.pictures.length - 2
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(this.pictures[63])
  }

  @test
  'it should return expected for valid current picture index on navigate next' (): void {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(this.pictures[33])
  }

  @test
  'it should return expected for NextUnread with unread ahead and behind' (): void {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(this.pictures[48])
  }

  @test
  'it should return expected for NextUnread with unread only behind' (): void {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i >= 16
    })
    const pic = TestPics.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for NextUnread with no unread' (): void {
    this.loadPictures()
    this.pictures.forEach(pic => {
      pic.seen = true
    })
    const pic = TestPics.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigate last when there is no current picture' (): void {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigateLast on no pictures' (): void {
    TestPics.current = this.pictures[0] ?? null
    const pic = TestPics.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return first picture on navigate last' (): void {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(this.pictures[63])
  }
}

@suite
export class AppPicturesChangePictureTests extends BaseAppPicturesTests {
  isLoadingSpy: Sinon.SinonStub = sinon.stub()
  isLoading = false
  loadImageSpy: Sinon.SinonStub = sinon.stub()
  menuHideSpy: Sinon.SinonStub = sinon.stub()
  loadingErrorSpy: Sinon.SinonStub = sinon.stub()

  picture: Picture = {
    path: '/some/path/8472.png',
    name: '8472.png',
    seen: false,
    index: -1
  }

  before (): void {
    super.before()
    TestPics.current = null
    this.isLoadingSpy = sinon.stub(Loading, 'IsLoading')
    this.isLoadingSpy.get(() => this.isLoading)
    this.isLoading = false
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage').resolves(undefined)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Loading:Error', this.loadingErrorSpy)
  }

  after (): void {
    this.isLoadingSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  @test
  'it should cleanly abort when currently loading' (): void {
    this.isLoading = true
    TestPics.ChangePicture(this.picture)
    expect(TestPics.current).to.equal(null)
    expect(this.loadImageSpy.called).to.equal(false)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
  }

  @test
  'it should publish error when changing to empty picture' (): void {
    TestPics.ChangePicture(undefined)
    expect(TestPics.current).to.equal(null)
    expect(this.loadImageSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadingErrorSpy.calledWithExactly('Change Picture called with No Picture to change to', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'it should trigger full image load when changing to a valid image' (): void {
    TestPics.ChangePicture(this.picture)
    expect(TestPics.current).to.equal(this.picture)
    expect(this.loadImageSpy.called).to.equal(true)
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
  }

  @test
  'it should tolerate LoadImage rejecting' (): void {
    this.loadImageSpy.rejects(new Error('FOO!'))
    TestPics.ChangePicture(this.picture)
    expect(this.loadImageSpy.called).to.equal(true)
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
  }
}

@suite
export class AppPicturesGetSetShowUnreadOnly extends BaseAppPicturesTests {
  @test
  'it should default to showing all when local storage is not set' (): void {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    expect(TestPics.ShowUnreadOnly).to.equal(false)
  }

  @test
  'it should return false when local storage is set to invalid value' (): void {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'HELLO')
    expect(TestPics.ShowUnreadOnly).to.equal(false)
  }

  @test
  'it should return false when local storage is set to false' (): void {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'false')
    expect(TestPics.ShowUnreadOnly).to.equal(false)
  }

  @test
  'it should return true when local storage is set to true' (): void {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'true')
    expect(TestPics.ShowUnreadOnly).to.equal(true)
  }

  @test
  'it should set localstorage to stringified bolean on set to true' (): void {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    TestPics.ShowUnreadOnly = true
    const result = this.dom.window.localStorage.getItem('ShowUnseenOnly')
    expect(result).to.equal('true')
  }

  @test
  'it should set localstorage to stringified bolean on set to false' (): void {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    TestPics.ShowUnreadOnly = false
    const result = this.dom.window.localStorage.getItem('ShowUnseenOnly')
    expect(result).to.equal('false')
  }
}

@suite
export class AppPicturesUpdateUnreadSelectorSlider extends BaseAppPicturesTests {
  @test
  'it should remove unread class when not reading unread only' (): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.add('unread')
    expect(element?.classList.contains('unread')).to.equal(true)
    TestPics.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('unread')).to.equal(false)
  }

  @test
  'it should add all class when not reading unread only' (): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.remove('all')
    expect(element?.classList.contains('all')).to.equal(false)
    TestPics.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('all')).to.equal(true)
  }

  @test
  'it should add unread class when reading unread only' (): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'true'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.remove('unread')
    expect(element?.classList.contains('unread')).to.equal(false)
    TestPics.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('unread')).to.equal(true)
  }

  @test
  'it should remove all class when reading unread only' (): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'true'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.add('all')
    expect(element?.classList.contains('all')).to.equal(true)
    TestPics.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('all')).to.equal(false)
  }
}

@suite
export class AppPicturesInitUnreadSelectorSlider extends BaseAppPicturesTests {
  UpdateUnreadSelectorSliderSpy: Sinon.SinonStub = sinon.stub()
  GetShowUnreadOnly: Sinon.SinonStub = sinon.stub()
  ShowUnreadOnlyValue = false
  SliderDiv: HTMLDivElement | null = null

  before (): void {
    super.before()
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    this.UpdateUnreadSelectorSliderSpy = sinon.stub(Pictures, 'UpdateUnreadSelectorSlider')
    this.GetShowUnreadOnly = sinon.stub(Pictures, 'ShowUnreadOnly')
    this.GetShowUnreadOnly.get(() => this.ShowUnreadOnlyValue)
    this.SliderDiv = this.dom.window.document.querySelector('.selectUnreadAll')
  }

  after (): void {
    this.UpdateUnreadSelectorSliderSpy.restore()
    this.GetShowUnreadOnly.restore()
    super.after()
  }

  @test
  'it should call UpdateUnreasSelectoreSlider on intitial call' (): void {
    Pictures.InitUnreadSelectorSlider()
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(true)
  }

  @test
  'it should respond to click by calling UpdateUnreadSelectorSlider' (): void {
    Pictures.InitUnreadSelectorSlider()
    this.UpdateUnreadSelectorSliderSpy.reset()
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(false)
    const event = new this.dom.window.MouseEvent('click')
    this.SliderDiv?.dispatchEvent(event)
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(true)
  }

  @test
  'it should activate unread mode when in readall mode' (): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    Pictures.InitUnreadSelectorSlider()
    this.UpdateUnreadSelectorSliderSpy.reset()
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(false)
    const event = new this.dom.window.MouseEvent('click')
    this.SliderDiv?.dispatchEvent(event)
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(true)
    expect(this.dom.window.localStorage.ShowUnseenOnly).to.equal('true')
  }

  @test
  'it should activate readall mode when in unread mode' (): void {
    this.ShowUnreadOnlyValue = true
    Pictures.InitUnreadSelectorSlider()
    const event = new this.dom.window.MouseEvent('click')
    this.SliderDiv?.dispatchEvent(event)
    expect(this.dom.window.localStorage.ShowUnseenOnly).to.equal('false')
  }
}

@suite
export class AppPicturesInitActions extends BaseAppPicturesTests {
  GetIsMenuActive: Sinon.SinonStub = sinon.stub()
  GetShowUnreadOnly: Sinon.SinonStub = sinon.stub()
  StubChangePicture: Sinon.SinonStub = sinon.stub()
  StubWindowOpen: Sinon.SinonStub = sinon.stub()
  StubPostJson: Sinon.SinonStub = sinon.stub()
  ShowUnreadOnlyValue = false
  IsMenuActiveValue = false

  before (): void {
    super.before()
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    this.GetIsMenuActive = sinon.stub(Navigation, 'IsMenuActive')
    this.GetIsMenuActive.get(() => this.IsMenuActiveValue)
    this.GetShowUnreadOnly = sinon.stub(Pictures, 'ShowUnreadOnly')
    this.GetShowUnreadOnly.get(() => this.ShowUnreadOnlyValue)
    this.StubChangePicture = sinon.stub(Pictures, 'ChangePicture')
    this.StubWindowOpen = sinon.stub(this.dom.window, 'open')
    this.StubPostJson = sinon.stub(Net, 'PostJSON')
    this.StubPostJson.resolves()
    TestPics.pictures = Array(21).fill(null).map((_, i) => ({
      name: `${i}.jpg`,
      path: `/${i}.jpg`,
      seen: i >= 5 && i < 15,
      index: i
    }))
    TestPics.current = TestPics.pictures[10] ?? null
  }

  after (): void {
    this.GetIsMenuActive.restore()
    this.GetShowUnreadOnly.restore()
    this.StubChangePicture.restore()
    this.StubWindowOpen.restore()
    this.StubPostJson.restore()
    super.after()
  }

  @test
  'it should subscribe to ArrowUp' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWUP')
  }

  @test
  'it should publish ShowMenu for ArrowUp when menu is not active' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:ShowMenu', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowUp')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowUp when no pictures' (): void {
    const spy = sinon.stub()
    TestPics.pictures = []
    TestPics.current = null
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowUp')
    expect(spy.called).to.equal(false)
  }

  @test
  'it should publish HideMenu for ArrowUp when menu is active' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to ArrowRight' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWRIGHT')
  }

  @test
  'it should publish Next for ArrowRight when menu is not active' (): void {
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:NEXT'] = []
    Subscribe('Action:Execute:Next', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowRight')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowRight when no pictures' (): void {
    const spy = sinon.stub()
    TestPics.pictures = []
    TestPics.current = null
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:Arrowright')
    expect(spy.called).to.equal(false)
  }

  @test
  'it should publish HideMenu for ArrowRight when menu is active' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowRight')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to ArrowLeft' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWLEFT')
  }

  @test
  'it should publish Previous for ArrowLeft when menu is not active' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:Previous', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowLeft when no pictures' (): void {
    const spy = sinon.stub()
    TestPics.pictures = []
    TestPics.current = null
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(false)
  }

  @test
  'it should publish HideMenu for ArrowLeft when menu is active' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to ArrowDown' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWDOWN')
  }

  @test
  'it should publish ShowMenu for ArrowDown when menu is not active' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:ShowMenu', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowDown')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowDown when no pictures' (): void {
    const spy = sinon.stub()
    TestPics.pictures = []
    TestPics.current = null
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowDown')
    expect(spy.called).to.equal(false)
  }

  @test
  'it should publish HideMenu for ArrowDown when menu is active' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to Execute:Previous' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:PREVIOUS')
  }

  @test
  'it should execute PreviousUnseen when ShowUnreadOnly is true' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:PreviousUnseen', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = true
    Publish('Action:Execute:Previous')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should execute PreviousImage when ShowUnreadOnly is false' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:PreviousImage', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = false
    Publish('Action:Execute:Previous')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to Execute:First' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:FIRST')
  }

  @test
  'it should Load First picture on to Execute:First' (): void {
    Publish('Action:Execute:First')
    expect(this.StubChangePicture.called).to.equal(true)
    expect(this.StubChangePicture.firstCall.args[0]).to.equal(TestPics.pictures[0])
  }

  @test
  'it should subscribe to Execute:PreviousImage' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:PREVIOUSIMAGE')
  }

  @test
  'it should Load First picture on to Execute:PreviousImage' (): void {
    Publish('Action:Execute:PreviousImage')
    expect(this.StubChangePicture.called).to.equal(true)
    expect(this.StubChangePicture.firstCall.args[0]).to.equal(TestPics.pictures[9])
  }

  @test
  'it should subscribe to Execute:PreviousUnseen' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:PREVIOUSUNSEEN')
  }

  @test
  'it should Load First picture on to Execute:PreviousUnseen' (): void {
    Publish('Action:Execute:PreviousUnseen')
    expect(this.StubChangePicture.called).to.equal(true)
    expect(this.StubChangePicture.firstCall.args[0]).to.equal(TestPics.pictures[4])
  }

  @test
  'it should subscribe to Execute:Next' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:NEXT')
  }

  @test
  'it should execute NextUnseen when ShowUnreadOnly is true' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:NextUnseen', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = true
    Publish('Action:Execute:Next')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should execute NextImage when ShowUnreadOnly is false' (): void {
    const spy = sinon.stub()
    Subscribe('Action:Execute:NextImage', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = false
    Publish('Action:Execute:Next')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to Execute:NextImage' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:NEXTIMAGE')
  }

  @test
  'it should Load First picture on to Execute:NextImage' (): void {
    Publish('Action:Execute:NextImage')
    expect(this.StubChangePicture.called).to.equal(true)
    expect(this.StubChangePicture.firstCall.args[0]).to.equal(TestPics.pictures[11])
  }

  @test
  'it should subscribe to Execute:NextUnseen' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:NEXTUNSEEN')
  }

  @test
  'it should Load First picture on to Execute:NextUnseen' (): void {
    Publish('Action:Execute:NextUnseen')
    expect(this.StubChangePicture.called).to.equal(true)
    expect(this.StubChangePicture.firstCall.args[0]).to.equal(TestPics.pictures[15])
  }

  @test
  'it should subscribe to Execute:Last' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:LAST')
  }

  @test
  'it should Load First picture on to Execute:Last' (): void {
    Publish('Action:Execute:Last')
    expect(this.StubChangePicture.called).to.equal(true)
    expect(this.StubChangePicture.firstCall.args[0]).to.equal(TestPics.pictures[20])
  }

  @test
  'it should subscribe to Execute:ViewFullSize' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:VIEWFULLSIZE')
  }

  @test
  'it should open image when executing view full size' (): void {
    expect(this.StubWindowOpen.called).to.equal(false)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    Publish('Action:Execute:ViewFullSize')
    expect(this.StubWindowOpen.calledWith('/images/full/Foo/Bar/Baz.jpg')).to.equal(true)
  }

  @test
  'it should subscribe to Execute:Bookmark' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:BOOKMARK')
  }

  @test
  async 'it should post bookmarks add for Execute:Bookmark' (): Promise<void> {
    const spy = sinon.stub()
    Subscribe('Bookmarks:Add', spy)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    Publish('Action:Execute:Bookmark')
    // let the callback finish
    await Delay(5)
    expect(this.StubPostJson.called).to.equal(false)
    expect(spy.called).to.equal(true)
  }

  @test
  async 'it should post expected payload for Execute:Bookmark' (): Promise<void> {
    const spy = sinon.stub()
    Subscribe('Bookmarks:Add', spy)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    Publish('Action:Execute:Bookmark')
    // let the callback finish
    await Delay(10)
    expect(spy.called).to.equal(true)
    expect(spy.firstCall.args[0]).to.equal('/Foo/Bar/Baz.jpg')
  }

  @test
  'it should subscribe to Gamepad:B' (): void {
    expect(PubSub.subscribers).to.contain.keys('ACTION:GAMEPAD:B')
  }

  @test
  async 'it should post bookmarks add for Gamepad:B' (): Promise<void> {
    const spy = sinon.stub()
    Subscribe('Bookmarks:Add', spy)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    Publish('Action:Gamepad:B')
    // let the callback finish
    await Delay(5)
    expect(this.StubPostJson.called).to.equal(false)
    expect(spy.called).to.equal(true)
  }

  @test
  async 'it should post expected payload for Gamepad:B' (): Promise<void> {
    const spy = sinon.stub()
    Subscribe('Bookmarks:Add', spy)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    Publish('Action:Gamepad:B')
    // let the callback finish
    await Delay(10)
    expect(spy.called).to.equal(true)
    expect(spy.firstCall.args[0]).to.equal('/Foo/Bar/Baz.jpg')
  }
}

@suite
export class AppPicturesInitMouse extends BaseAppPicturesTests {
  boundingRect = {
    x: 0,
    y: 0,
    width: 1024,
    height: 768,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  }

  myVisualViewport: TestVisualViewport = {
    scale: 1
  }

  MainImageBoundingStub: sinon.SinonStub = sinon.stub()
  ClickTarget: HTMLElement | null = null

  before (): void {
    this.myVisualViewport = {
      scale: 1
    }
    this.visualViewport = this.myVisualViewport
    super.before()
    const element = TestPics.mainImage?.parentElement
    assert(element != null)
    this.MainImageBoundingStub = sinon.stub(element, 'getBoundingClientRect')
    this.MainImageBoundingStub.returns(this.boundingRect)
    this.ClickTarget = TestPics.mainImage?.parentElement ?? null
    PubSub.subscribers['LOADING:ERROR'] = [() => 0]
  }

  after (): void {
    this.MainImageBoundingStub.restore()
    super.after()
  }

  @test
  'it should ignore click with zero width image area' (): void {
    const evt = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub()
    this.boundingRect.width = 0
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore click with null width image bounding rect' (): void {
    const evt = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub()
    this.MainImageBoundingStub.returns(null)
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate previous for left area click' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    Subscribe('Action:Execute:Previous', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate previous for left area click with decreased visualViewport scale' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    Subscribe('Action:Execute:Previous', spy)
    this.myVisualViewport.scale /= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore left area click with increased visualViewport scale' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    Subscribe('Ignored Mouse Click', spy)
    this.myVisualViewport.scale *= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should show menu for center area click' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 2,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    Subscribe('Action:Execute:ShowMenu', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should show menu for center area click with decreased visualViewport scale' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 2,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    this.myVisualViewport.scale /= 2
    Subscribe('Action:Execute:ShowMenu', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore center area click with increased visualViewport scale' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 2,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    this.myVisualViewport.scale *= 2
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate next for right area click' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: 3 * this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    Subscribe('Action:Execute:Next', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate next for right area click with decreased visualViewport scale' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: 3 * this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    Subscribe('Action:Execute:Next', spy)
    this.myVisualViewport.scale /= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore right area click with increased visualViewport scale' (): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: 3 * this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2
    })
    const spy = sinon.stub()
    Subscribe('Ignored Mouse Click', spy)
    this.myVisualViewport.scale *= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }
}
