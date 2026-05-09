'use sanity'

import Sinon from 'sinon'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { changePicture, Imports, Internals } from '#public/scripts/app/pictures/viewer.js'
import { expect } from 'chai'
import { PubSub } from '#public/scripts/app/pubsub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures changePicture()', () => {
  const menuHideSpy = sandbox.stub().resolves()
  const loadingErrorSpy = sandbox.stub().resolves()
  let isLoadingSpy = sandbox.stub()
  let loadImageSpy = sandbox.stub()
  beforeEach(() => {
    Pictures.current = null
    PubSub.subscribers = {
      'MENU:HIDE': [menuHideSpy],
      'LOADING:ERROR': [loadingErrorSpy],
    }
    menuHideSpy.resetHistory()
    loadingErrorSpy.resetHistory()
    isLoadingSpy = sandbox.stub(Imports, 'isLoading').returns(false)
    loadImageSpy = sandbox.stub(Internals, 'loadImage').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should not set current picture if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await changePicture({ name: '', path: '', seen: false })
    expect(Pictures.current).to.equal(null)
  })
  it('should not load image if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await changePicture({ name: '', path: '', seen: false })
    expect(loadImageSpy.callCount).to.equal(0)
  })
  it('should not hide menu if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await changePicture({ name: '', path: '', seen: false })
    expect(menuHideSpy.callCount).to.equal(0)
  })
  it('should not publish error if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await changePicture(undefined)
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should not set current image when changing to empty picture', async () => {
    const pic = { name: '', path: '', seen: true }
    Pictures.current = pic
    await changePicture(undefined)
    expect(Pictures.current).to.equal(pic)
  })
  it('should not load image when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(loadImageSpy.callCount).to.equal(0)
  })
  it('should not hide menu when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(menuHideSpy.callCount).to.equal(0)
  })
  it('should publish error when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(loadingErrorSpy.callCount).to.equal(1)
  })
  it('should publish specific error message when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(loadingErrorSpy.firstCall.args[0]).to.equal('Change Picture called with No Picture to change to')
  })
  it('should set current image when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(Pictures.current).to.equal(pic)
  })
  it('should hide menu when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should tolerate loadImage rejecting', async () => {
    const pic = { name: '', path: '', seen: true }
    loadImageSpy.rejects('FOO!')
    await changePicture(pic)
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should load image when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(loadImageSpy.callCount).to.equal(1)
  })
  it('should not publish error when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
})
