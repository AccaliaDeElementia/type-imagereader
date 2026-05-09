'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Imports, bootstrap } from '#public/scripts/app/index.js'

const sandbox = Sinon.createSandbox()

describe('public/app initialzation', () => {
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
  it('should call Loading.Init()', () => {
    expect(loadingInitSpy.called).to.equal(true)
  })
  it('should call Confirm.Init()', () => {
    expect(confirmInitSpy.called).to.equal(true)
  })
  it('should call Actions.Init()', () => {
    expect(actionsInitSpy.called).to.equal(true)
  })
  it('should call Tabs.Init()', () => {
    expect(tabsInitSpy.called).to.equal(true)
  })
  it('should call Folders.Init()', () => {
    expect(foldersInitSpy.called).to.equal(true)
  })
  it('should call Pictures.Init()', () => {
    expect(picturesInitSpy.called).to.equal(true)
  })
  it('should call Bookmarks.Init()', () => {
    expect(bookmarksInitSpy.called).to.equal(true)
  })
  it('should call Navigation.Init()', () => {
    expect(navigationInitSpy.called).to.equal(true)
  })
  it('should call PubSub.StartDeferred()', () => {
    expect(pubsubDeferredSpy.called).to.equal(true)
  })
  it('should call WakeLock.Init()', () => {
    expect(wakeLockInitSpy.called).to.equal(true)
  })
})
