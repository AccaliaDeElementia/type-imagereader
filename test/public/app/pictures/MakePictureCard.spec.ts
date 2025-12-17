'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'
import type { Picture } from '../../../../contracts/listing'

describe('public/app/pictures function MakePictureCard()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  const menuHideSpy = Sinon.stub().resolves()
  let changePictureSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    menuHideSpy.resetHistory()
    PubSub.subscribers = {
      'MENU:HIDE': [menuHideSpy],
    }
    PubSub.deferred = []
    const template = dom.window.document.createElement('div')
    template.innerHTML =
      '<template id="ImageCard><div class="card"><div class="card-body"><h5>placeholder</h5></div></div></template>'
    Pictures.imageCard = Cast<HTMLTemplateElement>(template.firstChild)
    changePictureSpy = Sinon.stub(Pictures, 'ChangePicture')
  })
  afterEach(() => {
    changePictureSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should return an HTMLElement on failure', () => {
    Pictures.imageCard = null
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card).to.equal(undefined)
  })
  it('should return an HTMLElement on success', () => {
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card).to.be.instanceOf(dom.window.HTMLElement)
  })
  it('should save card to input object on success', () => {
    const picture: Picture = {
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    const card = Pictures.MakePictureCard(picture)
    expect(picture).to.have.any.keys('element')
    expect(picture.element).to.equal(card)
  })
  it('should set background image data attribute on success', () => {
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card?.getAttribute('data-backgroundImage')).to.equal('url("/images/preview/foo/bar/baz.jpg-image.webp")')
  })
  it('should add seen class when input is seen', () => {
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: true,
    })
    expect(card?.classList.contains('seen')).to.equal(true)
  })
  it('should not add seen class when input is unseen', () => {
    const card = Pictures.MakePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card?.classList.contains('seen')).to.equal(false)
  })
  it('should set image title', () => {
    const card = Pictures.MakePictureCard({
      name: 'Foobar 9001',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card?.querySelector('h5')?.innerHTML).to.equal('Foobar 9001')
  })
  it('should register click handler', () => {
    const card = Pictures.MakePictureCard({
      name: 'Foobar 9001',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    const evt = new dom.window.MouseEvent('click')
    card?.dispatchEvent(evt)
    expect(changePictureSpy.called).to.equal(true)
  })
  it('should change to clicked picture on click event', () => {
    const pic = {
      name: 'Foobar 9001',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    const card = Pictures.MakePictureCard(pic)
    const evt = new dom.window.MouseEvent('click')
    card?.dispatchEvent(evt)
    expect(changePictureSpy.callCount).to.equal(1)
    expect(changePictureSpy.firstCall.args).to.have.lengthOf(1)
    expect(changePictureSpy.firstCall.args[0]).to.equal(pic)
  })
  it('should hide menu on click event', () => {
    const pic = {
      name: 'Foobar 9001',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    const card = Pictures.MakePictureCard(pic)
    const evt = new dom.window.MouseEvent('click')
    card?.dispatchEvent(evt)
    expect(menuHideSpy.callCount).to.equal(1)
  })
})
