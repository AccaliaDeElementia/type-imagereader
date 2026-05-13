'use sanity'

import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, Internals, Viewer, loadData } from '#public/scripts/app/pictureNavigation.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/pubsub.js'
import type { Picture } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

describe('public/app/pictures loadData()', () => {
  let resetMarkupSpy: MockInstance = vi.fn()
  let setPicturesSpy: MockInstance = vi.fn()
  let makeTabSpy: MockInstance = vi.fn()
  let loadImageSpy: MockInstance = vi.fn()
  let publishStub: MockInstance = vi.fn()
  beforeEach(() => {
    resetPubSub()
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    Pictures.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: false,
      index: -1,
    }))
    Pictures.current = null
    Viewer.history = { prev: [], next: [] }
    resetMarkupSpy = vi.spyOn(Imports, 'resetMarkup').mockImplementation((..._args: unknown[]) => undefined)
    setPicturesSpy = vi.spyOn(Internals, 'setPicturesGetFirst').mockImplementation((data) => data.pictures?.[0] ?? null)
    makeTabSpy = vi.spyOn(Imports, 'makeTab').mockImplementation((..._args: unknown[]) => undefined)
    loadImageSpy = vi.spyOn(Internals, 'loadImage').mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should reset markup on load', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(resetMarkupSpy.mock.calls.length).toBe(1)
  })
  it('should set pictures on load', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(setPicturesSpy.mock.calls.length).toBe(1)
  })
  it('should abort loading when no first picture exists', async () => {
    setPicturesSpy.mockReturnValue(null)
    await loadData({
      name: '',
      parent: '',
      path: '',
    })
    expect(makeTabSpy.mock.calls.length).toBe(0)
  })
  it('should make tab when first picture exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(makeTabSpy.mock.calls.length).toBe(1)
  })
  it('should call tab select once when first picture exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Tab:Select').length).toBe(1)
  })
  it('should select image tab when first picture exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(publishStub.mock.calls.find((c) => c[0] === 'Tab:Select')).toEqual(['Tab:Select', 'Images'])
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:show').length).toBe(0)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:show').length).toBe(0)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:show').length).toBe(0)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(0)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:show').length).toBe(1)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(0)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:show').length).toBe(1)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
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
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:show').length).toBe(0)
  })
  it('should load image when pictures exists', async () => {
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(loadImageSpy.mock.calls.length).toBe(1)
  })
  it('should tolerate loadImage rejecting', async () => {
    loadImageSpy.mockRejectedValue('ERROR!')
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(loadImageSpy.mock.calls.length, 'Call should not propagate rejection out of method').toBe(1)
  })
  it('should clear history.prev when new listing arrives', async () => {
    Viewer.history.prev = [{ name: 'stale', path: '/stale', seen: true }]
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(Viewer.history.prev).toEqual([])
  })
  it('should clear history.next when new listing arrives', async () => {
    Viewer.history.next = [{ name: 'stale', path: '/stale', seen: true }]
    await loadData({
      name: '',
      parent: '',
      path: '',
      pictures: Pictures.pictures,
    })
    expect(Viewer.history.next).toEqual([])
  })
})
