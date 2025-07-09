'use sanity'

import { promisify } from 'util'

import { expect } from 'chai'
import { test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { Net } from '../../../public/scripts/app/net'
import { Publish, PubSub, Subscribe } from '../../../public/scripts/app/pubsub'
import { NavigateTo, Pictures } from '../../../public/scripts/app/pictures'
import type { PageSelector } from '../../../public/scripts/app/pictures'
import { Loading } from '../../../public/scripts/app/loading'
import { Navigation } from '../../../public/scripts/app/navigation'
import assert from 'assert'
import { Cast } from '../../testutils/TypeGuards'
import type { Listing, Picture } from '../../../contracts/listing'

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
  await promisify((cb) => {
    setTimeout(() => {
      cb(null, null)
    }, ms)
  })()
}

function ResetPictures(): void {
  Pictures.pictures = []
  Pictures.current = null
  Pictures.imageCard = null
  Pictures.mainImage = null
  Pictures.pageSize = 32
  Pictures.modCount = -1
  Pictures.nextPending = true
  Pictures.nextLoader = Promise.resolve()
}

abstract class BaseAppPicturesTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  document: Document
  dom: JSDOM
  tabSelectedSpy: sinon.SinonStub
  visualViewport: TestVisualViewport | undefined

  constructor() {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.document = global.document
    this.dom = new JSDOM('', {})
    this.tabSelectedSpy = sinon.stub()
    this.visualViewport = undefined
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

    // @ts-expect-error Ignore that visualviewport is read-only
    this.dom.window.visualViewport = this.visualViewport

    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.Subscribe('Tab:Selected', this.tabSelectedSpy)
    this.tabSelectedSpy.reset()

    ResetPictures()
    Pictures.Init()
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

export class AppPicturesCurrentPageTests extends BaseAppPicturesTests {
  @test
  'returns -1 for no pages'(): void {
    expect(Pictures.GetCurrentPage()).to.equal(-1)
  }

  @test
  'returns -1 for no active pages'(): void {
    const pages = this.document.createElement('div')
    pages.classList.add('pagination')
    for (let i = 1; i <= 10; i++) {
      const page = this.document.createElement('div')
      page.classList.add('page-item')
      pages.appendChild(page)
    }
    this.document.querySelector('body')?.appendChild(pages)
    expect(Pictures.GetCurrentPage()).to.equal(-1)
  }

  @test
  'returns number for active page'(): void {
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
    expect(Pictures.GetCurrentPage()).to.equal(activePage)
  }
}

export class AppPicturesSelectPageTests extends BaseAppPicturesTests {
  activePageLink: HTMLElement | undefined
  activePageElement: HTMLElement | undefined
  activePage = -1
  nextPageLink: HTMLElement | undefined
  nextPageElement: HTMLElement | undefined
  nextPage = 0
  totalpages = 8
  before(): void {
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
  'it does not publish error when called on no pages'(): void {
    const publishSpy = sinon.stub().resolves()
    Subscribe('Loading:Error', publishSpy)
    this.document.querySelector('.pagination')?.replaceChildren(this.document.createElement('div'))
    Pictures.SelectPage(0)
    Pictures.SelectPage(-1)
    Pictures.SelectPage(1e9)
    expect(publishSpy.called).to.equal(false)
  }

  @test
  'it publishes select of default page when called on no pages'(): void {
    const publishSpy = sinon.stub().resolves()
    Subscribe('Pictures:SelectPage', publishSpy)
    this.document.querySelector('.pagination')?.replaceChildren(this.document.createElement('div'))
    Pictures.SelectPage(0)
    expect(publishSpy.callCount).to.equal(1)
    expect(publishSpy.firstCall.args).to.have.lengthOf(2)
    expect(publishSpy.firstCall.args[0]).to.equal('Default Page Selected')
    expect(publishSpy.firstCall.args[1]).to.equal('PICTURES:SELECTPAGE')
  }

  @test
  'Publishes error when called on negative page'(): void {
    const publishSpy = sinon.stub().resolves()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(-1)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Publishes error when called on zero page'(): void {
    const publishSpy = sinon.stub().resolves()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(0)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Publishes error when called on huge page'(): void {
    const publishSpy = sinon.stub().resolves()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(this.totalpages + 1)
    expect(publishSpy.calledWithExactly('Invalid Page Index Selected', 'LOADING:ERROR')).to.equal(true)
  }

  @test
  'Does not publish error on valid page'(): void {
    const publishSpy = sinon.stub().resolves()
    Subscribe('Loading:Error', publishSpy)
    Pictures.SelectPage(this.activePage)
    expect(publishSpy.called).to.equal(false)
  }

  @test
  'Removes active class from current active page link when switching'(): void {
    expect(this.activePageLink?.classList.contains('active')).to.equal(true)
    Pictures.SelectPage(this.nextPage)
    expect(this.activePageLink?.classList.contains('active')).to.equal(false)
  }

  @test
  'Adds hidden class to current active page when switching'(): void {
    expect(this.activePageElement?.classList.contains('hidden')).to.equal(false)
    Pictures.SelectPage(this.nextPage)
    expect(this.activePageElement?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'Adds active class to next active page link when switching'(): void {
    expect(this.nextPageLink?.classList.contains('active')).to.equal(false)
    Pictures.SelectPage(this.nextPage)
    expect(this.nextPageLink?.classList.contains('active')).to.equal(true)
  }

  @test
  'Removes hidden class from next active page when switching'(): void {
    expect(this.nextPageElement?.classList.contains('hidden')).to.equal(true)
    Pictures.SelectPage(this.nextPage)
    expect(this.nextPageElement?.classList.contains('hidden')).to.equal(false)
  }

  @test
  'Publishes notification that page has been selected'(): void {
    const spy = sinon.stub().resolves()
    PubSub.Subscribe('Pictures:SelectPage', spy)
    Pictures.SelectPage(this.nextPage)
    expect(spy.called).to.equal(true)
  }

  @test
  'Does not publishes notification that page has been selected on error'(): void {
    const spy = sinon.stub().resolves()
    PubSub.Subscribe('Pictures:SelectPage', spy)
    Subscribe('Loading:Error', sinon.stub().resolves())
    Pictures.SelectPage(this.totalpages + 1)
    expect(spy.called).to.equal(false)
  }
}

export class AppPicturesMakePictureCardTests extends BaseAppPicturesTests {
  changePictureSpy: Sinon.SinonStub = Sinon.stub()

  before(): void {
    super.before()
    this.changePictureSpy = sinon.stub(Pictures, 'ChangePicture')
  }

  after(): void {
    this.changePictureSpy.restore()
    super.after()
  }

  @test
  'returns a HTMLElement'(): void {
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card).to.be.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'adds card to input picture'(): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    const card = Pictures.MakePictureCard(pic)
    expect(pic.element).to.equal(card)
  }

  @test
  'sets background image'(): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    const card = Pictures.MakePictureCard(pic)
    assert(card !== undefined)
    expect(card.getAttribute('data-backgroundImage')).to.equal(`url("/images/preview${pic.path}-image.webp")`)
  }

  @test
  'omits seen class when not seen'(): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    const card = Pictures.MakePictureCard(pic)
    assert(card !== undefined)
    expect(card.classList.contains('seen')).to.equal(pic.seen)
  }

  @test
  'sets seen class when seen'(): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: true,
    }
    const card = Pictures.MakePictureCard(pic)
    assert(card !== undefined)
    expect(card.classList.contains('seen')).to.equal(pic.seen)
  }

  @test
  'sets image title'(): void {
    const pic: Picture = {
      name: 'foobar' + Math.random(),
      path: '/foo/bar/baz.jpg',
      seen: true,
    }
    const card = Pictures.MakePictureCard(pic)
    assert(card !== undefined)
    expect(card.querySelector('h5')?.innerHTML).to.equal(pic.name)
  }

  @test
  'Registers click handler that updates current image'(): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    PubSub.Subscribe('Pictures:Load', async () => {
      await Promise.resolve()
    })
    PubSub.Subscribe('Menu:Hide', async () => {
      await Promise.resolve()
    })
    expect(Pictures.current).to.equal(null)
    const card = Pictures.MakePictureCard(pic)
    assert(card !== undefined)
    const event = new this.dom.window.MouseEvent('click')
    card.dispatchEvent(event)
    expect(this.changePictureSpy.calledOnceWithExactly(pic)).to.equal(true)
  }

  @test
  'Registers click handler that hides menu'(): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    let executed = false
    PubSub.Subscribe('Pictures:Load', async () => {
      await Promise.resolve()
    })
    PubSub.Subscribe('Menu:Hide', async () => {
      executed = true
      await Promise.resolve()
    })
    expect(Pictures.current).to.equal(null)
    const card = Pictures.MakePictureCard(pic)
    assert(card !== undefined)
    const event = new this.dom.window.MouseEvent('click')
    card.dispatchEvent(event)
    expect(executed).to.equal(true)
  }

  @test
  'Registers click handler that publishes Picture:Load'(): void {
    const pic: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    PubSub.Subscribe('Menu:Hide', async () => {
      await Promise.resolve()
    })
    expect(Pictures.current).to.equal(null)
    const card = Pictures.MakePictureCard(pic)
    assert(card !== undefined)
    const event = new this.dom.window.MouseEvent('click')
    card.dispatchEvent(event)
    expect(this.changePictureSpy.called).to.equal(true)
  }
}

