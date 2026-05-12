'use sanity'

import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictures/state.js'
import { Imports, Internals, loadImage } from '#public/scripts/app/pictures/viewer.js'
import { cast } from '#testutils/typeGuards.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { delay } from '#testutils/utils.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

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
  let postJSONSpy = sandbox.stub()
  let selectPageSpy = sandbox.stub()
  let loadNextImageSpy = sandbox.stub()
  let publishStub = sandbox.stub()
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
    postJSONSpy = sandbox.stub(Imports, 'postJSON')
    postJSONSpy.resolves(50)
    sandbox.stub(Internals, 'getPicture').returns(undefined)
    selectPageSpy = sandbox.stub(Imports, 'selectPage')
    loadNextImageSpy = sandbox.stub(Internals, 'loadNextImage').resolves()
    publishStub = sandbox.stub(Imports, 'publish')

    bottomCenterText = dom.window.document.querySelector('.statusBar.bottom .center')
    bottomLeftText = dom.window.document.querySelector('.statusBar.bottom .left')
    bottomRightText = dom.window.document.querySelector('.statusBar.bottom .right')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should be noop when current image is null', async () => {
    Pictures.current = null
    Pictures.nextPending = true
    await loadImage()
    expect(publishStub.withArgs('Loading:show').called).toBe(false)
  })
  it('should be noop when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    Pictures.nextPending = true
    await loadImage()
    expect(publishStub.withArgs('Loading:show').called).toBe(false)
  })
  it('should not call postJSON when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    await loadImage()
    expect(postJSONSpy.callCount).toBe(0)
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
    expect(publishStub.withArgs('Picture:LoadNew').callCount).toBe(0)
  })
  it('should show loading when next is pending', async () => {
    Pictures.nextPending = true
    await loadImage()
    expect(publishStub.withArgs('Loading:show').called).toBe(true)
  })
  it('should not show loading when next is not pending', async () => {
    Pictures.nextPending = false
    await loadImage()
    expect(publishStub.withArgs('Loading:show').called).toBe(false)
  })
  it('should not await next loader when image is null', async () => {
    Pictures.current = null
    let awaited = false
    Pictures.nextLoader = delay(10).then(() => {
      awaited = true
    })
    await loadImage()
    expect(awaited).toBe(false)
  })
  it('should await next loader when image is valid', async () => {
    let awaited = false
    Pictures.nextLoader = delay(10).then(() => {
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
    Pictures.modCount = 50
    await loadImage()
    expect(postJSONSpy.callCount).toBe(1)
  })
  it('should call postJSON with expected url for navigate latest', async () => {
    Pictures.modCount = 50
    await loadImage()
    expect(postJSONSpy.calledWith('/api/navigate/latest')).toBe(true)
  })
  it('should call postJSON with expected body for navigate latest', async () => {
    Pictures.modCount = 50
    await loadImage()
    expect(postJSONSpy.firstCall.args[1]).toEqual({
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
      Pictures.modCount = 99
      await loadImage()
      const fn = cast<(_: unknown) => unknown>(postJSONSpy.firstCall.args[2])
      expect(fn(input)).toBe(result)
    })
  })
  it('should trigger reload when new modcount is undefined', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(undefined)
    await loadImage()
    expect(publishStub.withArgs('Navigate:Reload').callCount).toBe(1)
  })
  it('should not update image src when new modcount is undefined', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(undefined)
    await loadImage()
    expect(Pictures.mainImage?.src).toBe('')
  })
  it('should trigger reload when new modcount is NaN', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(NaN)
    await loadImage()
    expect(publishStub.withArgs('Navigate:Reload').callCount).toBe(1)
  })
  it('should not update image src when new modcount is NaN', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(NaN)
    await loadImage()
    expect(Pictures.mainImage?.src).toBe('')
  })
  it('should trigger reload when new modcount is negative', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(-1)
    await loadImage()
    expect(publishStub.withArgs('Navigate:Reload').callCount).toBe(1)
  })
  it('should not update image src when new modcount is negative', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(-1)
    await loadImage()
    expect(Pictures.mainImage?.src).toBe('')
  })
  it('should not initiate reload when new modcount is zero', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(0)
    await loadImage()
    expect(publishStub.withArgs('Navigate:Reload').callCount).toBe(0)
  })
  it('should update modcount to zero on successful post', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(0)
    await loadImage()
    expect(Pictures.modCount).toBe(0)
  })
  it('should not reload when modcount is valid', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(76)
    await loadImage()
    expect(publishStub.withArgs('Navigate:Reload').callCount).toBe(0)
  })
  it('should update modcount on successful post', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(76)
    await loadImage()
    expect(Pictures.modCount).toBe(76)
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
    expect(selectPageSpy.calledWith(40)).toBe(true)
  })
  it('should select default page when current image omits page marker', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.page = undefined
    await loadImage()
    expect(selectPageSpy.calledWith(1)).toBe(true)
  })
  it('should publish LoadNew message on successful load', async () => {
    await loadImage()
    expect(publishStub.withArgs('Picture:LoadNew').callCount).toBe(1)
  })
  it('should not publish LoadingError on successful load', async () => {
    await loadImage()
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(0)
  })
  it('should publish LoadNew message even if loadNextImage rejects', async () => {
    loadNextImageSpy.rejects('ERROR!')
    await loadImage()
    expect(publishStub.withArgs('Picture:LoadNew').callCount).toBe(1)
  })
  it('should not publish LoadingError even if loadNextImage rejects', async () => {
    loadNextImageSpy.rejects('ERROR!')
    await loadImage()
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(0)
  })
  it('should publish error when postJSON throws error', async () => {
    const expectedErr = new Error('IGGY WIGGY, LETS GET JIGGY')
    postJSONSpy.rejects(expectedErr)
    await loadImage()
    expect(publishStub.calledWith('Loading:Error', expectedErr)).toBe(true)
  })
})
