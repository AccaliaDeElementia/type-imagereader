'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Loading } from '../../../public/scripts/app/loading'
import { WakeLock } from '../../../public/scripts/app/wakelock'
import { Actions } from '../../../public/scripts/app/actions'
import { Tabs } from '../../../public/scripts/app/tabs'
import { Folders } from '../../../public/scripts/app/folders'
import { Pictures } from '../../../public/scripts/app/pictures'
import { Bookmarks } from '../../../public/scripts/app/bookmarks'
import { Navigation } from '../../../public/scripts/app/navigation'
import { PubSub } from '../../../public/scripts/app/pubsub'

describe('public/app initialzation', () => {
  let loadingInitSpy: Sinon.SinonStub = Sinon.stub()
  let actionsInitSpy: Sinon.SinonStub = Sinon.stub()
  let tabsInitSpy: Sinon.SinonStub = Sinon.stub()
  let foldersInitSpy: Sinon.SinonStub = Sinon.stub()
  let picturesInitSpy: Sinon.SinonStub = Sinon.stub()
  let bookmarksInitSpy: Sinon.SinonStub = Sinon.stub()
  let navigationInitSpy: Sinon.SinonStub = Sinon.stub()
  let pubsubDeferredSpy: Sinon.SinonStub = Sinon.stub()
  let wakeLockInitSpy: Sinon.SinonStub = Sinon.stub()
  beforeEach(() => {
    loadingInitSpy = Sinon.stub(Loading, 'Init')
    actionsInitSpy = Sinon.stub(Actions, 'Init')
    tabsInitSpy = Sinon.stub(Tabs, 'Init')
    foldersInitSpy = Sinon.stub(Folders, 'Init')
    picturesInitSpy = Sinon.stub(Pictures, 'Init')
    bookmarksInitSpy = Sinon.stub(Bookmarks, 'Init')
    navigationInitSpy = Sinon.stub(Navigation, 'Init')
    pubsubDeferredSpy = Sinon.stub(PubSub, 'StartDeferred')
    wakeLockInitSpy = Sinon.stub(WakeLock, 'Init')
  })
  afterEach(() => {
    loadingInitSpy.restore()
    actionsInitSpy.restore()
    tabsInitSpy.restore()
    foldersInitSpy.restore()
    picturesInitSpy.restore()
    bookmarksInitSpy.restore()
    navigationInitSpy.restore()
    pubsubDeferredSpy.restore()
    wakeLockInitSpy.restore()
  })
  it('inits all modules', async () => {
    await import('../../../public/scripts/app/index')
    expect(loadingInitSpy.called, 'Loading.Init() should be called').to.equal(true)
    expect(actionsInitSpy.called, 'Actions.Init() should be called').to.equal(true)
    expect(tabsInitSpy.called, 'Tabs.Init() should be called').to.equal(true)
    expect(foldersInitSpy.called, 'Folders.Init() should be called').to.equal(true)
    expect(picturesInitSpy.called, 'Pictures.Init() should be called').to.equal(true)
    expect(bookmarksInitSpy.called, 'Bookmarks.Init() should be called').to.equal(true)
    expect(navigationInitSpy.called, 'Navigatin.Init() should be called').to.equal(true)
    expect(pubsubDeferredSpy.called, 'PubSub.StartDeferred() should be called').to.equal(true)
    expect(wakeLockInitSpy.called, 'WaleLock.Init()  should be called').to.equal(true)
  })
})
