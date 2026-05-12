'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import Sinon from 'sinon'
import { Pictures, Imports } from '#public/scripts/app/pictures/state.js'
import type { Picture } from '#contracts/listing.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div.selectUnreadAll
      div
        span.all show All
        span.unread show Unread
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

describe('public/app/pictures init()', () => {
  let dom = new JSDOM(render(markup), {})
  let resetMarkupSpy = sandbox.stub()
  let initActionsSpy = sandbox.stub()
  let initMouseSpy = sandbox.stub()
  let initUnreadSliderSpy = sandbox.stub()
  let loadDataSpy = sandbox.stub()
  let changePictureSpy = sandbox.stub()
  let subscribeStub = sandbox.stub()
  let resetViewerStateStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    resetMarkupSpy = sandbox.stub(Pictures, 'resetMarkup')
    initActionsSpy = sandbox.stub(Imports, 'initActions')
    initMouseSpy = sandbox.stub(Imports, 'initMouse')
    initUnreadSliderSpy = sandbox.stub(Imports, 'initUnreadSelectorSlider')
    loadDataSpy = sandbox.stub(Imports, 'loadData')
    changePictureSpy = sandbox.stub(Imports, 'changePicture')
    subscribeStub = sandbox.stub(Imports, 'subscribe')
    resetViewerStateStub = sandbox.stub(Imports, 'resetViewerState')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should clear pictures array', () => {
    Pictures.pictures = cast<Picture[]>(null)
    Pictures.init()
    expect(Pictures.pictures).toEqual([])
  })
  it('should clear current picture', () => {
    Pictures.current = cast<Picture>(false)
    Pictures.init()
    expect(Pictures.current).toBe(null)
  })
  it('should reset viewer state on init', () => {
    expect(resetViewerStateStub.called).toBe(false)
    Pictures.init()
    expect(resetViewerStateStub.called).toBe(true)
  })
  it('should reset markup on init', () => {
    expect(resetMarkupSpy.called).toBe(false)
    Pictures.init()
    expect(resetMarkupSpy.called).toBe(true)
  })
  it('should init actions on main init', () => {
    expect(initActionsSpy.called).toBe(false)
    Pictures.init()
    expect(initActionsSpy.called).toBe(true)
  })
  it('should init mouse on main init', () => {
    expect(initMouseSpy.called).toBe(false)
    Pictures.init()
    expect(initMouseSpy.called).toBe(true)
  })
  it('should init unread slider on main init', () => {
    expect(initUnreadSliderSpy.called).toBe(false)
    Pictures.init()
    expect(initUnreadSliderSpy.called).toBe(true)
  })
  it('should register subscribers for Navigate:Data and Pictures:Change', () => {
    Pictures.init()
    const subscribedTopics = subscribeStub.getCalls().map((c) => cast<string>(c.args[0]).toUpperCase())
    expect(subscribedTopics.sort()).toEqual(['NAVIGATE:DATA', 'PICTURES:CHANGE'].sort())
  })
  const testCases: Array<[string, boolean, unknown]> = [
    ['listing', true, { path: '', parent: '', name: '' }],
    ['invalid listing', false, { path: '', parent: '', name: null }],
    ['null', false, null],
    ['undefined', false, undefined],
    ['empty object', false, {}],
    ['boolean', false, false],
  ]
  testCases.forEach(([name, expected, data]) => {
    it(`should ${expected ? 'load data' : 'ignore'} ${name} in Navigate:Load handler`, async () => {
      Pictures.init()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
      await handler(data)
      expect(loadDataSpy.called).toBe(expected)
    })
  })
  const pictureChangeCases: Array<[string, boolean, unknown]> = [
    ['picture', true, { path: '/foo.png', name: 'foo.png', seen: false }],
    ['invalid picture', false, { path: '/foo.png', name: 'foo.png' }],
    ['null', false, null],
    ['undefined', false, undefined],
    ['empty object', false, {}],
    ['boolean', false, false],
  ]
  pictureChangeCases.forEach(([name, expected, data]) => {
    it(`should ${expected ? 'change picture' : 'ignore'} ${name} in Pictures:Change handler`, async () => {
      Pictures.init()
      const handler = capturedSubscriber(subscribeStub, 'Pictures:Change')
      await handler(data)
      expect(changePictureSpy.called).toBe(expected)
    })
  })
})