export class AppPicturesMakePicturesPageTests extends BaseAppPicturesTests {
  makePics(count: number): Picture[] {
    const results: Picture[] = []
    for (let i = 1; i <= count; i++) {
      results.push({
        name: `Picture ${i}`,
        path: `/foo/bar/${i}.jpg`,
        seen: false,
      })
    }
    return results
  }

  @test
  'Returns a div element'(): void {
    const result = Pictures.MakePicturesPage(0, [])
    expect(result).to.be.an.instanceOf(this.dom.window.HTMLDivElement)
  }

  @test
  'adds page number to all pictures'(): void {
    const pics = this.makePics(20)
    const page = Math.ceil(Math.random() * 9000) + 1000
    Pictures.MakePicturesPage(page, pics)
    expect(pics.every((pic) => pic.page === page)).to.equal(true)
  }

  @test
  'creates cards for each picture'(): void {
    const pics = this.makePics(20)
    const results = Pictures.MakePicturesPage(1, pics)
    expect(results.querySelectorAll('div.card').length).to.equal(20)
  }

  @test
  'ignores undefined cards'(): void {
    const pics = this.makePics(20)
    const stub = Sinon.stub(Pictures, 'MakePictureCard').returns(undefined)
    try {
      const results = Pictures.MakePicturesPage(1, pics)
      expect(results.querySelectorAll('div.card').length).to.equal(0)
    } finally {
      stub.restore()
    }
  }
}

export class AppPicturesMakePaginatorItemTests extends BaseAppPicturesTests {
  selectPageSpy: Sinon.SinonStub = sinon.stub()
  before(): void {
    super.before()
    this.selectPageSpy = sinon.stub(Pictures, 'SelectPage')
    this.selectPageSpy.returns(undefined)
  }

  after(): void {
    this.selectPageSpy.restore()
    super.after()
  }

  @test
  'it returns an List Item Element'(): void {
    const result = Pictures.MakePaginatorItem('foobar', () => 0)
    expect(result).to.be.an.instanceOf(this.dom.window.HTMLLIElement)
  }

  @test
  'it sets inner span to provided label'(): void {
    const label = `LABEL ${Math.random()}`
    const result = Pictures.MakePaginatorItem(label, () => 0)
    assert(result !== undefined)
    expect(result.querySelector('span')?.innerHTML).to.equal(label)
  }

  @test
  'it adds click handler that calls selector to determine page index'(): void {
    const selector = sinon.stub()
    selector.returns(0)
    const item = Pictures.MakePaginatorItem('label', selector)
    assert(item !== undefined)
    const event = new this.dom.window.MouseEvent('click')
    expect(selector.called).to.equal(false)
    item.dispatchEvent(event)
    expect(selector.called).to.equal(true)
  }

  @test
  'it adds click handler that selects appropriate page'(): void {
    const expected = Math.ceil(Math.random() * 9000) + 1000
    const item = Pictures.MakePaginatorItem('label', () => expected)
    assert(item !== undefined)
    const event = new this.dom.window.MouseEvent('click')
    item.dispatchEvent(event)
    expect(this.selectPageSpy.calledOnceWithExactly(expected)).to.equal(true)
  }
}

export class AppPicturesMakePaginatorTests extends BaseAppPicturesTests {
  makeItemSpy: Sinon.SinonStub = sinon.stub()
  currentPageSpy: Sinon.SinonStub = sinon.stub()
  pages: Record<string, PageSelector> = {}
  before(): void {
    super.before()
    this.makeItemSpy = sinon.stub(Pictures, 'MakePaginatorItem')
    this.makeItemSpy.callsFake((title: string, fn: PageSelector) => {
      this.pages[title] = fn
      return this.dom.window.document.createElement('li')
    })
    this.currentPageSpy = sinon.stub(Pictures, 'GetCurrentPage')
  }

