'use sanity'

import Sinon from 'sinon'

import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, Internals, loadData } from '#public/scripts/app/pictureData.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/pubsub.js'
import type { Picture } from '#contracts/listing.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures loadData()', () => {
  let resetMarkupSpy = sandbox.stub()
  let setPicturesSpy = sandbox.stub()
  let makeTabSpy = sandbox.stub()
  let loadImageSpy = sandbox.stub()
  let publishStub = sandbox.stub()
  beforeEach(() => {
    resetPubSub()
    publishStub = sandbox.stub(Imports, 'publish')
    Pictures.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: false,
      index: -1,
    }))
    Pictures.current = null
    resetMarkupSpy = sandbox.stub(Pictures, 'resetMarkup')
    setPicturesSpy = sandbox.stub(Internals, 'setPicturesGetFirst').callsFake((data) => data.pictures?.[0] ?? null)
    makeTabSpy = sandbox.stub(Imports, 'makeTab')
    loadImageSpy = sandbox.stub(Imports, 'loadImage').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should reset markup on load', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(resetMarkupSpy.callCount).toBe(1)
  })
  it('should set pictures on load', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(setPicturesSpy.callCount).toBe(1)
  })
  it('should abort loading when no first picture exists', async () => {
    setPicturesSpy.returns(null)
    await loadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(makeTabSpy.callCount).toBe(0)
  })
  it('should make tab when first picture exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(makeTabSpy.callCount).toBe(1)
  })
  it('should call tab select once when first picture exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Tab:Select').callCount).toBe(1)
  })
  it('should select image tab when first picture exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Tab:Select').firstCall.args).toEqual(['Tab:Select', 'Images'])
  })
  it('should select first image as current when cover is missing', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(Pictures.current).toBe(Pictures.pictures[0])
  })
  it('should select first image as current when cover is blank', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      cover: '',
    })
    expect(Pictures.current).toBe(Pictures.pictures[0])
  })
  it('should select first image as current when cover is not matching picture list', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      cover: '/non/existent/path.png',
    })
    expect(Pictures.current).toBe(Pictures.pictures[0])
  })
  it('should select cover image as current when cover matches', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      cover: '/some/path/32.png',
    })
    expect(Pictures.current).toBe(Pictures.pictures[32])
  })
  it('should hide menu when no images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:Hide').callCount).toBe(1)
  })
  it('should not show menu when no images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(0)
  })
  it('should hide menu when some images are read', async () => {
    for (const [pic, idx] of Pictures.pictures.map((pic, idx): [Picture, number] => [pic, idx])) {
      pic.seen = idx >= 16 && idx < 32
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:Hide').callCount).toBe(1)
  })
  it('should not show menu when some images are read', async () => {
    for (const [pic, idx] of Pictures.pictures.map((pic, idx): [Picture, number] => [pic, idx])) {
      pic.seen = idx >= 16 && idx < 32
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(0)
  })
  it('should hide menu when most images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    const pic = Pictures.pictures.find((_, i) => i === 63)
    assert(pic !== undefined, 'Test image must exist')
    pic.seen = false
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:Hide').callCount).toBe(1)
  })
  it('should not show menu when most images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    const pic = Pictures.pictures.find((_, i) => i === 63)
    assert(pic !== undefined, 'Test image must exist')
    pic.seen = false
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(0)
  })
  it('should not hide menu when all images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:Hide').callCount).toBe(0)
  })
  it('should show menu when all images are read', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(1)
  })
  it('should not hide menu when all images are read and noMenu option is not selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: false,
    })
    expect(publishStub.withArgs('Menu:Hide').callCount).toBe(0)
  })
  it('should show menu when all images are read and noMenu option is not selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = true
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: false,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(1)
  })
  it('should hide menu when noMenu option is selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: true,
    })
    expect(publishStub.withArgs('Menu:Hide').callCount).toBe(1)
  })
  it('should not show menu when noMenu option is selected', async () => {
    for (const pic of Pictures.pictures) {
      pic.seen = false
    }
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
      noMenu: true,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(0)
  })
  it('should load image when pictures exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(loadImageSpy.callCount).toBe(1)
  })
  it('should tolerate loadImage rejecting', async () => {
    loadImageSpy.rejects('ERROR!')
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(loadImageSpy.callCount, 'Call should not propagate rejection out of method').toBe(1)
  })
})
