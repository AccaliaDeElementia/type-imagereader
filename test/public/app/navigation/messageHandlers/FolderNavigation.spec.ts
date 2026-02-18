'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../testutils/TypeGuards'
import { Pictures } from '../../../../../public/scripts/app/pictures'
import { EventuallyRejects } from '../../../../testutils/Errors'

const markup = `
html
  head
    title
  body
    div
      a.navbar-brand
      a.menuButton
    div#mainMenu
      div.innerTarget
`
describe('public/app/navigation function Init()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []
    tabSelectedSpy.resolves()
    PubSub.Subscribe('Tab:Selected', tabSelectedSpy)
    loadDataStub = Sinon.stub(Navigation, 'LoadData').resolves()
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
  })
  afterEach(() => {
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
  })
  describe('Action:Execute:PreviousFolder message Handler', () => {
    let navigateToStub = Sinon.stub()
    let showUnreadOnlyStub = Sinon.stub()
    let previousFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let previousUnreadFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      showUnreadOnlyStub = Sinon.stub(Pictures, 'GetShowUnreadOnly').returns(false)
      Navigation.Init()
      previousFolder = {
        name: `Foo ${Math.random()}`,
        path: `/Foo ${Math.random()}`,
        cover: `/Foo ${Math.random()}/bar.jpg`,
      }
      previousUnreadFolder = {
        name: `Bar ${Math.random()}`,
        path: `/Bar ${Math.random()}`,
        cover: `/Bar ${Math.random()}/baz.jpg`,
      }
      Navigation.current.prev = previousFolder
      Navigation.current.prevUnread = previousUnreadFolder
      const h = PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
      showUnreadOnlyStub.restore()
    })
    it('should navigate to previous folder when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(previousFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should tolerate missing previous folder when showUnreadOnly is not set', async () => {
      Navigation.current.prev = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should navigate to previous unread folder when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(previousUnreadFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should tolerate missing previous unread folder when showUnreadOnly is set', async () => {
      Navigation.current.prevUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:NextFolder message Handler', () => {
    let navigateToStub = Sinon.stub()
    let showUnreadOnlyStub = Sinon.stub()
    let nextFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let nextUnreadFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      showUnreadOnlyStub = Sinon.stub(Pictures, 'GetShowUnreadOnly').returns(false)
      Navigation.Init()
      nextFolder = {
        name: `Foo ${Math.random()}`,
        path: `/Foo ${Math.random()}`,
        cover: `/Foo ${Math.random()}/bar.jpg`,
      }
      nextUnreadFolder = {
        name: `Bar ${Math.random()}`,
        path: `/Bar ${Math.random()}`,
        cover: `/Bar ${Math.random()}/baz.jpg`,
      }
      Navigation.current.next = nextFolder
      Navigation.current.nextUnread = nextUnreadFolder
      const h = PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
      showUnreadOnlyStub.restore()
    })
    it('should navigate to next folder when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(nextFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should tolerate missing next folder when showUnreadOnly is not set', async () => {
      Navigation.current.next = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should navigate to next unread folder when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(nextUnreadFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should tolerate missing next unread folder when showUnreadOnly is set', async () => {
      Navigation.current.nextUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:ParentFolder message Handler', () => {
    let navigateToStub = Sinon.stub()
    let parentFolder = ''
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      Navigation.Init()
      parentFolder = `/Foo ${Math.random()}`
      Navigation.current.parent = parentFolder
      const h = PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
    })
    it('should navigate to parent folder', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(parentFolder)
      expect(navigateToStub.firstCall.args[1]).to.equal('ParentFolder')
    })
    it('should tolerate invalidly undefined parent folder', async () => {
      Navigation.current.parent = Cast<string>(undefined)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('ParentFolder')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:FirstUnfinished message Handler', () => {
    let navigateToStub = Sinon.stub()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    let children = [{ name: '', path: '', cover: '', totalSeen: 0, totalCount: 0 }]
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      Navigation.Init()
      children = Array(20)
        .fill(undefined)
        .map((_, i) => ({
          name: `Foo ${i}`,
          path: `/foo${i}`,
          cover: '',
          totalSeen: i,
          totalCount: i,
        }))
      Navigation.current.children = children
      const h = PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
    })
    it('should navigate to undefined when no children are undefined', async () => {
      Navigation.current.children = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to undefined when no child folder exist', async () => {
      Navigation.current.children = []
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to undefined when no child folder is unfinished', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to unfinished child folder', async () => {
      assert(children[10] != null)
      children[10].totalCount = 100
      children[10].totalSeen = 10
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(children[10].path)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to first unfinished child folder', async () => {
      assert(children[10] != null)
      children[10].totalCount = 100
      children[10].totalSeen = 10
      assert(children[11] != null)
      children[11].totalCount = 100
      children[11].totalSeen = 10
      assert(children[19] != null)
      children[19].totalCount = 100
      children[19].totalSeen = 10
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(children[10].path)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
})
