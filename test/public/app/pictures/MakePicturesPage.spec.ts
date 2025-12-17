'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'
import type { Picture } from '../../../../contracts/listing'

describe('public/app/pictures function MakePicturesPage()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  const menuHideSpy = Sinon.stub().resolves()
  let makePictureCardSpy = Sinon.stub()
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
    makePictureCardSpy = Sinon.stub(Pictures, 'MakePictureCard').callsFake(() =>
      dom.window.document.createElement('div'),
    )
  })
  afterEach(() => {
    makePictureCardSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should return div element', () => {
    const page = Pictures.MakePicturesPage(666, [])
    expect(page).to.be.an.instanceOf(dom.window.HTMLDivElement)
  })
  it('should return page classed element', () => {
    const page = Pictures.MakePicturesPage(666, [])
    expect(page.classList.contains('page')).to.equal(true)
  })
  it('should set page number on input pictures', () => {
    const pic: Picture = {
      name: '',
      path: '',
      seen: false,
    }
    Pictures.MakePicturesPage(69, [pic])
    expect(pic.page).to.equal(69)
  })
  it('should create image card with input picture', () => {
    const pic: Picture = {
      name: '',
      path: '',
      seen: false,
    }
    Pictures.MakePicturesPage(69, [pic])
    expect(makePictureCardSpy.callCount).to.equal(1)
    expect(makePictureCardSpy.firstCall.args).to.have.lengthOf(1)
    expect(makePictureCardSpy.firstCall.args[0]).to.equal(pic)
  })
  it('should not set page number when card creation fails', () => {
    const pic: Picture = {
      name: '',
      path: '',
      seen: false,
    }
    makePictureCardSpy.returns(null)
    Pictures.MakePicturesPage(69, [pic])
    expect(pic.page).to.equal(undefined)
  })
  it('should add all cards to built page', () => {
    const pics = Array.from({ length: 50 }).map(
      (_, i): Picture => ({
        name: '' + i,
        path: '' + i,
        seen: false,
      }),
    )
    const page = Pictures.MakePicturesPage(1, pics)
    expect(page.children).to.have.lengthOf(50)
  })
  it('should add card to built page', () => {
    const pic: Picture = {
      name: '',
      path: '',
      seen: false,
    }
    const card = dom.window.document.createElement('div')
    makePictureCardSpy.returns(card)
    const page = Pictures.MakePicturesPage(69, [pic])
    expect(page.firstChild).to.equal(card)
  })
})
