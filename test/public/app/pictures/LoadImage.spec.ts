'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '#public/scripts/app/pictures'
import { Cast } from '#testutils/TypeGuards'
import { render } from 'pug'
import type { Picture } from '#contracts/listing'
import { PubSub } from '#public/scripts/app/pubsub'
import { Net } from '#public/scripts/app/net'
import { resetPubSub } from '#testutils/PubSub'
import { Delay } from '#testutils/Utils'
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

describe('public/app/pictures function LoadImage()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  const totalCount = 1500
  let current: Picture = {
    path: '',
    name: '',
    seen: false,
  }

  let element: HTMLElement | null = null
  let postJSONSpy = Sinon.stub()
  let selectPageSpy = Sinon.stub()
  Sinon.stub()
  let loadNextImageSpy = Sinon.stub()
  const loadingShowSpy = Sinon.stub().resolves()
  const loadingErrorSpy = Sinon.stub().resolves()
  const loadNewSpy = Sinon.stub().resolves()
  const reloadSpy = Sinon.stub().resolves()
  let bottomLeftText: HTMLElement | null = null
  let bottomCenterText: HTMLElement | null = null
  let bottomRightText: HTMLElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
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
    postJSONSpy = sandbox.stub(Net, 'PostJSON')
    postJSONSpy.resolves(50)
    sandbox.stub(Pictures, 'GetPicture').returns(undefined)
    selectPageSpy = sandbox.stub(Pictures, 'SelectPage')
    loadNextImageSpy = sandbox.stub(Pictures, 'LoadNextImage').resolves()
    PubSub.subscribers = {
      'LOADING:SHOW': [loadingShowSpy],
      'LOADING:ERROR': [loadingErrorSpy],
      'PICTURE:LOADNEW': [loadNewSpy],
      'NAVIGATE:RELOAD': [reloadSpy],
    }

    bottomCenterText = dom.window.document.querySelector('.statusBar.bottom .center')
    bottomLeftText = dom.window.document.querySelector('.statusBar.bottom .left')
    bottomRightText = dom.window.document.querySelector('.statusBar.bottom .right')
  })
  afterEach(() => {
    sandbox.restore()

    loadingShowSpy.resetHistory()
    loadingErrorSpy.resetHistory()
    loadNewSpy.resetHistory()
    reloadSpy.resetHistory()
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should be noop when current image is null', async () => {
    Pictures.current = null
    Pictures.nextPending = true
    await Pictures.LoadImage()
    expect(loadingShowSpy.called).to.equal(false)
  })
  it('should be noop when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    Pictures.nextPending = true
    await Pictures.LoadImage()
    expect(loadingShowSpy.called).to.equal(false)
  })
  it('should not call PostJSON when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    await Pictures.LoadImage()
    expect(postJSONSpy.callCount).to.equal(0)
  })
  it('should not update image src when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    await Pictures.LoadImage()
    expect(Pictures.mainImage?.getAttribute('src')).to.equal(null)
  })
  it('should not publish LoadNew when current image path is empty', async () => {
    assert(Pictures.current !== null)
    Pictures.current.path = ''
    await Pictures.LoadImage()
    expect(loadNewSpy.callCount).to.equal(0)
  })
  it('should show loading when next is pending', async () => {
    Pictures.nextPending = true
    await Pictures.LoadImage()
    expect(loadingShowSpy.called).to.equal(true)
  })
  it('should not show loading when next is not pending', async () => {
    Pictures.nextPending = false
    await Pictures.LoadImage()
    expect(loadingShowSpy.called).to.equal(false)
  })
  it('should not await next loader when image is null', async () => {
    Pictures.current = null
    let awaited = false
    Pictures.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(false)
  })
  it('should await next loader when image is valid', async () => {
    let awaited = false
    Pictures.nextLoader = Delay(10).then(() => {
      awaited = true
    })
    await Pictures.LoadImage()
    expect(awaited).to.equal(true)
  })
  it('should set seen on current picture', async () => {
    current.seen = false
    await Pictures.LoadImage()
    expect(current.seen).to.equal(true)
  })
  it('should set seen css class on current element', async () => {
    element?.classList.remove('seen')
    await Pictures.LoadImage()
    expect(element?.classList.contains('seen')).to.equal(true)
  })
  it('should call PostJSON once for navigate latest', async () => {
    Pictures.modCount = 50
    await Pictures.LoadImage()
    expect(postJSONSpy.callCount).to.equal(1)
  })
  it('should call PostJSON with expected url for navigate latest', async () => {
    Pictures.modCount = 50
    await Pictures.LoadImage()
    expect(postJSONSpy.calledWith('/api/navigate/latest')).to.equal(true)
  })
  it('should call PostJSON with expected body for navigate latest', async () => {
    Pictures.modCount = 50
    await Pictures.LoadImage()
    expect(postJSONSpy.firstCall.args[1]).to.deep.equal({
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
    it(`should ${result ? '' : 'not '}accept ${title} as modcount from PostJSON`, async () => {
      Pictures.modCount = 99
      await Pictures.LoadImage()
      const fn = Cast<(_: unknown) => unknown>(postJSONSpy.firstCall.args[2])
      expect(fn(input)).to.equal(result)
    })
  })
  it('should trigger reload when new modcount is undefined', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(reloadSpy.callCount).to.equal(1)
  })
  it('should not update image src when new modcount is undefined', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(undefined)
    await Pictures.LoadImage()
    expect(Pictures.mainImage?.src).to.equal('')
  })
  it('should trigger reload when new modcount is NaN', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(NaN)
    await Pictures.LoadImage()
    expect(reloadSpy.callCount).to.equal(1)
  })
  it('should not update image src when new modcount is NaN', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(NaN)
    await Pictures.LoadImage()
    expect(Pictures.mainImage?.src).to.equal('')
  })
  it('should trigger reload when new modcount is negative', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(-1)
    await Pictures.LoadImage()
    expect(reloadSpy.callCount).to.equal(1)
  })
  it('should not update image src when new modcount is negative', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(-1)
    await Pictures.LoadImage()
    expect(Pictures.mainImage?.src).to.equal('')
  })
  it('should not initiate reload when new modcount is zero', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(0)
    await Pictures.LoadImage()
    expect(reloadSpy.callCount).to.equal(0)
  })
  it('should update modcount to zero on successful post', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(0)
    await Pictures.LoadImage()
    expect(Pictures.modCount).to.equal(0)
  })
  it('should not reload when modcount is valid', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(76)
    await Pictures.LoadImage()
    expect(reloadSpy.callCount).to.equal(0)
  })
  it('should update modcount on successful post', async () => {
    Pictures.modCount = 99
    postJSONSpy.resolves(76)
    await Pictures.LoadImage()
    expect(Pictures.modCount).to.equal(76)
  })
  it('should set src on image', async () => {
    await Pictures.LoadImage()
    expect(Pictures.mainImage?.getAttribute('src')).to.equal('/images/scaled/0/0/some/path/1250.png-image.webp')
  })
  it('should set src height on image', async () => {
    assert(Pictures.mainImage !== null)
    Pictures.mainImage.height = 512
    await Pictures.LoadImage()
    expect(Pictures.mainImage.getAttribute('src')).to.equal('/images/scaled/0/512/some/path/1250.png-image.webp')
  })
  it('should set src width on image', async () => {
    assert(Pictures.mainImage !== null)
    Pictures.mainImage.width = 1024
    await Pictures.LoadImage()
    expect(Pictures.mainImage.getAttribute('src')).to.equal('/images/scaled/1024/0/some/path/1250.png-image.webp')
  })
  it('should set statusbar name', async () => {
    await Pictures.LoadImage()
    expect(bottomCenterText?.innerHTML).to.equal('1250.png')
  })
  it('should set statusbar percent', async () => {
    await Pictures.LoadImage()
    expect(bottomRightText?.innerHTML).to.equal('(83.4%)')
  })
  it('should set statusbar position', async () => {
    await Pictures.LoadImage()
    expect(bottomLeftText?.innerHTML).to.equal('(1,251/1,500)')
  })
  it('should default to first image name on missing index', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.index = undefined
    await Pictures.LoadImage()
    expect(bottomCenterText?.innerHTML).to.equal('1250.png')
  })
  it('should default to first image percentname on missing index', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.index = undefined
    await Pictures.LoadImage()
    expect(bottomRightText?.innerHTML).to.equal('(0%)')
  })
  it('should default to first image position on missing index', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.index = undefined
    await Pictures.LoadImage()
    expect(bottomLeftText?.innerHTML).to.equal('(1/1,500)')
  })
  it('should select page of currnet image', async () => {
    await Pictures.LoadImage()
    expect(selectPageSpy.calledWith(40)).to.equal(true)
  })
  it('should select default page when current image omits page marker', async () => {
    assert(Pictures.current !== null, 'Current Image must be set for valid test')
    Pictures.current.page = undefined
    await Pictures.LoadImage()
    expect(selectPageSpy.calledWith(1)).to.equal(true)
  })
  it('should publish LoadNew message on successful load', async () => {
    await Pictures.LoadImage()
    expect(loadNewSpy.callCount).to.equal(1)
  })
  it('should not publish LoadingError on successful load', async () => {
    await Pictures.LoadImage()
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should publish LoadNew message even if LoadNextImage rejects', async () => {
    loadNextImageSpy.rejects('ERROR!')
    await Pictures.LoadImage()
    expect(loadNewSpy.callCount).to.equal(1)
  })
  it('should not publish LoadingError even if LoadNextImage rejects', async () => {
    loadNextImageSpy.rejects('ERROR!')
    await Pictures.LoadImage()
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should publish error when postJSON throws error', async () => {
    const expectedErr = new Error('IGGY WIGGY, LETS GET JIGGY')
    postJSONSpy.rejects(expectedErr)
    await Pictures.LoadImage()
    expect(loadingErrorSpy.calledWith(expectedErr)).to.equal(true)
  })
})
