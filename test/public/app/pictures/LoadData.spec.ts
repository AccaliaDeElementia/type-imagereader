'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Pictures } from '#public/scripts/app/pictures/index.js'
import { PubSub } from '#public/scripts/app/pubsub.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/PubSub.js'
import type { Picture } from '#contracts/listing.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures function LoadData()', () => {
  let resetMarkupSpy = sandbox.stub()
  let setPicturesSpy = sandbox.stub()
  let makeTabSpy = sandbox.stub()
  let loadImageSpy = sandbox.stub()
  const tabSelectSpy = sandbox.stub().resolves()
  const menuShowSpy = sandbox.stub().resolves()
  const menuHideSpy = sandbox.stub().resolves()
  beforeEach(() => {
    resetPubSub()
    PubSub.subscribers = {
      'MENU:SHOW': [menuShowSpy],
      'MENU:HIDE': [menuHideSpy],
      'TAB:SELECT': [tabSelectSpy],
    }
    Pictures.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: false,
      index: -1,
    }))
    Pictures.current = null
    resetMarkupSpy = sandbox.stub(Pictures, 'ResetMarkup')
    setPicturesSpy = sandbox.stub(Pictures, 'SetPicturesGetFirst').callsFake((data) => data.pictures?.[0] ?? null)
    makeTabSpy = sandbox.stub(Pictures, 'MakeTab')
    loadImageSpy = sandbox.stub(Pictures, 'LoadImage').resolves()
  })
  afterEach(() => {
    sandbox.restore()
    menuHideSpy.resetHistory()
    menuShowSpy.resetHistory()
    tabSelectSpy.resetHistory()
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
  it('should call tab select once when first picture exists', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(tabSelectSpy.callCount).to.equal(1)
  })
  it('should select image tab when first picture exists', async () => {
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
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
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should not show menu when no images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuShowSpy.callCount).to.equal(0)
  })
  it('should hide menu when some images are read', async () => {
    for (const [pic, idx] of Pictures.pictures.map((pic, idx): [Picture, number] => [pic, idx])) {
      pic.seen = idx >= 16 && idx < 32
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should not show menu when some images are read', async () => {
    for (const [pic, idx] of Pictures.pictures.map((pic, idx): [Picture, number] => [pic, idx])) {
      pic.seen = idx >= 16 && idx < 32
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuShowSpy.callCount).to.equal(0)
  })
  it('should hide menu when most images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    const pic = Pictures.pictures.find((_, i) => i === 63)
    assert(pic !== undefined, 'Test image must exist')
    pic.seen = false
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should not show menu when most images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    const pic = Pictures.pictures.find((_, i) => i === 63)
    assert(pic !== undefined, 'Test image must exist')
    pic.seen = false
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuShowSpy.callCount).to.equal(0)
  })
  it('should not hide menu when all images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuHideSpy.callCount).to.equal(0)
  })
  it('should show menu when all images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(menuShowSpy.callCount).to.equal(1)
  })
  it('should not hide menu when all images are read and noMenu option is not selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: false,
    })
    expect(menuHideSpy.callCount).to.equal(0)
  })
  it('should show menu when all images are read and noMenu option is not selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: false,
    })
    expect(menuShowSpy.callCount).to.equal(1)
  })
  it('should hide menu when noMenu option is selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: true,
    })
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should not show menu when noMenu option is selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await Pictures.LoadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: true,
    })
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
