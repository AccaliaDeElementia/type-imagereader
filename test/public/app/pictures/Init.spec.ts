'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'
import Sinon from 'sinon'
import { Pictures } from '../../../../public/scripts/app/pictures'
import type { Picture } from '../../../../contracts/listing'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import assert from 'node:assert'

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

describe('public/app/pictures function Init()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM(render(markup), {})
  let resetMarkupSpy = Sinon.stub()
  let initActionsSpy = Sinon.stub()
  let initMouseSpy = Sinon.stub()
  let initUnreadSliderSpy = Sinon.stub()
  let loadDataSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    resetMarkupSpy = Sinon.stub(Pictures, 'ResetMarkup')
    initActionsSpy = Sinon.stub(Pictures, 'InitActions')
    initMouseSpy = Sinon.stub(Pictures, 'InitMouse')
    initUnreadSliderSpy = Sinon.stub(Pictures, 'InitUnreadSelectorSlider')
    loadDataSpy = Sinon.stub(Pictures, 'LoadData')
  })
  afterEach(() => {
    loadDataSpy.restore()
    initUnreadSliderSpy.restore()
    initMouseSpy.restore()
    initActionsSpy.restore()
    resetMarkupSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should clear pictures array', () => {
    Pictures.pictures = Cast<Picture[]>(null)
    Pictures.Init()
    expect(Pictures.pictures).to.deep.equal([])
  })
  it('should clear current picture', () => {
    Pictures.current = Cast<Picture>(false)
    Pictures.Init()
    expect(Pictures.current).to.equal(null)
  })
  it('should reset nextLoader promise', () => {
    Pictures.nextLoader = Cast<Promise<void>>(null)
    Pictures.Init()
    expect(Pictures.nextLoader).to.be.an.instanceOf(Promise)
  })
  it('should reset nextPending status', () => {
    Pictures.nextPending = false
    Pictures.Init()
    expect(Pictures.nextPending).to.equal(true)
  })
  it('should reset markup on init', () => {
    expect(resetMarkupSpy.called).to.equal(false)
    Pictures.Init()
    expect(resetMarkupSpy.called).to.equal(true)
  })
  it('should init actions on main init', () => {
    expect(initActionsSpy.called).to.equal(false)
    Pictures.Init()
    expect(initActionsSpy.called).to.equal(true)
  })
  it('should init mouse on main init', () => {
    expect(initMouseSpy.called).to.equal(false)
    Pictures.Init()
    expect(initMouseSpy.called).to.equal(true)
  })
  it('should init unread slider on main init', () => {
    expect(initUnreadSliderSpy.called).to.equal(false)
    Pictures.Init()
    expect(initUnreadSliderSpy.called).to.equal(true)
  })
  it('should subscribe to Navigate:Data', () => {
    Pictures.Init()
    expect(PubSub.subscribers).to.have.all.keys('NAVIGATE:DATA')
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
      Pictures.Init()
      const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
      assert(handler != null)
      await handler(data)
      expect(loadDataSpy.called).to.equal(expected)
    })
  })
})