  after(): void {
    this.makeItemSpy.restore()
    this.currentPageSpy.restore()
    super.after()
  }

  @test
  'it should return null for fewer than two pages'(): void {
    expect(Pictures.MakePaginator(-5)).to.equal(null)
    expect(Pictures.MakePaginator(-1)).to.equal(null)
    expect(Pictures.MakePaginator(0)).to.equal(null)
    expect(Pictures.MakePaginator(1)).to.equal(null)
  }

  @test
  'it should return null for missing template'(): void {
    const template = this.document.querySelector('#Paginator')
    assert(template !== null)
    template.remove()
    expect(Pictures.MakePaginator(17)).to.equal(null)
  }

  @test
  'it should return an HTMLElement for two or more pages'(): void {
    expect(Pictures.MakePaginator(50)).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should include number of pages + 2 child elements'(): void {
    const result = Pictures.MakePaginator(50)
    const domItems = result?.querySelector('.pagination')
    expect(domItems?.children).to.have.length(52)
  }

  @test
  'it should set "Previous Page" selector'(): void {
    Pictures.MakePaginator(50)
    expect(this.pages).to.have.any.keys('«')
    const selector = this.pages['«']
    assert(selector != null, 'Selector must be found')
    const testCases = [
      [25, 24],
      [99, 98],
      [1, 1],
      [-12, 1],
    ]
    for (const [input, expected] of testCases) {
      this.currentPageSpy.returns(input)
      expect(selector()).to.equal(expected)
    }
  }

  @test
  'it should set "Next Page" selector'(): void {
    Pictures.MakePaginator(50)
    expect(this.pages).to.have.any.keys('»')
    const selector = this.pages['»']
    assert(selector != null, 'Selector must be found')
    const testCases = [
      [25, 26],
      [99, 50],
      [1, 2],
      [49, 50],
      [50, 50],
    ]
    for (const [input, expected] of testCases) {
      this.currentPageSpy.returns(input)
      expect(selector()).to.equal(expected)
    }
  }

  @test
  'it should set "Fixed Page" selectors'(): void {
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

export class AppPicturesMakeTabTests extends BaseAppPicturesTests {
  makePicturesPageSpy: Sinon.SinonStub = sinon.stub()
  makePaginatorSpy: Sinon.SinonStub = sinon.stub()
  tab: HTMLElement | null = null
  before(): void {
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
    Pictures.pictures = Array.from({ length: 32 }).map(
      (_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false,
      }),
    )
    this.tab = this.dom.window.document.querySelector('#tabImages')
  }

  after(): void {
    this.makePicturesPageSpy.restore()
    this.makePaginatorSpy.restore()
    super.after()
  }

  @test
  'it should add provided page to pictures tab'(): void {
    Pictures.MakeTab()
    expect(this.makePicturesPageSpy.calledWith(1)).to.equal(true)
    expect(this.tab?.querySelector('.page')).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should make pages according to pageSize'(): void {
    Pictures.pageSize = 2
    Pictures.MakeTab()
    expect(this.makePicturesPageSpy.callCount).to.equal(16)
    expect(this.tab?.querySelectorAll('.page')).to.have.length(16)
  }

  @test
  'it should make paginator'(): void {
    Pictures.MakeTab()
    expect(this.makePaginatorSpy.callCount).to.equal(1)
    expect(this.tab?.querySelector('.paginator')).to.be.an.instanceOf(this.dom.window.HTMLElement)
  }

  @test
  'it should omit pagniinator when MakePaginator returns null'(): void {
    this.makePaginatorSpy.returns(null)
    Pictures.MakeTab()
    expect(this.makePaginatorSpy.callCount).to.equal(1)
    expect(this.tab?.querySelector('.paginator')).to.equal(null)
  }
}

export class AppPicturesLoadCurrentPageImagesTests extends BaseAppPicturesTests {
  tab: HTMLElement | null = null
  before(): void {
    super.before()
    Pictures.pictures = Array.from({ length: 32 }).map(
      (_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false,
      }),
    )
    Pictures.MakeTab()
    this.tab = this.dom.window.document.querySelector('#tabImages')
  }

  after(): void {
    super.after()
  }

