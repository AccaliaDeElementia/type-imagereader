'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Imports, bootstrap } from '#public/scripts/app/bootstrap.js'

const sandbox = Sinon.createSandbox()

describe('public/app/bootstrap', () => {
  let loadingInitSpy: Sinon.SinonStub = sandbox.stub()
  let confirmInitSpy: Sinon.SinonStub = sandbox.stub()
  let actionsInitSpy: Sinon.SinonStub = sandbox.stub()
  let tabsInitSpy: Sinon.SinonStub = sandbox.stub()
  let foldersInitSpy: Sinon.SinonStub = sandbox.stub()
  let picturesInitSpy: Sinon.SinonStub = sandbox.stub()
  let bookmarksInitSpy: Sinon.SinonStub = sandbox.stub()
  let navigationInitSpy: Sinon.SinonStub = sandbox.stub()
  let pubsubDeferredSpy: Sinon.SinonStub = sandbox.stub()
  let wakeLockInitSpy: Sinon.SinonStub = sandbox.stub()
  beforeAll(() => {
    loadingInitSpy = sandbox.stub(Imports, 'LoadingInit')
    confirmInitSpy = sandbox.stub(Imports, 'ConfirmInit')
    actionsInitSpy = sandbox.stub(Imports, 'ActionsInit')
    tabsInitSpy = sandbox.stub(Imports, 'TabsInit')
    foldersInitSpy = sandbox.stub(Imports, 'FoldersInit')
    picturesInitSpy = sandbox.stub(Imports, 'PicturesInit')
    bookmarksInitSpy = sandbox.stub(Imports, 'BookmarksInit')
    navigationInitSpy = sandbox.stub(Imports, 'NavigationInit')
    pubsubDeferredSpy = sandbox.stub(Imports, 'PubSubStartDeferred')
    wakeLockInitSpy = sandbox.stub(Imports, 'WakeLockInit')
    bootstrap()
  })
  afterAll(() => {
    sandbox.restore()
  })
  it('should call Loading.init()', () => {
    expect(loadingInitSpy.called).to.equal(true)
  })
  it('should call Confirm.init()', () => {
    expect(confirmInitSpy.called).to.equal(true)
  })
  it('should call Actions.init()', () => {
    expect(actionsInitSpy.called).to.equal(true)
  })
  it('should call Tabs.init()', () => {
    expect(tabsInitSpy.called).to.equal(true)
  })
  it('should call Folders.init()', () => {
    expect(foldersInitSpy.called).to.equal(true)
  })
  it('should call Pictures.init()', () => {
    expect(picturesInitSpy.called).to.equal(true)
  })
  it('should call Bookmarks.init()', () => {
    expect(bookmarksInitSpy.called).to.equal(true)
  })
  it('should call Navigation.init()', () => {
    expect(navigationInitSpy.called).to.equal(true)
  })
  it('should call PubSub.startDeferred()', () => {
    expect(pubsubDeferredSpy.called).to.equal(true)
  })
  it('should call WakeLock.init()', () => {
    expect(wakeLockInitSpy.called).to.equal(true)
  })
})
