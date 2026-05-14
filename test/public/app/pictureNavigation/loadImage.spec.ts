'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, Internals, Viewer, loadImage } from '#public/scripts/app/pictureNavigation.js'
import { cast } from '#testutils/typeGuards.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { delay } from '#testutils/utils.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div#tabImages

    div#screenText
      div.statusBar.bottom
        div.left
        div.center
        div.right
`

describe('public/app/pictures loadImage()', () => {
  let dom = new JSDOM('<html></html>', {})
  const totalCount = 1500
  let current: Picture = {
    path: '',
    name: '',
    seen: false,
  }

  let element: HTMLElement | null = null
  let postJSONSpy: MockInstance = vi.fn()
  let selectPageSpy: MockInstance = vi.fn()
  let loadNextImageSpy: MockInstance = vi.fn()
  let publishStub: MockInstance = vi.fn()
  let bottomLeftText: HTMLElement | null = null
  let bottomCenterText: HTMLElement | null = null
  let bottomRightText: HTMLElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    resetPubSub()
    Pictures.pictures = Array.from({ length: totalCount }).map(
      (_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false,
      }),
    )
    current = Pictures.pictures[1250] ?? {
      path: '',
      name: '',
      seen: false,
    }
    Pictures.current = current
    Pictures.mainImage = dom.window.document.createElement('img')

    element = dom.window.document.createElement('div')
    current.element = element
    current.page = 40
    current.index = 1250
    postJSONSpy = vi.spyOn(Imports, 'postJSON').mockResolvedValue(50)
    vi.spyOn(Internals, 'getPicture').mockReturnValue(undefined)
    selectPageSpy = vi.spyOn(Imports, 'selectPage').mockImplementation((..._args: unknown[]) => undefined)
    loadNextImageSpy = vi.spyOn(Internals, 'loadNextImage').mockResolvedValue(undefined)
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)

    bottomCenterText = dom.window.document.querySelector('.statusBar.bottom .center')
    bottomLeftText = dom.window.document.querySelector('.statusBar.bottom .left')
    bottomRightText = dom.window.document.querySelector('.statusBar.bottom .right')
  })
  afterEach(() => {
    unmountDom()
  })
  it('should be noop when current image is null', async () => {
    Pictures.current = null
    Viewer.nextPending = true
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:show').length > 0).toBe(false)
  })
  it('should be noop when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    Viewer.nextPending = true
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:show').length > 0).toBe(false)
  })
  it('should not call postJSON when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    await loadImage()
    expect(postJSONSpy.mock.calls.length).toBe(0)
  })
  it('should not update image src when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    await loadImage()
    expect(Pictures.mainImage?.getAttribute('src')).toBe(null)
  })
  it('should not publish LoadNew when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Picture:LoadNew').length).toBe(0)
  })
  it('should show loading when next is pending', async () => {
    Viewer.nextPending = true
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:show').length > 0).toBe(true)
  })
  it('should not show loading when next is not pending', async () => {
    Viewer.nextPending = false
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:show').length > 0).toBe(false)
  })
  it('should not await next loader when image is null', async () => {
    Pictures.current = null
    let awaited = false
    Viewer.nextLoader = delay(10).then(() => {
      awaited = true
    })
    await loadImage()
    expect(awaited).toBe(false)
  })
  it('should await next loader when image is valid', async () => {
    let awaited = false
    Viewer.nextLoader = delay(10).then(() => {
      awaited = true
    })
    await loadImage()
    expect(awaited).toBe(true)
  })
  it('should set seen on current picture', async () => {
    current.seen = false
    await loadImage()
    expect(current.seen).toBe(true)
  })
  it('should set seen css class on current element', async () => {
    element?.classList.remove('seen')
    await loadImage()
    expect(element?.classList.contains('seen')).toBe(true)
  })
  it('should call postJSON once for navigate latest', async () => {
    Viewer.modCount = 50
    await loadImage()
    expect(postJSONSpy.mock.calls.length).toBe(1)
  })
  it('should call postJSON with expected url for navigate latest', async () => {
    Viewer.modCount = 50
    await loadImage()
    expect(postJSONSpy).toHaveBeenCalledWith('/api/navigate/latest', expect.anything(), expect.anything())
  })
  it('should call postJSON with expected body for navigate latest', async () => {
    Viewer.modCount = 50
    await loadImage()
    expect(postJSONSpy.mock.calls[0]?.[1]).toEqual({
      path: '/some/path/1250.png',
      modCount: 50,
    })
  })
  const modcountTests: Array<[string, unknown, boolean]> = [
    ['undefined', undefined, true],
    ['zero', 0, true],
    ['negative number', -190, true],
    ['positive number', 8623, true],
    ['string', '04101', false],
    ['null', null, false],
    ['object', {}, false],
    ['boolean', true, false],
    ['NaN', NaN, false],
    ['Infinity', Infinity, false],
  ]
  modcountTests.forEach(([title, input, result]) => {
    it(`should ${result ? '' : 'not '}accept ${title} as modcount from postJSON`, async () => {
      Viewer.modCount = 99
      await loadImage()
      const fn = cast<(_: unknown) => unknown>(postJSONSpy.mock.calls[0]?.[2])
      expect(fn(input)).toBe(result)
    })
  })
  it('should trigger reload when new modcount is undefined', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(undefined)
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Navigate:Reload').length).toBe(1)
  })
  it('should not update image src when new modcount is undefined', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(undefined)
    await loadImage()
    expect(Pictures.mainImage?.src).toBe('')
  })
  it('should trigger reload when new modcount is NaN', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(NaN)
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Navigate:Reload').length).toBe(1)
  })
  it('should not update image src when new modcount is NaN', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(NaN)
    await loadImage()
    expect(Pictures.mainImage?.src).toBe('')
  })
  it('should trigger reload when new modcount is negative', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(-1)
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Navigate:Reload').length).toBe(1)
  })
  it('should not update image src when new modcount is negative', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(-1)
    await loadImage()
    expect(Pictures.mainImage?.src).toBe('')
  })
  it('should not initiate reload when new modcount is zero', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(0)
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Navigate:Reload').length).toBe(0)
  })
  it('should update modcount to zero on successful post', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(0)
    await loadImage()
    expect(Viewer.modCount).toBe(0)
  })
  it('should not reload when modcount is valid', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(76)
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Navigate:Reload').length).toBe(0)
  })
  it('should update modcount on successful post', async () => {
    Viewer.modCount = 99
    postJSONSpy.mockResolvedValue(76)
    await loadImage()
    expect(Viewer.modCount).toBe(76)
  })
  it('should set src on image', async () => {
    await loadImage()
    expect(Pictures.mainImage?.getAttribute('src')).toBe('/images/scaled/0/0/some/path/1250.png-image.webp')
  })
  it('should set src height on image', async () => {
    assert(Pictures.mainImage !== null)
    Pictures.mainImage.height = 512
    await loadImage()
    expect(Pictures.mainImage.getAttribute('src')).toBe('/images/scaled/0/512/some/path/1250.png-image.webp')
  })
  it('should set src width on image', async () => {
    assert(Pictures.mainImage !== null)
    Pictures.mainImage.width = 1024
    await loadImage()
    expect(Pictures.mainImage.getAttribute('src')).toBe('/images/scaled/1024/0/some/path/1250.png-image.webp')
  })
  it('should set statusbar name', async () => {
    await loadImage()
    expect(bottomCenterText?.innerHTML).toBe('1250.png')
  })
  it('should set statusbar percent', async () => {
    await loadImage()
    expect(bottomRightText?.innerHTML).toBe('(83.4%)')
  })
  it('should set statusbar position', async () => {
    await loadImage()
    expect(bottomLeftText?.innerHTML).toBe('(1,251/1,500)')
  })
  it('should default to first image name on missing index', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.index = undefined
    await loadImage()
    expect(bottomCenterText?.innerHTML).toBe('1250.png')
  })
  it('should default to first image percentname on missing index', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.index = undefined
    await loadImage()
    expect(bottomRightText?.innerHTML).toBe('(0%)')
  })
  it('should default to first image position on missing index', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.index = undefined
    await loadImage()
    expect(bottomLeftText?.innerHTML).toBe('(1/1,500)')
  })
  it('should select page of currnet image', async () => {
    await loadImage()
    expect(selectPageSpy).toHaveBeenCalledWith(40)
  })
  it('should select default page when current image omits page marker', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.page = undefined
    await loadImage()
    expect(selectPageSpy).toHaveBeenCalledWith(1)
  })
  it('should publish LoadNew message on successful load', async () => {
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Picture:LoadNew').length).toBe(1)
  })
  it('should not publish LoadingError on successful load', async () => {
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(0)
  })
  it('should publish LoadNew message even if loadNextImage rejects', async () => {
    loadNextImageSpy.mockRejectedValue('ERROR!')
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Picture:LoadNew').length).toBe(1)
  })
  it('should not publish LoadingError even if loadNextImage rejects', async () => {
    loadNextImageSpy.mockRejectedValue('ERROR!')
    await loadImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(0)
  })
  it('should publish error when postJSON throws error', async () => {
    const expectedErr = new Error('IGGY WIGGY, LETS GET JIGGY')
    postJSONSpy.mockRejectedValue(expectedErr)
    await loadImage()
    expect(publishStub).toHaveBeenCalledWith('Loading:Error', expectedErr)
  })
})
