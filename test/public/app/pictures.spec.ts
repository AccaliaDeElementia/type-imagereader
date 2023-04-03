'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { Net } from '../../../public/scripts/app/net'
import { Publish, PubSub, Subscribe } from '../../../public/scripts/app/pubsub'
import { NavigateTo, PageSelector, Picture, Pictures } from '../../../public/scripts/app/pictures'
import { Loading } from '../../../public/scripts/app/loading'
import { Navigation } from '../../../public/scripts/app/navigation'

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

  static Reset () {
    Pictures.pictures = []
    Pictures.current = null
    Pictures.imageCard = null
    Pictures.mainImage = null
    Pictures.pageSize = 32
    Pictures.modCount = -1
  }

  public static ResetMarkup () {
    Pictures.ResetMarkup()
  }

  public static GetPicture (navi: NavigateTo): Picture | undefined {
    return Pictures.GetPicture(navi)
  }

  public static ChangePicture (pic: Picture | undefined): void {
    Pictures.ChangePicture(pic)
  }

  public static get ShowUnreadOnly () {
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

    // @ts-ignore
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

  before () {
    super.before()
    this.loadDataSpy = sinon.stub(Pictures, 'LoadData')
  }

  after () {
    this.loadDataSpy.restore()
    super.after()
  }

  @test
  'sets image defaults' () {
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
  'registers mainImage:load that publishes Loading:Hide' () {
    let hidden = false
    PubSub.Subscribe('Loading:Hide', () => {
      hidden = true
    })
    const image = this.document.querySelector('#bigImage img') as HTMLElement
    const event = new this.dom.window.Event('load')
    expect(hidden).to.equal(false)
    image.dispatchEvent(event)
    expect(hidden).to.equal(true)
  }

  @test
  'registers mainImage:error that publishes Loading:Error with src' () {
    let hidden = false
    PubSub.Subscribe('Loading:Error', () => {
      hidden = true
    })
    const image = this.document.querySelector('#bigImage img') as HTMLImageElement
    const event = new this.dom.window.Event('error')
    image.src = 'foobar'
    expect(hidden).to.equal(false)
    image.dispatchEvent(event)
    expect(hidden).to.equal(true)
  }

  @test
  'registers mainImage:error that doesn not publishes Loading:Error without src' () {
    let hidden = false
    PubSub.Subscribe('Loading:Error', () => {
      hidden = true
    })
    const image = this.document.querySelector('#bigImage img') as HTMLImageElement
    const event = new this.dom.window.Event('error')
    expect(hidden).to.equal(false)
    image.dispatchEvent(event)
    expect(hidden).to.equal(false)
    image.src = ''
    image.dispatchEvent(event)
    expect(hidden).to.equal(false)
  }

  @test
  async 'it should subscribe to Navigate:Data with a call to LoadData()' () {
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
  'locates critical elements' () {
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
  'allows missing critical elements' () {
    this.document.querySelector<HTMLElement>('#bigImage img')?.remove()
    this.document.querySelector<HTMLTemplateElement>('#ImageCard')?.remove()
    TestPics.ResetMarkup()
    expect(TestPics.mainImage).to.equal(null)
    expect(TestPics.imageCard).to.equal(null)
  }

  @test
  'force clears big image source' () {
    expect(TestPics.mainImage).to.not.equal(null)
    TestPics.mainImage?.setAttribute('src', 'http://example.com/image.png')
    TestPics.ResetMarkup()
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('')
  }

  @test
  'clears all statusbar text' () {
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
  'deletes page list from markup' () {
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
  'returns -1 for no pages' () {
    expect(Pictures.CurrentPage).to.equal(-1)
  }

  @test
  'returns -1 for no active pages' () {
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
  'returns number for active page' () {
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
  activePage: number = -1
  nextPageLink: HTMLElement | undefined
  nextPageElement: HTMLElement | undefined
  nextPage: number = 0
  totalpages: number = 8
  before () {
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
  'ignores call when called on no pages' () {
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
  'Publishes error when called on negative page' () {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(-1)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Publishes error when called on zero page' () {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(0)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Publishes error when called on huge page' () {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(this.totalpages + 1)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Does not publish error on valid page' () {
    const publishSpy = sinon.stub()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(this.activePage)
    expect(publishSpy.called).to.equal(false)
  }

  @test
  'Removes active class from current active page link when switching' () {
    expect(this.activePageLink?.classList.contains('active')).to.equal(true)
    Pictures.SelectPage(this.nextPage)
    expect(this.activePageLink?.classList.contains('active')).to.equal(false)
  }

  @test
  'Adds hidden class to current active page when switching' () {
    expect(this.activePageElement?.classList.contains('hidden')).to.equal(false)
    Pictures.SelectPage(this.nextPage)
    expect(this.activePageElement?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'Adds active class to next active page link when switching' () {
    expect(this.nextPageLink?.classList.contains('active')).to.equal(false)
    Pictures.SelectPage(this.nextPage)
    expect(this.nextPageLink?.classList.contains('active')).to.equal(true)
  }

  @test
  'Removes hidden class from next active page when switching' () {
    expect(this.nextPageElement?.classList.contains('hidden')).to.equal(true)
    Pictures.SelectPage(this.nextPage)
    expect(this.nextPageElement?.classList.contains('hidden')).to.equal(false)
  }
}

@suite
export class AppPicturesMakePictureCardTests extends BaseAppPicturesTests {
  changePictureSpy: Sinon.SinonStub = Sinon.stub()

  before () {
    super.before()
    this.changePictureSpy = sinon.stub(Pictures, 'ChangePicture')
  }

  after () {
    this.changePictureSpy.restore()
    super.after()
  }

  @test
  'returns a HTMLElement' () {
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    })
    expect(card).to.be.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'adds card to input picture' () {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    const card = Pictures.MakePictureCard(pic)
    expect(pic.element).to.equal(card)
  }

  @test
  'sets background image' () {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.style.backgroundImage).to.equal(
      `url(/images/preview${pic.path})` // N.B. JSDom has a peculiarity with quotemarks so test ignores them when reading property back
    )
  }

  @test
  'omits seen class when not seen' () {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.classList.contains('seen')).to.equal(pic.seen)
  }

  @test
  'sets seen class when seen' () {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: true
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.classList.contains('seen')).to.equal(pic.seen)
  }

  @test
  'sets image title' () {
    const pic: Picture = {
      name: 'foobar' + Math.random(),
      path: '/foo/bar/baz.jpg',
      seen: true
    }
    const card = Pictures.MakePictureCard(pic)
    expect(card.querySelector('h5')?.innerHTML).to.equal(pic.name)
  }

  @test
  'Registers click handler that updates current image' () {
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
  'Registers click handler that hides menu' () {
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
  'Registers click handler that publishes Picture:Load' () {
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
  'Returns a div element' () {
    const result = Pictures.MakePicturesPage(0, [])
    expect(result).to.be.an.instanceOf(this.dom.window.HTMLDivElement)
  }

  @test
  'adds page number to all pictures' () {
    const pics = this.makePics(20)
    const page = Math.ceil(Math.random() * 9000) + 1000
    Pictures.MakePicturesPage(page, pics)
    expect(pics.every(pic => pic.page === page)).to.equal(true)
  }

  @test
  'creates cards for each picture' () {
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
  'it returns an List Item Element' () {
    const result = Pictures.MakePaginatorItem('foobar', () => 0)
    expect(result).to.be.an.instanceOf(this.dom.window.HTMLLIElement)
  }

  @test
  'it sets inner span to provided label' () {
    const label = `LABEL ${Math.random()}`
    const result = Pictures.MakePaginatorItem(label, () => 0)
    expect(result.querySelector('span')?.innerHTML).to.equal(label)
  }

  @test
  'it adds click handler that calls selector to determine page index' () {
    const selector = sinon.stub()
    selector.returns(0)
    const item = Pictures.MakePaginatorItem('label', selector)
    const event = new this.dom.window.MouseEvent('click')
    expect(selector.called).to.equal(false)
    item.dispatchEvent(event)
    expect(selector.called).to.equal(true)
  }

  @test
  'it adds click handler that selects appropriate page' () {
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
  'it should return null for fewer than two pages' () {
    expect(Pictures.MakePaginator(-5)).to.equal(null)
    expect(Pictures.MakePaginator(-1)).to.equal(null)
    expect(Pictures.MakePaginator(0)).to.equal(null)
    expect(Pictures.MakePaginator(1)).to.equal(null)
  }

  @test
  'it should return an HTMLElement for two or more pages' () {
    expect(Pictures.MakePaginator(50)).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should include number of pages + 2 child elements' () {
    const result = Pictures.MakePaginator(50)
    const domItems = result?.querySelector('.pagination')
    expect(domItems?.children).to.have.length(52)
  }

  @test
  'it should set "Previous Page" selector' () {
    Pictures.MakePaginator(50)
    expect(this.pages).to.have.any.keys('«')
    const selector = this.pages['«']
    if (!selector) {
      expect.fail('IMPOSSIBRU!')
    }
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
  'it should set "Next Page" selector' () {
    Pictures.MakePaginator(50)
    expect(this.pages).to.have.any.keys('»')
    const selector = this.pages['»']
    if (!selector) {
      expect.fail('IMPOSSIBRU!')
    }
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
  'it should set "Fixed Page" selectors' () {
    Pictures.MakePaginator(50)
    for (let i = 1; i <= 50; i++) {
      const key = `${i}`
      expect(this.pages).to.have.any.keys(key)
      const selector = this.pages[key]
      if (!selector) {
        expect.fail('IMPOSSIBRU!')
      }
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
      .map((_: unknown, i: number): Picture => {
        return {
          path: `/some/path/${i}.png`,
          name: `${i}.png`,
          seen: false
        }
      })
    this.tab = this.dom.window.document.querySelector('#tabImages')
  }

  after (): void {
    this.makePicturesPageSpy.restore()
    this.makePaginatorSpy.restore()
    super.after()
  }

  @test
  'it should add provided page to pictures tab' () {
    Pictures.MakeTab()
    expect(this.makePicturesPageSpy.calledWith(1)).to.equal(true)
    expect(this.tab?.querySelector('.page')).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should make pages according to pageSize' () {
    TestPics.pageSize = 2
    Pictures.MakeTab()
    expect(this.makePicturesPageSpy.callCount).to.equal(16)
    expect(this.tab?.querySelectorAll('.page')).to.have.length(16)
  }

  @test
  'it should make paginator' () {
    Pictures.MakeTab()
    expect(this.makePaginatorSpy.callCount).to.equal(1)
    expect(this.tab?.querySelector('.paginator')).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should omit pagniinator when MakePaginator returns null' () {
    this.makePaginatorSpy.returns(null)
    Pictures.MakeTab()
    expect(this.makePaginatorSpy.callCount).to.equal(1)
    expect(this.tab?.querySelector('.paginator')).to.equal(null)
  }
}

@suite
export class AppPicturesLoadImageTests extends BaseAppPicturesTests {
  totalCount: number = 1500
  current: Picture = {
    path: '',
    name: '',
    seen: false
  }

  element: HTMLElement | null = null
  postJSONSpy: Sinon.SinonStub = sinon.stub()
  selectPageSpy: Sinon.SinonStub = sinon.stub()
  loadingShowSpy: Sinon.SinonStub = sinon.stub()
  loadingErrorSpy: Sinon.SinonStub = sinon.stub()
  bottomLeftText: HTMLElement | null = null
  bottomCenterText: HTMLElement | null = null
  bottomRightText: HTMLElement | null = null

  before (): void {
    super.before()
    TestPics.pictures = Array.from({ length: this.totalCount })
      .map((_: unknown, i: number): Picture => {
        return {
          path: `/some/path/${i}.png`,
          name: `${i}.png`,
          seen: false
        }
      })
    this.current = TestPics.pictures[1250] || {
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
    this.selectPageSpy = sinon.stub(Pictures, 'SelectPage')
    Subscribe('Loading:Show', this.loadingShowSpy)
    Subscribe('Loading:Error', this.loadingErrorSpy)

    this.bottomCenterText = this.dom.window.document.querySelector('.statusBar.bottom .center')
    this.bottomLeftText = this.dom.window.document.querySelector('.statusBar.bottom .left')
    this.bottomRightText = this.dom.window.document.querySelector('.statusBar.bottom .right')
  }

  after (): void {
    this.postJSONSpy.restore()
    this.selectPageSpy.restore()
    super.after()
  }

  @test
  async 'it should be noop when current image is null' () {
    TestPics.current = null
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(false)
  }

  @test
  async 'it should publish Loading:Show' () {
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(true)
  }

  @test
  async 'it should set seen on current picture' () {
    expect(TestPics.current?.seen).to.equal(false)
    await Pictures.LoadImage()
    expect(TestPics.current?.seen).to.equal(true)
  }

  @test
  async 'it should set seen class on current menu element' () {
    expect(this.element?.classList.contains('seen')).to.equal(false)
    await Pictures.LoadImage()
    expect(this.element?.classList.contains('seen')).to.equal(true)
  }

  @test
  async 'it should post to /api/navigate/latest' () {
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
  async 'it should set src on image' () {
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('')
    await Pictures.LoadImage()
    expect(TestPics.mainImage?.getAttribute('src')).to.equal('/images/full/some/path/1250.png')
  }

  @test
  async 'it should set statusbar name' () {
    expect(this.bottomCenterText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomCenterText?.innerHTML).to.equal('1250.png')
  }

  @test
  async 'it should set statusbar percent' () {
    expect(this.bottomRightText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomRightText?.innerHTML).to.equal('(83.4%)')
  }

  @test
  async 'it should set statusbar position' () {
    expect(this.bottomLeftText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomLeftText?.innerHTML).to.equal('(1,251/1,500)')
  }

  @test
  async 'it should default to first image on missing index' () {
    if (!TestPics.current) expect.fail('Current Image must be set for valid test')
    TestPics.current.index = undefined
    await Pictures.LoadImage()
    expect(this.bottomLeftText?.innerHTML).to.equal('(1/1,500)')
    expect(this.bottomCenterText?.innerHTML).to.equal('1250.png')
    expect(this.bottomRightText?.innerHTML).to.equal('(0%)')
  }

  @test
  async 'it should select page of currnet image' () {
    await Pictures.LoadImage()
    expect(this.selectPageSpy.calledWith(40)).to.equal(true)
  }

  @test
  async 'it should select default page when current image omits page marker' () {
    if (!TestPics.current) expect.fail('Current Image must be set for valid test')
    TestPics.current.page = undefined
    await Pictures.LoadImage()
    expect(this.selectPageSpy.calledWith(1)).to.equal(true)
  }

  @test
  async 'it should publish error when process throws error' () {
    const expectedErr = new Error('IGGY WIGGY, LETS GET JIGGY')
    this.postJSONSpy.rejects(expectedErr)
    await Pictures.LoadImage()
    expect(this.loadingErrorSpy.calledWith(expectedErr)).to.equal(true)
  }

  @test
  async 'it should reload when navigate replies with undefined modcount' () {
    this.postJSONSpy.resolves(undefined)
    const spy = sinon.stub()
    PubSub.Subscribe('Navigate:Reload', spy)
    await Pictures.LoadImage()
    expect(spy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(false)
  }

  @test
  async 'it should reload when navigate replies with negative modcount' () {
    this.postJSONSpy.resolves(-1)
    const spy = sinon.stub()
    PubSub.Subscribe('Navigate:Reload', spy)
    await Pictures.LoadImage()
    expect(spy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(false)
  }

  @test
  async 'it should not reload when navigate replies with positive modcount' () {
    this.postJSONSpy.resolves(42)
    const spy = sinon.stub()
    PubSub.Subscribe('Navigate:Reload', spy)
    await Pictures.LoadImage()
    expect(spy.called).to.equal(false)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(true)
  }

  @test
  async 'it should pass retrieved modcount to next call to navigate/latest' () {
    const expected = Math.random() * 100000
    this.postJSONSpy.resolves(expected)
    const spy = sinon.stub()
    PubSub.Subscribe('Navigate:Reload', spy)
    await Pictures.LoadImage()
    await Pictures.LoadImage()
    expect(this.postJSONSpy.secondCall.args[1]).to.deep.equal({
      path: '/some/path/1250.png',
      modCount: expected
    })
    expect(spy.called).to.equal(false)
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
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage')
    Subscribe('Menu:Show', this.menuShowSpy)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Tab:Select', this.tabSelectSpy)
    this.pictures = Array.from({ length: 64 })
      .map((_, i) => {
        return {
          path: `/some/path/${i}.png`,
          name: `${i}.png`,
          seen: false,
          index: -1
        }
      })
  }

  after (): void {
    this.makeTabSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  @test
  'it should reset markup to clear tab' () {
    TestPics.mainImage = null
    const mainImage = this.dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    if (!mainImage) expect.fail('MainImage must exist for test to be valid')
    Pictures.LoadData({})
    expect(TestPics.mainImage).to.equal(mainImage)
  }

  @test
  'it should hide main image with null pictures' () {
    TestPics.mainImage?.classList.remove('hidden')
    Pictures.LoadData({
      pictures: undefined
    })
    expect(TestPics.mainImage?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should hide main image with empty pictures' () {
    TestPics.mainImage?.classList.remove('hidden')
    Pictures.LoadData({
      pictures: []
    })
    expect(TestPics.mainImage?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should publish Menu:Show on null pictures' () {
    Pictures.LoadData({
      pictures: undefined
    })
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Show on empty pictures' () {
    Pictures.LoadData({
      pictures: []
    })
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should hide tab label with null pictures' () {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    if (!tabLabel) expect.fail('Invalid markup to begin test')
    Pictures.LoadData({
      pictures: undefined
    })
    expect(tabLabel.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should hide tab label with empty pictures' () {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    if (!tabLabel) expect.fail('Invalid markup to begin test')
    tabLabel.classList.remove('hidden')
    Pictures.LoadData({
      pictures: []
    })
    expect(tabLabel.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should abort execution on null pictures' () {
    Pictures.LoadData({
      pictures: undefined
    })
    expect(this.makeTabSpy.called).to.equal(false)
    expect(this.tabSelectSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadImageSpy.called).to.equal(false)
  }

  @test
  'it should abort execution on empty pictures' () {
    Pictures.LoadData({
      pictures: []
    })
    expect(this.makeTabSpy.called).to.equal(false)
    expect(this.tabSelectSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadImageSpy.called).to.equal(false)
  }

  @test
  'it should remove hidden from main image when loading with pictures' () {
    TestPics.mainImage?.classList.add('hidden')
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(TestPics.mainImage?.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should show tab label when loading with pictures pictures' () {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    if (!tabLabel) expect.fail('Invalid markup to begin test')
    tabLabel.classList.add('hidden')
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(tabLabel.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should save pictuers list when loading pictuers' () {
    expect(TestPics.pictures).to.not.equal(this.pictures)
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(TestPics.pictures).to.equal(this.pictures)
  }

  @test
  'it should set selected image to cover image when match found' () {
    Pictures.LoadData({
      cover: '/some/path/42.png',
      pictures: this.pictures
    })
    expect(TestPics.current).to.equal(this.pictures[42])
  }

  @test
  'it should set selected image to cover image when no match found' () {
    Pictures.LoadData({
      cover: '/not/a/valid/path.png',
      pictures: this.pictures
    })
    expect(TestPics.current).to.equal(this.pictures[0])
  }

  @test
  'it should call maketab to generate relevant markup' () {
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.makeTabSpy.called).to.equal(true)
  }

  @test
  'it should publis Tab:Select to notify that the picture tab has been selected' () {
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.tabSelectSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Hide when loading pictures with no seen pics' () {
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
  'it should publish Menu:Hide when loading pictures with some seen pics' () {
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
  'it should publish Menu:Show when loading pictures with all seen pics' () {
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
  'it should publish Menu:Hide when loading pictures with all seen pics and noMenu flag set' () {
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
  'it should call LoadImage to load selected image' () {
    Pictures.LoadData({
      pictures: this.pictures
    })
    expect(this.loadImageSpy.called).to.equal(true)
  }

  @test
  'it should set index field of pictures' () {
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
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage')
    Subscribe('Menu:Show', this.menuShowSpy)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Tab:Select', this.tabSelectSpy)
    this.pictures = Array.from({ length: 64 })
      .map((_, i) => {
        return {
          path: `/some/path/${i}.png`,
          name: `${i}.png`,
          seen: i >= 16 && i < 48,
          index: -1
        }
      })
    Pictures.Init()
  }

  after (): void {
    this.makeTabSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  loadPictures () {
    Pictures.LoadData({
      pictures: this.pictures,
      cover: '/some/path/32.png'
    })
  }

  @test
  'it should return undefined when there is no current picture' () {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.First)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigateFirst on no pictures' () {
    TestPics.current = this.pictures[0] || null
    const pic = TestPics.GetPicture(NavigateTo.First)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return first picture on navigate first' () {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.First)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for PreviousUnread with unread ahead and behind' () {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[15])
  }

  @test
  'it should return expected for PreviousUnread with unread only behind' () {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i < 48
    })
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[63])
  }

  @test
  'it should return expected for PreviousUnread with unread only first' () {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i > 0
    })
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for PreviousUnread with no unread' () {
    this.loadPictures()
    this.pictures.forEach(pic => {
      pic.seen = true
    })
    const pic = TestPics.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for no pictures on navigate previous' () {
    TestPics.pictures = []
    TestPics.current = this.pictures[31] || null
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for null current picture on navigate previous' () {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for undefined current picture index on navigate previous' () {
    this.loadPictures()
    if (!TestPics.current) expect.fail('current picture should have been set')
    TestPics.current.index = undefined
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for zero current picture index on navigate previous' () {
    this.loadPictures()
    if (!TestPics.current) expect.fail('current picture should have been set')
    TestPics.current.index = 0
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return expected for current picture index = 1 on navigate previous' () {
    this.loadPictures()
    if (!TestPics.current) expect.fail('current picture should have been set')
    TestPics.current.index = 1
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for valid current picture index on navigate previous' () {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(this.pictures[31])
  }

  @test
  'it should return undefined for no pictures on navigate next' () {
    TestPics.pictures = []
    TestPics.current = this.pictures[31] || null
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for null current picture on navigate next' () {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for undefined current picture index on navigate next' () {
    this.loadPictures()
    if (!TestPics.current) expect.fail('current picture should have been set')
    TestPics.current.index = undefined
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for maximum current picture index on navigate next' () {
    this.loadPictures()
    if (!TestPics.current) expect.fail('current picture should have been set')
    TestPics.current.index = this.pictures.length - 1
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return expected for current picture index = max - 1  on navigate next' () {
    this.loadPictures()
    if (!TestPics.current) expect.fail('current picture should have been set')
    TestPics.current.index = this.pictures.length - 2
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(this.pictures[63])
  }

  @test
  'it should return expected for valid current picture index on navigate next' () {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(this.pictures[33])
  }

  @test
  'it should return expected for NextUnread with unread ahead and behind' () {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(this.pictures[48])
  }

  @test
  'it should return expected for NextUnread with unread only behind' () {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i >= 16
    })
    const pic = TestPics.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for NextUnread with no unread' () {
    this.loadPictures()
    this.pictures.forEach(pic => {
      pic.seen = true
    })
    const pic = TestPics.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigate last when there is no current picture' () {
    this.loadPictures()
    TestPics.current = null
    const pic = TestPics.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigateLast on no pictures' () {
    TestPics.current = this.pictures[0] || null
    const pic = TestPics.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return first picture on navigate last' () {
    this.loadPictures()
    const pic = TestPics.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(this.pictures[63])
  }
}

@suite
export class AppPicturesChangePictureTests extends BaseAppPicturesTests {
  isLoadingSpy: Sinon.SinonStub = sinon.stub()
  isLoading: boolean = false
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
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage')
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Loading:Error', this.loadingErrorSpy)
  }

  after (): void {
    this.isLoadingSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  @test
  'it should cleanly abort when currently loading' () {
    this.isLoading = true
    TestPics.ChangePicture(this.picture)
    expect(TestPics.current).to.equal(null)
    expect(this.loadImageSpy.called).to.equal(false)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
  }

  @test
  'it should publish error when changing to empty picture' () {
    TestPics.ChangePicture(undefined)
    expect(TestPics.current).to.equal(null)
    expect(this.loadImageSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadingErrorSpy.calledWithExactly('Change Picture called with No Picture to change to', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'it should trigger full image load when changing to a valid image' () {
    TestPics.ChangePicture(this.picture)
    expect(TestPics.current).to.equal(this.picture)
    expect(this.loadImageSpy.called).to.equal(true)
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
  }
}

@suite
export class AppPicturesGetSetShowUnreadOnly extends BaseAppPicturesTests {
  @test
  'it should default to showing all when local storage is not set' () {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    expect(TestPics.ShowUnreadOnly).to.equal(false)
  }

  @test
  'it should return false when local storage is set to invalid value' () {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'HELLO')
    expect(TestPics.ShowUnreadOnly).to.equal(false)
  }

  @test
  'it should return false when local storage is set to false' () {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'false')
    expect(TestPics.ShowUnreadOnly).to.equal(false)
  }

  @test
  'it should return true when local storage is set to true' () {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'true')
    expect(TestPics.ShowUnreadOnly).to.equal(true)
  }

  @test
  'it should set localstorage to stringified bolean on set to true' () {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    TestPics.ShowUnreadOnly = true
    const result = this.dom.window.localStorage.getItem('ShowUnseenOnly')
    expect(result).to.equal('true')
  }

  @test
  'it should set localstorage to stringified bolean on set to false' () {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    TestPics.ShowUnreadOnly = false
    const result = this.dom.window.localStorage.getItem('ShowUnseenOnly')
    expect(result).to.equal('false')
  }
}

@suite
export class AppPicturesUpdateUnreadSelectorSlider extends BaseAppPicturesTests {
  @test
  'it should remove unread class when not reading unread only' () {
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.add('unread')
    expect(element?.classList.contains('unread')).to.equal(true)
    TestPics.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('unread')).to.equal(false)
  }

  @test
  'it should add all class when not reading unread only' () {
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.remove('all')
    expect(element?.classList.contains('all')).to.equal(false)
    TestPics.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('all')).to.equal(true)
  }

  @test
  'it should add unread class when reading unread only' () {
    this.dom.window.localStorage.ShowUnseenOnly = 'true'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.remove('unread')
    expect(element?.classList.contains('unread')).to.equal(false)
    TestPics.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('unread')).to.equal(true)
  }

  @test
  'it should remove all class when reading unread only' () {
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
  ShowUnreadOnlyValue: boolean = false
  SliderDiv: HTMLDivElement | null = null

  before () {
    super.before()
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    this.UpdateUnreadSelectorSliderSpy = sinon.stub(Pictures, 'UpdateUnreadSelectorSlider')
    this.GetShowUnreadOnly = sinon.stub(Pictures, 'ShowUnreadOnly')
    this.GetShowUnreadOnly.get(() => this.ShowUnreadOnlyValue)
    this.SliderDiv = this.dom.window.document.querySelector('.selectUnreadAll')
  }

  after () {
    this.UpdateUnreadSelectorSliderSpy.restore()
    this.GetShowUnreadOnly.restore()
    super.after()
  }

  @test
  'it should call UpdateUnreasSelectoreSlider on intitial call' () {
    Pictures.InitUnreadSelectorSlider()
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(true)
  }

  @test
  'it should respond to click by calling UpdateUnreadSelectorSlider' () {
    Pictures.InitUnreadSelectorSlider()
    this.UpdateUnreadSelectorSliderSpy.reset()
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(false)
    const event = new this.dom.window.MouseEvent('click')
    this.SliderDiv?.dispatchEvent(event)
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(true)
  }

  @test
  'it should activate unread mode when in readall mode' () {
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
  'it should activate readall mode when in unread mode' () {
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
  ShowUnreadOnlyValue: boolean = false
  IsMenuActiveValue: boolean = false

  before () {
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
    TestPics.pictures = Array(21).fill(null).map((_, i) => {
      return {
        name: `${i}.jpg`,
        path: `/${i}.jpg`,
        seen: i >= 5 && i < 15,
        index: i
      }
    })
    TestPics.current = TestPics.pictures[10] || null
  }

  after () {
    this.GetIsMenuActive.restore()
    this.GetShowUnreadOnly.restore()
    this.StubChangePicture.restore()
    this.StubWindowOpen.restore()
    this.StubPostJson.restore()
    super.after()
  }

  @test
  'it should subscribe to ArrowUp' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWUP')
  }

  @test
  'it should publish ShowMenu for ArrowUp when menu is not active' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:ShowMenu', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowUp')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowUp when no pictures' () {
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
  'it should publish HideMenu for ArrowUp when menu is active' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to ArrowRight' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWRIGHT')
  }

  @test
  'it should publish Next for ArrowRight when menu is not active' () {
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:NEXT'] = []
    Subscribe('Action:Execute:Next', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowRight')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowRight when no pictures' () {
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
  'it should publish HideMenu for ArrowRight when menu is active' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowRight')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to ArrowLeft' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWLEFT')
  }

  @test
  'it should publish Previous for ArrowLeft when menu is not active' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:Previous', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowLeft when no pictures' () {
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
  'it should publish HideMenu for ArrowLeft when menu is active' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to ArrowDown' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:KEYPRESS:ARROWDOWN')
  }

  @test
  'it should publish ShowMenu for ArrowDown when menu is not active' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:ShowMenu', spy)
    expect(spy.called).to.equal(false)
    Publish('Action:Keypress:ArrowDown')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should not publish HideMenu for ArrowDown when no pictures' () {
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
  'it should publish HideMenu for ArrowDown when menu is active' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:HideMenu', spy)
    expect(spy.called).to.equal(false)
    this.IsMenuActiveValue = true
    Publish('Action:Keypress:ArrowLeft')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to Execute:Previous' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:PREVIOUS')
  }

  @test
  'it should execute PreviousUnseen when ShowUnreadOnly is true' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:PreviousUnseen', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = true
    Publish('Action:Execute:Previous')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should execute PreviousImage when ShowUnreadOnly is false' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:PreviousImage', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = false
    Publish('Action:Execute:Previous')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to Execute:PreviousImage' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:PREVIOUSIMAGE')
  }

  @test
  'it should subscribe to Execute:PreviousUnseen' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:PREVIOUSUNSEEN')
  }

  @test
  'it should subscribe to Execute:Next' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:NEXT')
  }

  @test
  'it should execute NextUnseen when ShowUnreadOnly is true' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:NextUnseen', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = true
    Publish('Action:Execute:Next')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should execute NextImage when ShowUnreadOnly is false' () {
    const spy = sinon.stub()
    Subscribe('Action:Execute:NextImage', spy)
    expect(spy.called).to.equal(false)
    this.ShowUnreadOnlyValue = false
    Publish('Action:Execute:Next')
    expect(spy.called).to.equal(true)
  }

  @test
  'it should subscribe to Execute:NextImage' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:NEXTIMAGE')
  }

  @test
  'it should subscribe to Execute:NextUnseen' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:NEXTUNSEEN')
  }

  @test
  'it should subscribe to Execute:ViewFullSize' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:VIEWFULLSIZE')
  }

  @test
  'it should open image when executing view full size' () {
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
  'it should subscribe to Execute:Bookmark' () {
    expect(PubSub.subscribers).to.contain.keys('ACTION:EXECUTE:BOOKMARK')
  }

  @test
  async 'it should post bookmarks add for Execute:Bookmark' () {
    const spy = sinon.stub()
    Subscribe('Bookmarks:Load', spy)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    Publish('Action:Execute:Bookmark')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
    expect(this.StubPostJson.called).to.equal(true)
    expect(this.StubPostJson.firstCall.args[0]).to.equal('/api/bookmarks/add')
  }

  @test
  async 'it should post expected payload for Execute:Bookmark' () {
    const spy = sinon.stub()
    Subscribe('Bookmarks:Load', spy)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    Publish('Action:Execute:Bookmark')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 10)
    })
    expect(this.StubPostJson.called).to.equal(true)
    expect(this.StubPostJson.firstCall.args[1]).to.deep.equal({
      path: '/Foo/Bar/Baz.jpg'
    })
  }

  @test
  async 'it should publish Bookmarks:load after Execute:Bookmark' () {
    const spy = sinon.stub()
    Subscribe('Bookmarks:Load', spy)
    TestPics.current = {
      path: '/Foo/Bar/Baz.jpg',
      name: 'Baz.jpg',
      seen: true
    }
    expect(spy.called).to.equal(false)
    Publish('Action:Execute:Bookmark')
    // let the callback finish
    await new Promise(resolve => {
      setTimeout(resolve, 10)
    })
    expect(spy.called).to.equal(true)
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

  before () {
    this.myVisualViewport = {
      scale: 1
    }
    this.visualViewport = this.myVisualViewport
    super.before()
    if (TestPics.mainImage != null && TestPics.mainImage.parentElement != null) {
      this.MainImageBoundingStub = sinon.stub(TestPics.mainImage.parentElement, 'getBoundingClientRect')
      this.MainImageBoundingStub.returns(this.boundingRect)
    }
    this.ClickTarget = TestPics.mainImage?.parentElement || null
    PubSub.subscribers['LOADING:ERROR'] = [() => 0]
  }

  after (): void {
    this.MainImageBoundingStub.restore()
    super.after()
  }

  @test
  'it should ignore click with zero width image area' () {
    const evt = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub()
    this.boundingRect.width = 0
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore click with null width image bounding rect' () {
    const evt = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub()
    this.MainImageBoundingStub.returns(null)
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate previous for left area click' () {
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
  'it should navigate previous for left area click with decreased visualViewport scale' () {
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
  'it should ignore left area click with increased visualViewport scale' () {
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
  'it should show menu for center area click' () {
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
  'it should show menu for center area click with decreased visualViewport scale' () {
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
  'it should ignore center area click with increased visualViewport scale' () {
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
  'it should navigate next for right area click' () {
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
  'it should navigate next for right area click with decreased visualViewport scale' () {
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
  'it should ignore right area click with increased visualViewport scale' () {
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
