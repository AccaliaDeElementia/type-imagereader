'use sanity'

import Sinon from 'sinon'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { expect } from 'chai'
import { Loading } from '#public/scripts/app/loading.js'
import { PubSub } from '#public/scripts/app/pubsub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures function ChangePicture()', () => {
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
    isLoadingSpy = sandbox.stub(Loading, 'IsLoading').returns(false)
    loadImageSpy = sandbox.stub(Pictures, 'LoadImage').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should not set current picture if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await Pictures.ChangePicture({ name: '', path: '', seen: false })
    expect(Pictures.current).to.equal(null)
  })
  it('should not load image if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await Pictures.ChangePicture({ name: '', path: '', seen: false })
    expect(loadImageSpy.callCount).to.equal(0)
  })
  it('should not hide menu if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await Pictures.ChangePicture({ name: '', path: '', seen: false })
    expect(menuHideSpy.callCount).to.equal(0)
  })
  it('should not publish error if image is currently loading', async () => {
    isLoadingSpy.returns(true)
    await Pictures.ChangePicture(undefined)
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should not set current image when changing to empty picture', async () => {
    const pic = { name: '', path: '', seen: true }
    Pictures.current = pic
    await Pictures.ChangePicture(undefined)
    expect(Pictures.current).to.equal(pic)
  })
  it('should not load image when changing to empty picture', async () => {
    await Pictures.ChangePicture(undefined)
    expect(loadImageSpy.callCount).to.equal(0)
  })
  it('should not hide menu when changing to empty picture', async () => {
    await Pictures.ChangePicture(undefined)
    expect(menuHideSpy.callCount).to.equal(0)
  })
  it('should publish error when changing to empty picture', async () => {
    await Pictures.ChangePicture(undefined)
    expect(loadingErrorSpy.callCount).to.equal(1)
  })
  it('should publish specific error message when changing to empty picture', async () => {
    await Pictures.ChangePicture(undefined)
    expect(loadingErrorSpy.firstCall.args[0]).to.equal('Change Picture called with No Picture to change to')
  })
  it('should set current image when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await Pictures.ChangePicture(pic)
    expect(Pictures.current).to.equal(pic)
  })
  it('should hide menu when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await Pictures.ChangePicture(pic)
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should tolerate LoadImage rejecting', async () => {
    const pic = { name: '', path: '', seen: true }
    loadImageSpy.rejects('FOO!')
    await Pictures.ChangePicture(pic)
    expect(menuHideSpy.callCount).to.equal(1)
  })
  it('should load image when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await Pictures.ChangePicture(pic)
    expect(loadImageSpy.callCount).to.equal(1)
  })
  it('should not publish error when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await Pictures.ChangePicture(pic)
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
})
