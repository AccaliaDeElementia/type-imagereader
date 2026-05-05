'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Loading } from '#public/scripts/app/loading.js'
import { Confirm } from '#public/scripts/app/confirm.js'
import { WakeLock } from '#public/scripts/app/wakelock.js'
import { Actions } from '#public/scripts/app/actions.js'
import { Tabs } from '#public/scripts/app/tabs.js'
import { Folders } from '#public/scripts/app/folders.js'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Bookmarks } from '#public/scripts/app/bookmarks.js'
import { Navigation } from '#public/scripts/app/navigation.js'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { bootstrap } from '#public/scripts/app/index.js'

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
  before(() => {
    loadingInitSpy = sandbox.stub(Loading, 'Init')
    confirmInitSpy = sandbox.stub(Confirm, 'Init')
    actionsInitSpy = sandbox.stub(Actions, 'Init')
    tabsInitSpy = sandbox.stub(Tabs, 'Init')
    foldersInitSpy = sandbox.stub(Folders, 'Init')
    picturesInitSpy = sandbox.stub(Pictures, 'Init')
    bookmarksInitSpy = sandbox.stub(Bookmarks, 'Init')
    navigationInitSpy = sandbox.stub(Navigation, 'Init')
    pubsubDeferredSpy = sandbox.stub(PubSub, 'StartDeferred')
    wakeLockInitSpy = sandbox.stub(WakeLock, 'Init')
    bootstrap()
  })
  after(() => {
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