  @test
  'it should add background image to active page(s)'(): void {
    const cards = this.tab?.querySelectorAll<HTMLElement>('.page:not(.hidden) .card')
    assert(cards != null)
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
  'it should not add background image to card with blank data attribute'(): void {
    const cards = this.tab?.querySelectorAll<HTMLElement>('.page:not(.hidden) .card')
    assert(cards != null)
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
  'it should not add background image to card missing data attribute'(): void {
    const cards = this.tab?.querySelectorAll<HTMLElement>('.page:not(.hidden) .card')
    assert(cards != null)
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

export class AppPicturesLoadImageTests extends BaseAppPicturesTests {
  totalCount = 1500
  current: Picture = {
    path: '',
    name: '',
    seen: false,
  }

  element: HTMLElement | null = null
  postJSONSpy: Sinon.SinonStub = sinon.stub()
  selectPageSpy: Sinon.SinonStub = sinon.stub()
  getPictureSpy: sinon.SinonStub = sinon.stub()
  loadingShowSpy: Sinon.SinonStub = sinon.stub().resolves()
  loadingErrorSpy: Sinon.SinonStub = sinon.stub().resolves()
  loadNewSpy: Sinon.SinonStub = sinon.stub().resolves()
  fetchStub: sinon.SinonStub = sinon.stub()
  bottomLeftText: HTMLElement | null = null
  bottomCenterText: HTMLElement | null = null
  bottomRightText: HTMLElement | null = null
  reloadSpy: Sinon.SinonStub = sinon.stub().resolves()

  before(): void {
    super.before()
    Pictures.pictures = Array.from({ length: this.totalCount }).map(
      (_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false,
      }),
    )
    this.current = Pictures.pictures[1250] ?? {
      path: '',
      name: '',
      seen: false,
    }
    Pictures.current = this.current

    this.element = this.dom.window.document.createElement('div')
    this.current.element = this.element
    this.current.page = 40
    this.current.index = 1250
    this.postJSONSpy = sinon.stub(Net, 'PostJSON')
    this.postJSONSpy.resolves(50)
    this.fetchStub = sinon.stub(global, 'fetch').resolves()
    this.getPictureSpy = sinon.stub(Pictures, 'GetPicture').returns(undefined)
    this.selectPageSpy = sinon.stub(Pictures, 'SelectPage')
    this.reloadSpy = sinon.stub().resolves()
    Subscribe('Loading:Show', this.loadingShowSpy)
    Subscribe('Loading:Error', this.loadingErrorSpy)
    Subscribe('Picture:LoadNew', this.loadNewSpy)
    Subscribe('Navigate:Reload', this.reloadSpy)

    this.bottomCenterText = this.dom.window.document.querySelector('.statusBar.bottom .center')
    this.bottomLeftText = this.dom.window.document.querySelector('.statusBar.bottom .left')
    this.bottomRightText = this.dom.window.document.querySelector('.statusBar.bottom .right')
  }

  after(): void {
    this.postJSONSpy.restore()
    this.selectPageSpy.restore()
    this.getPictureSpy.restore()
    this.fetchStub.restore()
    super.after()
  }

  @test
  async 'it should be noop when current image is null'(): Promise<void> {
    Pictures.current = null
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(false)
  }

  @test
  async 'it should not await next loader when image is null'(): Promise<void> {
    Pictures.current = null
    let awaited = false
    Pictures.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(false)
  }

  @test
  async 'it should publish Loading:Show when next is pending'(): Promise<void> {
    Pictures.nextPending = true
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(true)
  }

  @test
  async 'it should not publish Loading:Show when next is not pending'(): Promise<void> {
    Pictures.nextPending = false
    await Pictures.LoadImage()
    expect(this.loadingShowSpy.called).to.equal(false)
  }

  @test
  async 'it should set seen on current picture'(): Promise<void> {
    expect(Pictures.current?.seen).to.equal(false)
    await Pictures.LoadImage()
    expect(Pictures.current?.seen).to.equal(true)
  }

  @test
  async 'it should set seen class on current menu element'(): Promise<void> {
    expect(this.element?.classList.contains('seen')).to.equal(false)
    await Pictures.LoadImage()
    expect(this.element?.classList.contains('seen')).to.equal(true)
  }

  @test
  async 'it should post to /api/navigate/latest'(): Promise<void> {
    Pictures.modCount = 50
    await Pictures.LoadImage()
    expect(this.postJSONSpy.callCount).to.equal(1)
    expect(this.postJSONSpy.calledWith('/api/navigate/latest')).to.equal(true)
    expect(this.postJSONSpy.firstCall.args[1]).to.deep.equal({
      path: '/some/path/1250.png',
      modCount: 50,
    })
  }

  @test
  async 'it should accept number from PostJSON'(): Promise<void> {
    Pictures.modCount = 50
    await Pictures.LoadImage()
    expect(this.postJSONSpy.callCount).to.equal(1)
    const fn = Cast(
      this.postJSONSpy.firstCall.args[2],
      (o: unknown): o is (_: unknown) => unknown => typeof o === 'function',
    )
    expect(fn(undefined)).to.equal(true)
    expect(fn(50)).to.equal(true)
    expect(fn('foo')).to.equal(false)
    expect(fn(null)).to.equal(false)
    expect(fn({})).to.equal(false)
    expect(fn(false)).to.equal(false)
  }

  @test
  async 'it should await next loader when loading image'(): Promise<void> {
    let awaited = false
    Pictures.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(true)
  }

  @test
  async 'it should set src on image'(): Promise<void> {
    expect(Pictures.mainImage?.getAttribute('src')).to.equal('')
    await Pictures.LoadImage()
    expect(Pictures.mainImage?.getAttribute('src')).to.equal('/images/scaled/0/0/some/path/1250.png-image.webp')
  }

  @test
  async 'it should set src height on image'(): Promise<void> {
    expect(Pictures.mainImage?.getAttribute('src')).to.equal('')
    assert(Pictures.mainImage !== null)
    Pictures.mainImage.height = 512
    await Pictures.LoadImage()
    expect(Pictures.mainImage.getAttribute('src')).to.equal('/images/scaled/0/512/some/path/1250.png-image.webp')
  }

  @test
  async 'it should set src width on image'(): Promise<void> {
    expect(Pictures.mainImage?.getAttribute('src')).to.equal('')
    assert(Pictures.mainImage !== null)
    Pictures.mainImage.width = 1024
    await Pictures.LoadImage()
    expect(Pictures.mainImage.getAttribute('src')).to.equal('/images/scaled/1024/0/some/path/1250.png-image.webp')
  }

  @test
  async 'it should set statusbar name'(): Promise<void> {
    expect(this.bottomCenterText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomCenterText?.innerHTML).to.equal('1250.png')
  }

  @test
  async 'it should set statusbar percent'(): Promise<void> {
    expect(this.bottomRightText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomRightText?.innerHTML).to.equal('(83.4%)')
  }

  @test
  async 'it should set statusbar position'(): Promise<void> {
    expect(this.bottomLeftText?.innerHTML).to.equal('')
    await Pictures.LoadImage()
    expect(this.bottomLeftText?.innerHTML).to.equal('(1,251/1,500)')
  }

  @test
  async 'it should default to first image on missing index'(): Promise<void> {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.index = undefined
    await Pictures.LoadImage()
    expect(this.bottomLeftText?.innerHTML).to.equal('(1/1,500)')
    expect(this.bottomCenterText?.innerHTML).to.equal('1250.png')
    expect(this.bottomRightText?.innerHTML).to.equal('(0%)')
  }

  @test
  async 'it should select page of currnet image'(): Promise<void> {
    await Pictures.LoadImage()
    expect(this.selectPageSpy.calledWith(40)).to.equal(true)
  }

  @test
  async 'it should select default page when current image omits page marker'(): Promise<void> {
    assert(Pictures.current != null, 'Current Image must be set for valid test')
    Pictures.current.page = undefined
    await Pictures.LoadImage()
    expect(this.selectPageSpy.calledWith(1)).to.equal(true)
  }

  @test
  async 'it should publish error when process throws error'(): Promise<void> {
    const expectedErr = new Error('IGGY WIGGY, LETS GET JIGGY')
    this.postJSONSpy.rejects(expectedErr)
    await Pictures.LoadImage()
    expect(this.loadingErrorSpy.calledWith(expectedErr)).to.equal(true)
  }

  @test
  async 'it should reload when navigate replies with undefined modcount'(): Promise<void> {
    this.postJSONSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(this.reloadSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(false)
  }

  @test
  async 'it should reload when navigate replies with negative modcount'(): Promise<void> {
    this.postJSONSpy.resolves(-1)
    await Pictures.LoadImage()
    expect(this.reloadSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(false)
  }

  @test
  async 'it should not await next loader navigate returns undefined modcount'(): Promise<void> {
    this.postJSONSpy.resolves()
    let awaited = false
    Pictures.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(false)
  }

  @test
  async 'it should not await next loader navigate returns negative modcount'(): Promise<void> {
    this.postJSONSpy.resolves(-1)
    let awaited = false
    Pictures.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(false)
  }

  @test
  async 'it should not reload when navigate replies with positive modcount'(): Promise<void> {
    this.postJSONSpy.resolves(42)
    await Pictures.LoadImage()
    expect(this.reloadSpy.called).to.equal(false)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.selectPageSpy.called).to.equal(true)
  }

  @test
  async 'it should pass retrieved modcount to next call to navigate/latest'(): Promise<void> {
    const expected = Math.random() * 100000
    this.postJSONSpy.resolves(expected)
    await Pictures.LoadImage()
    await Pictures.LoadImage()
    expect(this.postJSONSpy.secondCall.args[1]).to.deep.equal({
      path: '/some/path/1250.png',
      modCount: expected,
    })
    expect(this.reloadSpy.called).to.equal(false)
  }

  @test
  async 'it should get next picture when ShowUnreadOnly is not set'(): Promise<void> {
    Pictures.SetShowUnreadOnly(false)
    await Pictures.LoadImage()
    expect(this.getPictureSpy.callCount).to.equal(1)
    expect(this.getPictureSpy.firstCall.args).to.deep.equal([NavigateTo.Next])
  }

  @test
  async 'it should get next unread picture when ShowUnreadOnly is set'(): Promise<void> {
    Pictures.SetShowUnreadOnly(true)
    await Pictures.LoadImage()
    expect(this.getPictureSpy.callCount).to.equal(1)
    expect(this.getPictureSpy.firstCall.args).to.deep.equal([NavigateTo.NextUnread])
  }

  @test
  async 'it should not set next pending to false when there is no next image'(): Promise<void> {
    Pictures.nextPending = true
    this.getPictureSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(Pictures.nextPending).to.equal(false)
  }

  @test
  async 'it should request expected next URI'(): Promise<void> {
    Pictures.nextPending = false
    this.getPictureSpy.returns({ path: '/foo.png' })
    assert(Pictures.mainImage !== null)
    Pictures.mainImage.width = 1000
    Pictures.mainImage.height = 900
    await Pictures.LoadImage()
    expect(this.fetchStub.callCount).to.equal(1)
    expect(this.fetchStub.firstCall.args).to.have.lengthOf(1)
    expect(this.fetchStub.firstCall.args[0]).to.equal('/images/scaled/1000/900/foo.png-image.webp')
  }

  @test
  async 'it should set next pending to false when there is next image'(): Promise<void> {
    Pictures.nextPending = false
    this.getPictureSpy.resolves({ path: 'foo.png' })
    const delay = Delay(1)
    this.fetchStub.resolves(delay)
    await Pictures.LoadImage()
    expect(Pictures.nextPending).to.equal(true)
    await delay
  }

  @test
  async 'it should clear next pending when next fetch resolves'(): Promise<void> {
    Pictures.nextPending = false
    this.getPictureSpy.resolves({ path: 'foo.png' })
    const delay = Delay(1)
    this.fetchStub.resolves(delay)
    await Pictures.LoadImage()
    expect(Pictures.nextPending).to.equal(true)
    await delay
    expect(Pictures.nextPending).to.equal(false)
  }

  @test
  async 'it should clear next pending when next fetch rejects'(): Promise<void> {
    Pictures.nextPending = false
    this.getPictureSpy.resolves({ path: 'foo.png' })
    const delay = Delay(1).then(async () => {
      await Promise.reject(new Error('WAARIO!'))
    })
    this.fetchStub.resolves(delay)
    await Pictures.LoadImage()
    expect(Pictures.nextPending).to.equal(true)
    await delay.catch(() => null)
    expect(Pictures.nextPending).to.equal(false)
  }

  @test
  async 'it should publish Picture:LoadNew on success'(): Promise<void> {
    await Pictures.LoadImage()
    expect(this.loadNewSpy.callCount).to.equal(1)
  }

  @test
  async 'it should not publish Picture:LoadNew on error'(): Promise<void> {
    this.postJSONSpy.rejects('nope')
    await Pictures.LoadImage()
    expect(this.loadNewSpy.callCount).to.equal(0)
  }

  @test
  async 'it should not publish Picture:LoadNew on navigate:reload'(): Promise<void> {
    this.postJSONSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(this.loadNewSpy.callCount).to.equal(0)
  }
}

export class AppPicturesLoadDataTests extends BaseAppPicturesTests {
  makeTabSpy: Sinon.SinonStub = sinon.stub()
  loadImageSpy: Sinon.SinonStub = sinon.stub()
  menuShowSpy: Sinon.SinonStub = sinon.stub().resolves()
  menuHideSpy: Sinon.SinonStub = sinon.stub().resolves()
  tabSelectSpy: Sinon.SinonStub = sinon.stub().resolves()
  pictures: Picture[] = []
  before(): void {
    super.before()
    this.makeTabSpy = sinon.stub(Pictures, 'MakeTab')
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage').resolves(undefined)
    Subscribe('Menu:Show', this.menuShowSpy)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Tab:Select', this.tabSelectSpy)
    this.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: false,
      index: -1,
    }))
  }

  after(): void {
    this.makeTabSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  @test
  async 'it should tolerate LoadImage rejecting'(): Promise<void> {
    const awaiter = Delay(1)
    this.loadImageSpy.rejects(new Error('FOO!'))
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    await awaiter
    expect(this.loadImageSpy.called).to.equal(true)
  }

  @test
  'it should reset markup to clear tab'(): void {
    Pictures.mainImage = null
    const mainImage = this.dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(mainImage != null, 'MainImage must exist for test to be valid')
    Pictures.LoadData(Cast<Listing>({}))
    expect(Pictures.mainImage).to.equal(mainImage)
  }

  @test
  'it should hide main image with null pictures'(): void {
    Pictures.mainImage?.classList.remove('hidden')
    Pictures.LoadData(
      Cast<Listing>({
        pictures: undefined,
      }),
    )
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should hide main image with empty pictures'(): void {
    Pictures.mainImage?.classList.remove('hidden')
    Pictures.LoadData(
      Cast<Listing>({
        pictures: [],
      }),
    )
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should publish Menu:Show on null pictures'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: undefined,
      }),
    )
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Show on empty pictures'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: [],
      }),
    )
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should hide tab label with null pictures'(): void {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    assert(tabLabel != null, 'Invalid markup to begin test')
    Pictures.LoadData(
      Cast<Listing>({
        pictures: undefined,
      }),
    )
    expect(tabLabel.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should hide tab label with empty pictures'(): void {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    assert(tabLabel != null, 'Invalid markup to begin test')
    tabLabel.classList.remove('hidden')
    Pictures.LoadData(
      Cast<Listing>({
        pictures: [],
      }),
    )
    expect(tabLabel.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should abort execution on null pictures'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: undefined,
      }),
    )
    expect(this.makeTabSpy.called).to.equal(false)
    expect(this.tabSelectSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadImageSpy.called).to.equal(false)
  }

  @test
  'it should abort execution on empty pictures'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: [],
      }),
    )
    expect(this.makeTabSpy.called).to.equal(false)
    expect(this.tabSelectSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadImageSpy.called).to.equal(false)
  }

  @test
  'it shoudl aboirt execution when mainImage is missing'(): void {
    this.document.querySelector<HTMLImageElement>('#bigImage img')?.remove()
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(this.makeTabSpy.called).to.equal(false)
    expect(this.tabSelectSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.loadImageSpy.called).to.equal(false)
  }

  @test
  'it should remove hidden from main image when loading with pictures'(): void {
    Pictures.mainImage?.classList.add('hidden')
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should show tab label when loading with pictures pictures'(): void {
    const tabLabel = this.dom.window.document.querySelector('a[href="#tabImages"]')?.parentElement
    assert(tabLabel != null, 'Invalid markup to begin test')
    tabLabel.classList.add('hidden')
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(tabLabel.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should save pictuers list when loading pictuers'(): void {
    expect(Pictures.pictures).to.not.equal(this.pictures)
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(Pictures.pictures).to.equal(this.pictures)
  }

  @test
  'it should set selected image to cover image when match found'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        cover: '/some/path/42.png',
        pictures: this.pictures,
      }),
    )
    expect(Pictures.current).to.equal(this.pictures[42])
  }

  @test
  'it should set selected image to cover image when no match found'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        cover: '/not/a/valid/path.png',
        pictures: this.pictures,
      }),
    )
    expect(Pictures.current).to.equal(this.pictures[0])
  }

  @test
  'it should call maketab to generate relevant markup'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(this.makeTabSpy.called).to.equal(true)
  }

  @test
  'it should publis Tab:Select to notify that the picture tab has been selected'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(this.tabSelectSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Hide when loading pictures with no seen pics'(): void {
    this.pictures.forEach((pic) => {
      pic.seen = false
    })
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.menuShowSpy.called).to.equal(false)
  }

  @test
  'it should publish Menu:Hide when loading pictures with some seen pics'(): void {
    this.pictures.forEach((pic, i) => {
      pic.seen = i % 2 === 0
    })
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.menuShowSpy.called).to.equal(false)
  }

  @test
  'it should publish Menu:Show when loading pictures with all seen pics'(): void {
    this.pictures.forEach((pic) => {
      pic.seen = true
    })
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(this.menuHideSpy.called).to.equal(false)
    expect(this.menuShowSpy.called).to.equal(true)
  }

  @test
  'it should publish Menu:Hide when loading pictures with all seen pics and noMenu flag set'(): void {
    this.pictures.forEach((pic) => {
      pic.seen = true
    })
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
        noMenu: true,
      }),
    )
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.menuShowSpy.called).to.equal(false)
  }

  @test
  'it should call LoadImage to load selected image'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    expect(this.loadImageSpy.called).to.equal(true)
  }

  @test
  'it should set index field of pictures'(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
      }),
    )
    for (let i = 0; i < this.pictures.length; i++) {
      expect(Pictures.pictures[i]?.index).to.equal(i)
    }
  }
}

