'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { NavigateTo, Viewer } from '#public/scripts/app/pictures/viewer.js'
import { UnreadFilter } from '#public/scripts/app/pictures/unreadFilter.js'
import { Cast } from '#testutils/TypeGuards.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures function LoadNextImage()', () => {
  let dom = new JSDOM('<html></html>', {})
  const fetchStub = sandbox.stub()
  let getPictureStub = sandbox.stub()
  let getShowUnreadOnlyStub = sandbox.stub()
  const next: Picture = {
    name: 'foobar',
    path: '/foobar.png',
    seen: false,
  }
  const mainImage = {
    width: Cast<number | undefined>(1024),
    height: Cast<number | undefined>(768),
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    dom.window.fetch = fetchStub
    fetchStub.reset()
    fetchStub.resolves()
    getPictureStub = sandbox.stub(Viewer, 'GetPicture').returns(next)
    getShowUnreadOnlyStub = sandbox.stub(UnreadFilter, 'GetShowUnreadOnly').returns(false)
    mainImage.width = 1024
    mainImage.height = 768
    Pictures.mainImage = Cast<HTMLImageElement>(mainImage)
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should call GetPicture once when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.returns(false)
    await Viewer.LoadNextImage()
    expect(getPictureStub.callCount).to.equal(1)
  })
  it('should call GetPicture with one argument when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.returns(false)
    await Viewer.LoadNextImage()
    expect(getPictureStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should call GetPicture with Next navigation when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.returns(false)
    await Viewer.LoadNextImage()
    expect(getPictureStub.firstCall.args[0]).to.equal(NavigateTo.Next)
  })
  it('should call GetPicture once when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.returns(true)
    await Viewer.LoadNextImage()
    expect(getPictureStub.callCount).to.equal(1)
  })
  it('should call GetPicture with one argument when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.returns(true)
    await Viewer.LoadNextImage()
    expect(getPictureStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should call GetPicture with NextUnread navigation when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.returns(true)
    await Viewer.LoadNextImage()
    expect(getPictureStub.firstCall.args[0]).to.equal(NavigateTo.NextUnread)
  })
  it('should set nextLoader', async () => {
    const sentinal = Promise.resolve()
    Pictures.nextLoader = sentinal
    await Viewer.LoadNextImage()
    expect(Pictures.nextLoader).to.not.equal(sentinal)
  })
  it('should set nextPending on exec', async () => {
    Pictures.nextPending = false
    const promise = Viewer.LoadNextImage()
    expect(Pictures.nextPending).to.equal(true)
    await promise
  })
  it('should clear nextPending on no next image', async () => {
    Pictures.nextPending = true
    getPictureStub.returns(undefined)
    const promise = Viewer.LoadNextImage()
    expect(Pictures.nextPending).to.equal(false)
    await promise
  })
  it('should set nextPending during fetch resolve', async () => {
    fetchStub.resolves()
    const promise = Viewer.LoadNextImage()
    expect(Pictures.nextPending).to.equal(true)
    await promise
  })
  it('should clear nextPending on fetch resolve', async () => {
    fetchStub.resolves()
    await Viewer.LoadNextImage()
    expect(Pictures.nextPending).to.equal(false)
  })
  it('should set nextPending during fetch reject', async () => {
    fetchStub.rejects('BOO')
    const promise = Viewer.LoadNextImage()
    expect(Pictures.nextPending).to.equal(true)
    await promise
  })
  it('should clear nextPending on fetch reject', async () => {
    fetchStub.rejects('BOO')
    await Viewer.LoadNextImage()
    expect(Pictures.nextPending).to.equal(false)
  })
  it('should not fetch on no next image', async () => {
    getPictureStub.returns(undefined)
    await Viewer.LoadNextImage()
    expect(fetchStub.callCount).to.equal(0)
  })
  it('should fetch once for next image', async () => {
    await Viewer.LoadNextImage()
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should fetch with one argument for next image', async () => {
    await Viewer.LoadNextImage()
    expect(fetchStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should fetch expected url for next image', async () => {
    await Viewer.LoadNextImage()
    expect(fetchStub.firstCall.args[0]).to.equal('/images/scaled/1024/768/foobar.png-image.webp')
  })
  it('should fetch once with main image width set', async () => {
    mainImage.width = 65535
    await Viewer.LoadNextImage()
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should fetch with one argument with main image width set', async () => {
    mainImage.width = 65535
    await Viewer.LoadNextImage()
    expect(fetchStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should fetch expected url with main image width set', async () => {
    mainImage.width = 65535
    await Viewer.LoadNextImage()
    expect(fetchStub.firstCall.args[0]).to.contain('scaled/65535/768/')
  })
  it('should fetch once with main image height set', async () => {
    mainImage.height = 65535
    await Viewer.LoadNextImage()
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should fetch with one argument with main image height set', async () => {
    mainImage.height = 65535
    await Viewer.LoadNextImage()
    expect(fetchStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should fetch expected url with main image height set', async () => {
    mainImage.height = 65535
    await Viewer.LoadNextImage()
    expect(fetchStub.firstCall.args[0]).to.contain('scaled/1024/65535/')
  })
})
