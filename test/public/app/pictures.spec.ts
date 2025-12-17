'use sanity'

import { expect } from 'chai'
import { test } from '@testdeck/mocha'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Pictures } from '../../../public/scripts/app/pictures'
import { Cast } from '../../testutils/TypeGuards'

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

function ResetPictures(): void {
  Pictures.current = null
}

abstract class BaseAppPicturesTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  document: Document
  dom: JSDOM

  constructor() {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.document = global.document
    this.dom = new JSDOM('', {})
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

    ResetPictures()
    Pictures.Init()
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
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
  UpdateUnreadSelectorSliderSpy: Sinon.SinonStub = Sinon.stub()
  GetShowUnreadOnly: Sinon.SinonStub = Sinon.stub()
  ShowUnreadOnlyValue = false
  SliderDiv: HTMLDivElement | null = null

  before(): void {
    super.before()
    this.dom.window.localStorage.ShowUnseenOnly = 'false'
    this.UpdateUnreadSelectorSliderSpy = Sinon.stub(Pictures, 'UpdateUnreadSelectorSlider')
    this.GetShowUnreadOnly = Sinon.stub(Pictures, 'GetShowUnreadOnly')
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
