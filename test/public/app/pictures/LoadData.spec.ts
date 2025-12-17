'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import assert from 'assert'

describe('public/app/pictures function LoadData()', () => {
  let resetMarkupSpy = Sinon.stub()
  let setPicturesSpy = Sinon.stub()
  let makeTabSpy = Sinon.stub()
  let loadImageSpy = Sinon.stub()
  const tabSelectSpy = Sinon.stub().resolves()
  const menuShowSpy = Sinon.stub().resolves()
  const menuHideSpy = Sinon.stub().resolves()
  beforeEach(() => {
    PubSub.subscribers = {
      'MENU:SHOW': [menuShowSpy],
      'MENU:HIDE': [menuHideSpy],
      'TAB:SELECT': [tabSelectSpy],
    }
    PubSub.deferred = []
    Pictures.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: false,
      index: -1,
    }))
    Pictures.current = null
    resetMarkupSpy = Sinon.stub(Pictures, 'ResetMarkup')
    setPicturesSpy = Sinon.stub(Pictures, 'SetPicturesGetFirst').callsFake((data) => data.pictures?.at(0) ?? null)
    makeTabSpy = Sinon.stub(Pictures, 'MakeTab')
    loadImageSpy = Sinon.stub(Pictures, 'LoadImage').resolves()
  })
  afterEach(() => {
    loadImageSpy.restore()
    makeTabSpy.restore()
    setPicturesSpy.restore()
    resetMarkupSpy.restore()
    menuHideSpy.resetHistory()
    menuShowSpy.resetHistory()
    tabSelectSpy.resetHistory()
  })
  after(() => {
    Sinon.restore()
  })
  it('should reset markup on load', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(resetMarkupSpy.callCount).to.equal(1)
  })
  it('should set pictures on load', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(setPicturesSpy.callCount).to.equal(1)
  })
  it('should abort loading when no first picture exists', async () => {
    setPicturesSpy.returns(null)
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(makeTabSpy.callCount).to.equal(0)
  })
  it('should make tab when first picture exists', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(makeTabSpy.callCount).to.equal(1)
  })
  it('should select image tab when first picture exists', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(tabSelectSpy.callCount).to.equal(1)
    expect(tabSelectSpy.firstCall.args).to.deep.equal(['Images', 'TAB:SELECT'])
  })
  it('should select first image as current when cover is missing', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(Pictures.current).to.equal(Pictures.pictures[0])
  })
  it('should select first image as current when cover is blank', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      cover: '',
    })
    expect(Pictures.current).to.equal(Pictures.pictures[0])
  })
  it('should select first image as current when cover is not matching picture list', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      cover: '/non/existant/path.png',
    })
    expect(Pictures.current).to.equal(Pictures.pictures[0])
  })
  it('should select cover image as current when cover matches', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      cover: '/some/path/32.png',
    })
    expect(Pictures.current).to.equal(Pictures.pictures[32])
  })
  it('should hide menu when no images are read', async () => {
    Pictures.pictures.forEach((pic) => {
      pic.seen = false
    })
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(1)
    expect(menuShowSpy.callCount).to.equal(0)
  })
  it('should hide menu when some images are read', async () => {
    Pictures.pictures.forEach((pic, i) => {
      pic.seen = i >= 16 && i < 32
    })
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(1)
    expect(menuShowSpy.callCount).to.equal(0)
  })
  it('should hide menu when most images are read', async () => {
    Pictures.pictures.forEach((pic) => {
      pic.seen = true
    })
    const pic = Pictures.pictures[63]
    assert(pic != null, 'Test image must exist')
    pic.seen = false
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(1)
    expect(menuShowSpy.callCount).to.equal(0)
  })
  it('should show menu when all images are read', async () => {
    Pictures.pictures.forEach((pic) => {
      pic.seen = true
    })
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(0)
    expect(menuShowSpy.callCount).to.equal(1)
  })
  it('should show menu when all images are read and noMenu option is not selected', async () => {
    Pictures.pictures.forEach((pic) => {
      pic.seen = true
    })
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: false,
    })
    expect(menuHideSpy.callCount).to.equal(0)
    expect(menuShowSpy.callCount).to.equal(1)
  })
  it('should hide menu when all images are read and noMenu option is selected', async () => {
    Pictures.pictures.forEach((pic) => {
      pic.seen = false
    })
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: true,
    })
    expect(menuHideSpy.callCount).to.equal(1)
    expect(menuShowSpy.callCount).to.equal(0)
  })
  it('should load image when pictures exists', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(loadImageSpy.callCount).to.equal(1)
  })
  it('should tolerate loadImage rejecting', async () => {
    loadImageSpy.rejects('ERROR!')
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(loadImageSpy.callCount).to.equal(1, 'Call should not propagate rejection out of method')
  })
})
