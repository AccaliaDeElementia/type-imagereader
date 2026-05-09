'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import { cast } from '#testutils/TypeGuards.js'
import Sinon from 'sinon'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Imports } from '#public/scripts/app/pictures/state.js'
import type { Picture } from '#contracts/listing.js'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { getSubscriber, resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

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

describe('public/app/pictures Init()', () => {
  let dom = new JSDOM(render(markup), {})
  let resetMarkupSpy = sandbox.stub()
  let initActionsSpy = sandbox.stub()
  let initMouseSpy = sandbox.stub()
  let initUnreadSliderSpy = sandbox.stub()
  let loadDataSpy = sandbox.stub()
  let changePictureSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    resetMarkupSpy = sandbox.stub(Pictures, 'ResetMarkup')
    initActionsSpy = sandbox.stub(Imports, 'InitActions')
    initMouseSpy = sandbox.stub(Imports, 'InitMouse')
    initUnreadSliderSpy = sandbox.stub(Imports, 'InitUnreadSelectorSlider')
    loadDataSpy = sandbox.stub(Imports, 'LoadData')
    changePictureSpy = sandbox.stub(Imports, 'ChangePicture')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should clear pictures array', () => {
    Pictures.pictures = cast<Picture[]>(null)
    Pictures.Init()
    expect(Pictures.pictures).to.deep.equal([])
  })
  it('should clear current picture', () => {
    Pictures.current = cast<Picture>(false)
    Pictures.Init()
    expect(Pictures.current).to.equal(null)
  })
  it('should reset nextLoader promise', () => {
    Pictures.nextLoader = cast<Promise<void>>(null)
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
  it('should register subscribers for Navigate:Data and Pictures:Change', () => {
    Pictures.Init()
    expect(PubSub.subscribers).to.have.all.keys('NAVIGATE:DATA', 'PICTURES:CHANGE')
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
      const handler = getSubscriber('NAVIGATE:DATA')
      await handler(data)
      expect(loadDataSpy.called).to.equal(expected)
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
      Pictures.Init()
      const handler = getSubscriber('PICTURES:CHANGE')
      await handler(data)
      expect(changePictureSpy.called).to.equal(expected)
    })
  })
})
