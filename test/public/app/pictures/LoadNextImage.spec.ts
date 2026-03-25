'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { NavigateTo, Pictures } from '#public/scripts/app/pictures'
import { Cast } from '#testutils/TypeGuards'
import { render } from 'pug'
import type { Picture } from '#contracts/listing'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures function LoadNextImage()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  const fetchStub = Sinon.stub()
  let getPictureStub = Sinon.stub()
  let getShowUnreadOnlyStub = Sinon.stub()
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
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    dom.window.fetch = fetchStub
    fetchStub.reset()
    fetchStub.resolves()
    getPictureStub = sandbox.stub(Pictures, 'GetPicture').returns(next)
    getShowUnreadOnlyStub = sandbox.stub(Pictures, 'GetShowUnreadOnly').returns(false)
    mainImage.width = 1024
    mainImage.height = 768
    Pictures.mainImage = Cast<HTMLImageElement>(mainImage)
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should call GetPicture once when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.returns(false)
    await Pictures.LoadNextImage()
    expect(getPictureStub.callCount).to.equal(1)
  })
  it('should call GetPicture with one argument when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.returns(false)
    await Pictures.LoadNextImage()
    expect(getPictureStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should call GetPicture with Next navigation when ShowUnreadOnly is unset', async () => {
    getShowUnreadOnlyStub.returns(false)
    await Pictures.LoadNextImage()
    expect(getPictureStub.firstCall.args[0]).to.equal(NavigateTo.Next)
  })
  it('should call GetPicture once when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.returns(true)
    await Pictures.LoadNextImage()
    expect(getPictureStub.callCount).to.equal(1)
  })
  it('should call GetPicture with one argument when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.returns(true)
    await Pictures.LoadNextImage()
    expect(getPictureStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should call GetPicture with NextUnread navigation when ShowUnreadOnly is set', async () => {
    getShowUnreadOnlyStub.returns(true)
    await Pictures.LoadNextImage()
    expect(getPictureStub.firstCall.args[0]).to.equal(NavigateTo.NextUnread)
  })
  it('should set nextLoader', async () => {
    const sentinal = Promise.resolve()
    Pictures.nextLoader = sentinal
    await Pictures.LoadNextImage()
    expect(Pictures.nextLoader).to.not.equal(sentinal)
  })
  it('should set nextPending on exec', async () => {
    Pictures.nextPending = false
    const promise = Pictures.LoadNextImage()
    expect(Pictures.nextPending).to.equal(true)
    await promise
  })
  it('should clear nextPending on no next image', async () => {
    Pictures.nextPending = true
    getPictureStub.returns(undefined)
    const promise = Pictures.LoadNextImage()
    expect(Pictures.nextPending).to.equal(false)
    await promise
  })
  it('should set nextPending during fetch resolve', async () => {
    fetchStub.resolves()
    const promise = Pictures.LoadNextImage()
    expect(Pictures.nextPending).to.equal(true)
    await promise
  })
  it('should clear nextPending on fetch resolve', async () => {
    fetchStub.resolves()
    await Pictures.LoadNextImage()
    expect(Pictures.nextPending).to.equal(false)
  })
  it('should set nextPending during fetch reject', async () => {
    fetchStub.rejects('BOO')
    const promise = Pictures.LoadNextImage()
    expect(Pictures.nextPending).to.equal(true)
    await promise
  })
  it('should clear nextPending on fetch reject', async () => {
    fetchStub.rejects('BOO')
    await Pictures.LoadNextImage()
    expect(Pictures.nextPending).to.equal(false)
  })
  it('should not fetch on no next image', async () => {
    getPictureStub.returns(undefined)
    await Pictures.LoadNextImage()
    expect(fetchStub.callCount).to.equal(0)
  })
  it('should fetch once for next image', async () => {
    await Pictures.LoadNextImage()
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should fetch with one argument for next image', async () => {
    await Pictures.LoadNextImage()
    expect(fetchStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should fetch expected url for next image', async () => {
    await Pictures.LoadNextImage()
    expect(fetchStub.firstCall.args[0]).to.equal('/images/scaled/1024/768/foobar.png-image.webp')
  })
  it('should fetch once with main image width set', async () => {
    mainImage.width = 65535
    await Pictures.LoadNextImage()
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should fetch with one argument with main image width set', async () => {
    mainImage.width = 65535
    await Pictures.LoadNextImage()
    expect(fetchStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should fetch expected url with main image width set', async () => {
    mainImage.width = 65535
    await Pictures.LoadNextImage()
    expect(fetchStub.firstCall.args[0]).to.contain('scaled/65535/768/')
  })
  it('should fetch once with main image height set', async () => {
    mainImage.height = 65535
    await Pictures.LoadNextImage()
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should fetch with one argument with main image height set', async () => {
    mainImage.height = 65535
    await Pictures.LoadNextImage()
    expect(fetchStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should fetch expected url with main image height set', async () => {
    mainImage.height = 65535
    await Pictures.LoadNextImage()
    expect(fetchStub.firstCall.args[0]).to.contain('scaled/1024/65535/')
  })
})