export class AppPicturesGetPictureTests extends BaseAppPicturesTests {
  makeTabSpy: Sinon.SinonStub = sinon.stub()
  loadImageSpy: Sinon.SinonStub = sinon.stub()
  menuShowSpy: Sinon.SinonStub = sinon.stub().resolves()
  menuHideSpy: Sinon.SinonStub = sinon.stub().resolves()
  tabSelectSpy: Sinon.SinonStub = sinon.stub().resolves()
  pictures: Picture[] = []

  before(): void {
    super.before()
    this.makeTabSpy = sinon.stub(Pictures, 'MakeTab')
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage').resolves(undefined)
    Subscribe('Menu:Show', this.menuShowSpy)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Tab:Select', this.tabSelectSpy)
    this.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: i >= 16 && i < 48,
      index: -1,
    }))
    Pictures.Init()
  }

  after(): void {
    this.makeTabSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  loadPictures(): void {
    Pictures.LoadData(
      Cast<Listing>({
        pictures: this.pictures,
        cover: '/some/path/32.png',
      }),
    )
  }

  @test
  'it should return undefined when there is no current picture'(): void {
    this.loadPictures()
    Pictures.current = null
    const pic = Pictures.GetPicture(NavigateTo.First)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigateFirst on no pictures'(): void {
    Pictures.current = this.pictures[0] ?? null
    const pic = Pictures.GetPicture(NavigateTo.First)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return first picture on navigate first'(): void {
    this.loadPictures()
    const pic = Pictures.GetPicture(NavigateTo.First)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for PreviousUnread with unread ahead and behind'(): void {
    this.loadPictures()
    const pic = Pictures.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[15])
  }

  @test
  'it should return expected for PreviousUnread with unread only behind'(): void {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i < 48
    })
    const pic = Pictures.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[63])
  }

  @test
  'it should return expected for PreviousUnread with unread only first'(): void {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i > 0
    })
    const pic = Pictures.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for PreviousUnread with no unread'(): void {
    this.loadPictures()
    this.pictures.forEach((pic) => {
      pic.seen = true
    })
    const pic = Pictures.GetPicture(NavigateTo.PreviousUnread)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for no pictures on navigate previous'(): void {
    Pictures.pictures = []
    Pictures.current = this.pictures[31] ?? null
    const pic = Pictures.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for null current picture on navigate previous'(): void {
    this.loadPictures()
    Pictures.current = null
    const pic = Pictures.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for undefined current picture index on navigate previous'(): void {
    this.loadPictures()
    assert(Pictures.current != null, 'current picture should have been set')
    Pictures.current.index = undefined
    const pic = Pictures.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for zero current picture index on navigate previous'(): void {
    this.loadPictures()
    assert(Pictures.current != null, 'current picture should have been set')
    Pictures.current.index = 0
    const pic = Pictures.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return expected for current picture index = 1 on navigate previous'(): void {
    this.loadPictures()
    assert(Pictures.current != null, 'current picture should have been set')
    Pictures.current.index = 1
    const pic = Pictures.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for valid current picture index on navigate previous'(): void {
    this.loadPictures()
    const pic = Pictures.GetPicture(NavigateTo.Previous)
    expect(pic).to.equal(this.pictures[31])
  }

  @test
  'it should return undefined for no pictures on navigate next'(): void {
    Pictures.pictures = []
    Pictures.current = this.pictures[31] ?? null
    const pic = Pictures.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for null current picture on navigate next'(): void {
    this.loadPictures()
    Pictures.current = null
    const pic = Pictures.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for undefined current picture index on navigate next'(): void {
    this.loadPictures()
    assert(Pictures.current != null, 'current picture should have been set')
    Pictures.current.index = undefined
    const pic = Pictures.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for maximum current picture index on navigate next'(): void {
    this.loadPictures()
    assert(Pictures.current != null, 'current picture should have been set')
    Pictures.current.index = this.pictures.length - 1
    const pic = Pictures.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return expected for current picture index = max - 1  on navigate next'(): void {
    this.loadPictures()
    assert(Pictures.current != null, 'current picture should have been set')
    Pictures.current.index = this.pictures.length - 2
    const pic = Pictures.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(this.pictures[63])
  }

  @test
  'it should return expected for valid current picture index on navigate next'(): void {
    this.loadPictures()
    const pic = Pictures.GetPicture(NavigateTo.Next)
    expect(pic).to.equal(this.pictures[33])
  }

  @test
  'it should return expected for NextUnread with unread ahead and behind'(): void {
    this.loadPictures()
    const pic = Pictures.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(this.pictures[48])
  }

  @test
  'it should return expected for NextUnread with unread only behind'(): void {
    this.loadPictures()
    this.pictures.forEach((pic, i) => {
      pic.seen = i >= 16
    })
    const pic = Pictures.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(this.pictures[0])
  }

  @test
  'it should return expected for NextUnread with no unread'(): void {
    this.loadPictures()
    this.pictures.forEach((pic) => {
      pic.seen = true
    })
    const pic = Pictures.GetPicture(NavigateTo.NextUnread)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigate last when there is no current picture'(): void {
    this.loadPictures()
    Pictures.current = null
    const pic = Pictures.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return undefined for navigateLast on no pictures'(): void {
    Pictures.current = this.pictures[0] ?? null
    const pic = Pictures.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(undefined)
  }

  @test
  'it should return first picture on navigate last'(): void {
    this.loadPictures()
    const pic = Pictures.GetPicture(NavigateTo.Last)
    expect(pic).to.equal(this.pictures[63])
  }
}

