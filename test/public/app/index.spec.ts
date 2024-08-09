'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Loading } from '../../../public/scripts/app/loading'
import { WakeLock } from '../../../public/scripts/app/wakelock'
import { Actions } from '../../../public/scripts/app/actions'
import { Tabs } from '../../../public/scripts/app/tabs'
import { Folders } from '../../../public/scripts/app/folders'
import { Pictures } from '../../../public/scripts/app/pictures'
import { Bookmarks } from '../../../public/scripts/app/bookmarks'
import { Navigation } from '../../../public/scripts/app/navigation'
import { PubSub } from '../../../public/scripts/app/pubsub'

@suite
export class AppIndexTests {
  loadingInitSpy: Sinon.SinonStub = sinon.stub()
  actionsInitSpy: Sinon.SinonStub = sinon.stub()
  tabsInitSpy: Sinon.SinonStub = sinon.stub()
  foldersInitSpy: Sinon.SinonStub = sinon.stub()
  picturesInitSpy: Sinon.SinonStub = sinon.stub()
  bookmarksInitSpy: Sinon.SinonStub = sinon.stub()
  navigationInitSpy: Sinon.SinonStub = sinon.stub()
  pubsubDeferredSpy: Sinon.SinonStub = sinon.stub()
  wakeLockInitSpy: Sinon.SinonStub = sinon.stub()

  before () {
    this.loadingInitSpy = sinon.stub(Loading, 'Init')
    this.actionsInitSpy = sinon.stub(Actions, 'Init')
    this.tabsInitSpy = sinon.stub(Tabs, 'Init')
    this.foldersInitSpy = sinon.stub(Folders, 'Init')
    this.picturesInitSpy = sinon.stub(Pictures, 'Init')
    this.bookmarksInitSpy = sinon.stub(Bookmarks, 'Init')
    this.navigationInitSpy = sinon.stub(Navigation, 'Init')
    this.pubsubDeferredSpy = sinon.stub(PubSub, 'StartDeferred')
    this.wakeLockInitSpy = sinon.stub(WakeLock, 'Init')
  }

  after () {
    this.loadingInitSpy.restore()
    this.actionsInitSpy.restore()
    this.tabsInitSpy.restore()
    this.foldersInitSpy.restore()
    this.picturesInitSpy.restore()
    this.bookmarksInitSpy.restore()
    this.navigationInitSpy.restore()
    this.pubsubDeferredSpy.restore()
    this.wakeLockInitSpy.restore()
  }

  @test
  async 'it inits all modules' () {
    await import('../../../public/scripts/app/index')
    expect(this.loadingInitSpy.called, 'Loading.Init() should be called').to.equal(true)
    expect(this.actionsInitSpy.called, 'Actions.Init() should be called').to.equal(true)
    expect(this.tabsInitSpy.called, 'Tabs.Init() should be called').to.equal(true)
    expect(this.foldersInitSpy.called, 'Folders.Init() should be called').to.equal(true)
    expect(this.picturesInitSpy.called, 'Pictures.Init() should be called').to.equal(true)
    expect(this.bookmarksInitSpy.called, 'Bookmarks.Init() should be called').to.equal(true)
    expect(this.navigationInitSpy.called, 'Navigatin.Init() should be called').to.equal(true)
    expect(this.pubsubDeferredSpy.called, 'PubSub.StartDeferred() should be called').to.equal(true)
    expect(this.wakeLockInitSpy.called, 'WaleLock.Init()  should be called').to.equal(true)
  }
}
