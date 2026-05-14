'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, Internals, NavigateTo, Viewer } from '#public/scripts/app/pictureNavigation.js'
import { cast } from '#testutils/typeGuards.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures loadNextImage()', () => {
  let dom = new JSDOM('<html></html>', {})
  const fetchStub = vi.fn()
  let getPictureStub: MockInstance = vi.fn()
  let getShowUnreadOnlyStub: MockInstance = vi.fn()
  const next: Picture = {
    name: 'foobar',
    path: '/foobar.png',
    seen: false,
  }
  const mainImage = {
    width: cast<number | undefined>(1024),
    height: cast<number | undefined>(768),
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    dom.window.fetch = fetchStub
    fetchStub.mockReset()
    fetchStub.mockResolvedValue(undefined)
    getPictureStub = vi.spyOn(Internals, 'getPicture').mockReturnValue(next)
    getShowUnreadOnlyStub = vi.spyOn(Imports, 'getShowUnreadOnly').mockReturnValue(false)
    mainImage.width = 1024
    mainImage.height = 768
    Pictures.mainImage = cast<HTMLImageElement>(mainImage)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should call getPicture once when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.mockReturnValue(false)
    await Internals.loadNextImage()
    expect(getPictureStub.mock.calls.length).toBe(1)
  })
  it('should call getPicture with one argument when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.mockReturnValue(false)
    await Internals.loadNextImage()
    expect(getPictureStub.mock.calls[0]).toHaveLength(1)
  })
  it('should call getPicture with Next navigation when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.mockReturnValue(false)
    await Internals.loadNextImage()
    expect(getPictureStub.mock.calls[0]?.[0]).toBe(NavigateTo.Next)
  })
  it('should call getPicture once when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.mockReturnValue(true)
    await Internals.loadNextImage()
    expect(getPictureStub.mock.calls.length).toBe(1)
  })
  it('should call getPicture with one argument when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.mockReturnValue(true)
    await Internals.loadNextImage()
    expect(getPictureStub.mock.calls[0]).toHaveLength(1)
  })
  it('should call getPicture with NextUnread navigation when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.mockReturnValue(true)
    await Internals.loadNextImage()
    expect(getPictureStub.mock.calls[0]?.[0]).toBe(NavigateTo.NextUnread)
  })
  it('should set nextLoader', async () => {
    const sentinal = Promise.resolve()
    Viewer.nextLoader = sentinal
    await Internals.loadNextImage()
    expect(Viewer.nextLoader).not.toBe(sentinal)
  })
  it('should set nextPending on exec', async () => {
    Viewer.nextPending = false
    const promise = Internals.loadNextImage()
    expect(Viewer.nextPending).toBe(true)
    await promise
  })
  it('should clear nextPending on no next image', async () => {
    Viewer.nextPending = true
    getPictureStub.mockReturnValue(undefined)
    const promise = Internals.loadNextImage()
    expect(Viewer.nextPending).toBe(false)
    await promise
  })
  it('should set nextPending during fetch resolve', async () => {
    fetchStub.mockResolvedValue(undefined)
    const promise = Internals.loadNextImage()
    expect(Viewer.nextPending).toBe(true)
    await promise
  })
  it('should clear nextPending on fetch resolve', async () => {
    fetchStub.mockResolvedValue(undefined)
    await Internals.loadNextImage()
    expect(Viewer.nextPending).toBe(false)
  })
  it('should set nextPending during fetch reject', async () => {
    fetchStub.mockRejectedValue('BOO')
    const promise = Internals.loadNextImage()
    expect(Viewer.nextPending).toBe(true)
    await promise
  })
  it('should clear nextPending on fetch reject', async () => {
    fetchStub.mockRejectedValue('BOO')
    await Internals.loadNextImage()
    expect(Viewer.nextPending).toBe(false)
  })
  it('should not fetch on no next image', async () => {
    getPictureStub.mockReturnValue(undefined)
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls.length).toBe(0)
  })
  it('should fetch once for next image', async () => {
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls.length).toBe(1)
  })
  it('should fetch with one argument for next image', async () => {
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls[0]).toHaveLength(1)
  })
  it('should fetch expected url for next image', async () => {
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls[0]?.[0]).toBe('/images/scaled/1024/768/foobar.png-image.webp')
  })
  it('should fetch once with main image width set', async () => {
    mainImage.width = 65535
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls.length).toBe(1)
  })
  it('should fetch with one argument with main image width set', async () => {
    mainImage.width = 65535
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls[0]).toHaveLength(1)
  })
  it('should fetch expected url with main image width set', async () => {
    mainImage.width = 65535
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls[0]?.[0]).toContain('scaled/65535/768/')
  })
  it('should fetch once with main image height set', async () => {
    mainImage.height = 65535
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls.length).toBe(1)
  })
  it('should fetch with one argument with main image height set', async () => {
    mainImage.height = 65535
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls[0]).toHaveLength(1)
  })
  it('should fetch expected url with main image height set', async () => {
    mainImage.height = 65535
    await Internals.loadNextImage()
    expect(fetchStub.mock.calls[0]?.[0]).toContain('scaled/1024/65535/')
  })
})