export class AppPicturesChangePictureTests extends BaseAppPicturesTests {
  isLoadingSpy: Sinon.SinonStub = sinon.stub()
  isLoading = false
  loadImageSpy: Sinon.SinonStub = sinon.stub().resolves()
  menuHideSpy: Sinon.SinonStub = sinon.stub().resolves()
  loadingErrorSpy: Sinon.SinonStub = sinon.stub().resolves()

  picture: Picture = {
    path: '/some/path/8472.png',
    name: '8472.png',
    seen: false,
    index: -1,
  }

  before(): void {
    super.before()
    Pictures.current = null
    this.isLoadingSpy = sinon.stub(Loading, 'IsLoading')
    this.isLoadingSpy.callsFake(() => this.isLoading)
    this.isLoading = false
    this.loadImageSpy = sinon.stub(Pictures, 'LoadImage').resolves(undefined)
    Subscribe('Menu:Hide', this.menuHideSpy)
    Subscribe('Loading:Error', this.loadingErrorSpy)
  }

  after(): void {
    this.isLoadingSpy.restore()
    this.loadImageSpy.restore()
    super.after()
  }

  @test
  'it should cleanly abort when currently loading'(): void {
    this.isLoading = true
    Pictures.ChangePicture(this.picture)
    expect(Pictures.current).to.equal(null)
    expect(this.loadImageSpy.called).to.equal(false)
    expect(this.loadingErrorSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
  }

  @test
  'it should publish error when changing to empty picture'(): void {
    Pictures.ChangePicture(undefined)
    expect(Pictures.current).to.equal(null)
    expect(this.loadImageSpy.called).to.equal(false)
    expect(this.menuHideSpy.called).to.equal(false)
    expect(
      this.loadingErrorSpy.calledWithExactly('Change Picture called with No Picture to change to', 'LOADING:ERROR'),
    ).to.equal(true)
  }

  @test
  'it should trigger full image load when changing to a valid image'(): void {
    Pictures.ChangePicture(this.picture)
    expect(Pictures.current).to.equal(this.picture)
    expect(this.loadImageSpy.called).to.equal(true)
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
  }

  @test
  'it should tolerate LoadImage rejecting'(): void {
    this.loadImageSpy.rejects(new Error('FOO!'))
    Pictures.ChangePicture(this.picture)
    expect(this.loadImageSpy.called).to.equal(true)
    expect(this.menuHideSpy.called).to.equal(true)
    expect(this.loadingErrorSpy.called).to.equal(false)
  }
}

export class AppPicturesGetSetShowUnreadOnly extends BaseAppPicturesTests {
  @test
  'it should default to showing all when local storage is not set'(): void {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    expect(Pictures.GetShowUnreadOnly()).to.equal(false)
  }

  @test
  'it should return false when local storage is set to invalid value'(): void {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'HELLO')
    expect(Pictures.GetShowUnreadOnly()).to.equal(false)
  }

  @test
  'it should return false when local storage is set to false'(): void {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'false')
    expect(Pictures.GetShowUnreadOnly()).to.equal(false)
  }

  @test
  'it should return true when local storage is set to true'(): void {
    this.dom.window.localStorage.setItem('ShowUnseenOnly', 'true')
    expect(Pictures.GetShowUnreadOnly()).to.equal(true)
  }

  @test
  'it should set localstorage to stringified bolean on set to true'(): void {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    Pictures.SetShowUnreadOnly(true)
    const result = this.dom.window.localStorage.getItem('ShowUnseenOnly')
    expect(result).to.equal('true')
  }

  @test
  'it should set localstorage to stringified bolean on set to false'(): void {
    this.dom.window.localStorage.removeItem('ShowUnseenOnly')
    Pictures.SetShowUnreadOnly(false)
    const result = this.dom.window.localStorage.getItem('ShowUnseenOnly')
    expect(result).to.equal('false')
  }
}

export class AppPicturesUpdateUnreadSelectorSlider extends BaseAppPicturesTests {
  @test
  'it should remove unread class when not reading unread only'(): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.add('unread')
    expect(element?.classList.contains('unread')).to.equal(true)
    Pictures.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('unread')).to.equal(false)
  }

  @test
  'it should add all class when not reading unread only'(): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.remove('all')
    expect(element?.classList.contains('all')).to.equal(false)
    Pictures.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('all')).to.equal(true)
  }

  @test
  'it should add unread class when reading unread only'(): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'true'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.remove('unread')
    expect(element?.classList.contains('unread')).to.equal(false)
    Pictures.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('unread')).to.equal(true)
  }

  @test
  'it should remove all class when reading unread only'(): void {
    this.dom.window.localStorage.ShowUnseenOnly = 'true'
    const element = document.querySelector('.selectUnreadAll > div')
    element?.classList.add('all')
    expect(element?.classList.contains('all')).to.equal(true)
    Pictures.UpdateUnreadSelectorSlider()
    expect(element?.classList.contains('all')).to.equal(false)
  }
}

export class AppPicturesInitUnreadSelectorSlider extends BaseAppPicturesTests {
  UpdateUnreadSelectorSliderSpy: Sinon.SinonStub = sinon.stub()
  GetShowUnreadOnly: Sinon.SinonStub = sinon.stub()
  ShowUnreadOnlyValue = false
  SliderDiv: HTMLDivElement | null = null

  before(): void {
    super.before()
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    this.UpdateUnreadSelectorSliderSpy = sinon.stub(Pictures, 'UpdateUnreadSelectorSlider')
    this.GetShowUnreadOnly = sinon.stub(Pictures, 'GetShowUnreadOnly')
    this.GetShowUnreadOnly.callsFake(() => this.ShowUnreadOnlyValue)
    this.SliderDiv = this.dom.window.document.querySelector('.selectUnreadAll')
  }

  after(): void {
    this.UpdateUnreadSelectorSliderSpy.restore()
    this.GetShowUnreadOnly.restore()
    super.after()
  }

  @test
  'it should call UpdateUnreasSelectoreSlider on intitial call'(): void {
    Pictures.InitUnreadSelectorSlider()
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(true)
  }

  @test
  'it should respond to click by calling UpdateUnreadSelectorSlider'(): void {
    Pictures.InitUnreadSelectorSlider()
    this.UpdateUnreadSelectorSliderSpy.reset()
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(false)
    const event = new this.dom.window.MouseEvent('click')
    this.SliderDiv?.dispatchEvent(event)
    expect(this.UpdateUnreadSelectorSliderSpy.called).to.equal(true)
  }

  @test
  'it should activate unread mode when in readall mode'(): void {
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
  'it should activate readall mode when in unread mode'(): void {
    this.ShowUnreadOnlyValue = true
    Pictures.InitUnreadSelectorSlider()
    const event = new this.dom.window.MouseEvent('click')
    this.SliderDiv?.dispatchEvent(event)
    expect(this.dom.window.localStorage.ShowUnseenOnly).to.equal('false')
  }
}

export class AppPicturesInitMouse extends BaseAppPicturesTests {
  boundingRect = {
    x: 0,
    y: 0,
    width: 1024,
    height: 768,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }

  myVisualViewport: TestVisualViewport = {
    scale: 1,
  }

  MainImageBoundingStub: sinon.SinonStub = sinon.stub()
  ClickTarget: HTMLElement | null = null

  before(): void {
    this.myVisualViewport = {
      scale: 1,
    }
    this.visualViewport = this.myVisualViewport
    super.before()
    const element = Pictures.mainImage?.parentElement
    assert(element != null)
    this.MainImageBoundingStub = sinon.stub(element, 'getBoundingClientRect')
    this.MainImageBoundingStub.returns(this.boundingRect)
    this.ClickTarget = Pictures.mainImage?.parentElement ?? null
    PubSub.subscribers['LOADING:ERROR'] = [
      async () => {
        await Promise.resolve()
      },
    ]
  }

  after(): void {
    this.MainImageBoundingStub.restore()
    super.after()
  }

  @test
  'it should ignore click with zero width image area'(): void {
    const evt = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub().resolves()
    this.boundingRect.width = 0
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore click with null width image bounding rect'(): void {
    const evt = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub().resolves()
    this.MainImageBoundingStub.returns(null)
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate previous for left area click'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    Subscribe('Action:Execute:Previous', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate previous for left area click with decreased visualViewport scale'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    Subscribe('Action:Execute:Previous', spy)
    this.myVisualViewport.scale /= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore left area click with increased visualViewport scale'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 4,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    Subscribe('Ignored Mouse Click', spy)
    this.myVisualViewport.scale *= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should show menu for center area click'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 2,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    Subscribe('Action:Execute:ShowMenu', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should show menu for center area click with decreased visualViewport scale'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 2,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    this.myVisualViewport.scale /= 2
    Subscribe('Action:Execute:ShowMenu', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore center area click with increased visualViewport scale'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: this.boundingRect.width / 2,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    this.myVisualViewport.scale *= 2
    Subscribe('Ignored Mouse Click', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate next for right area click'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: (3 * this.boundingRect.width) / 4,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    Subscribe('Action:Execute:Next', spy)
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should navigate next for right area click with decreased visualViewport scale'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: (3 * this.boundingRect.width) / 4,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    Subscribe('Action:Execute:Next', spy)
    this.myVisualViewport.scale /= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should ignore right area click with increased visualViewport scale'(): void {
    const evt = new this.dom.window.MouseEvent('click', {
      clientX: (3 * this.boundingRect.width) / 4,
      clientY: this.boundingRect.height / 2,
    })
    const spy = sinon.stub().resolves()
    Subscribe('Ignored Mouse Click', spy)
    this.myVisualViewport.scale *= 2
    this.ClickTarget?.dispatchEvent(evt)
    expect(spy.called).to.equal(true)
  }
}
