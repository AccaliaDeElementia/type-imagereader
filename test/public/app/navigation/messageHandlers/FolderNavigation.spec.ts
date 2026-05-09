'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import { subscribe } from '#public/scripts/app/pubsub.js'
import { Imports, init, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { cast } from '#testutils/TypeGuards.js'
import { getSubscriber, resetPubSub } from '#testutils/PubSub.js'
import { eventuallyRejects } from '#testutils/Errors.js'

const sandbox = Sinon.createSandbox()

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
describe('public/app/navigation/messageHandlers init()', () => {
  let dom = new JSDOM('', {})
  const tabSelectedSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    tabSelectedSpy.resolves()
    subscribe('Tab:Selected', tabSelectedSpy)
    sandbox.stub(Internals, 'loadData').resolves()
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
  })
  afterEach(() => {
    sandbox.restore()
    tabSelectedSpy.reset()
  })
  afterAll(() => {
    unmountDom()
    Sinon.restore()
  })
  describe('Action:Execute:PreviousFolder message Handler', () => {
    let navigateToStub = sandbox.stub()
    let showUnreadOnlyStub = sandbox.stub()
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
      navigateToStub = sandbox.stub(Internals, 'NavigateTo')
      showUnreadOnlyStub = sandbox.stub(Imports, 'getShowUnreadOnly').returns(false)
      init()
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
      const h = getSubscriber('ACTION:EXECUTE:PREVIOUSFOLDER')
      handler = h
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('should call NavigateTo once when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to previous folder when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([previousFolder.path, 'PreviousFolder'])
    })
    it('should call NavigateTo once when tolerating missing previous folder', async () => {
      Navigation.current.prev = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should tolerate missing previous folder when showUnreadOnly is not set', async () => {
      Navigation.current.prev = undefined
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'PreviousFolder'])
    })
    it('should call NavigateTo once when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to previous unread folder when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([previousUnreadFolder.path, 'PreviousFolder'])
    })
    it('should call NavigateTo once when tolerating missing previous unread folder', async () => {
      Navigation.current.prevUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should tolerate missing previous unread folder when showUnreadOnly is set', async () => {
      Navigation.current.prevUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'PreviousFolder'])
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await eventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:NextFolder message Handler', () => {
    let navigateToStub = sandbox.stub()
    let showUnreadOnlyStub = sandbox.stub()
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
      navigateToStub = sandbox.stub(Internals, 'NavigateTo')
      showUnreadOnlyStub = sandbox.stub(Imports, 'getShowUnreadOnly').returns(false)
      init()
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
      const h = getSubscriber('ACTION:EXECUTE:NEXTFOLDER')
      handler = h
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('should call NavigateTo once when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to next folder when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([nextFolder.path, 'NextFolder'])
    })
    it('should call NavigateTo once when tolerating missing next folder', async () => {
      Navigation.current.next = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should tolerate missing next folder when showUnreadOnly is not set', async () => {
      Navigation.current.next = undefined
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'NextFolder'])
    })
    it('should call NavigateTo once when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to next unread folder when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([nextUnreadFolder.path, 'NextFolder'])
    })
    it('should call NavigateTo once when tolerating missing next unread folder', async () => {
      Navigation.current.nextUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should tolerate missing next unread folder when showUnreadOnly is set', async () => {
      Navigation.current.nextUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'NextFolder'])
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await eventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:ParentFolder message Handler', () => {
    let navigateToStub = sandbox.stub()
    let parentFolder = ''
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      navigateToStub = sandbox.stub(Internals, 'NavigateTo')
      init()
      parentFolder = `/Foo ${Math.random()}`
      Navigation.current.parent = parentFolder
      const h = getSubscriber('ACTION:EXECUTE:PARENTFOLDER')
      handler = h
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('should call NavigateTo once when navigating to parent folder', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to parent folder', async () => {
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([parentFolder, 'ParentFolder'])
    })
    it('should call NavigateTo once when tolerating undefined parent folder', async () => {
      Navigation.current.parent = cast<string>(undefined)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should tolerate invalidly undefined parent folder', async () => {
      Navigation.current.parent = cast<string>(undefined)
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'ParentFolder'])
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await eventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:FirstUnfinished message Handler', () => {
    let navigateToStub = sandbox.stub()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    let children = [{ name: '', path: '', cover: '', seenCount: 0, totalCount: 0 }]
    beforeEach(() => {
      navigateToStub = sandbox.stub(Internals, 'NavigateTo')
      init()
      children = Array(20)
        .fill(undefined)
        .map((_, i) => ({
          name: `Foo ${i}`,
          path: `/foo${i}`,
          cover: '',
          seenCount: i,
          totalCount: i,
        }))
      Navigation.current.children = children
      const h = getSubscriber('ACTION:EXECUTE:FIRSTUNFINISHED')
      handler = h
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('should call NavigateTo once when children are undefined', async () => {
      Navigation.current.children = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to undefined when no children are undefined', async () => {
      Navigation.current.children = undefined
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'FirstUnfinished'])
    })
    it('should call NavigateTo once when no child folder exist', async () => {
      Navigation.current.children = []
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to undefined when no child folder exist', async () => {
      Navigation.current.children = []
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'FirstUnfinished'])
    })
    it('should call NavigateTo once when no child folder is unfinished', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to undefined when no child folder is unfinished', async () => {
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([undefined, 'FirstUnfinished'])
    })
    it('should call NavigateTo once when navigating to unfinished child folder', async () => {
      assert(children[10] !== undefined)
      children[10].totalCount = 100
      children[10].seenCount = 10
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to unfinished child folder', async () => {
      assert(children[10] !== undefined)
      children[10].totalCount = 100
      children[10].seenCount = 10
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([children[10].path, 'FirstUnfinished'])
    })
    it('should call NavigateTo once when navigating to first unfinished child folder', async () => {
      assert(children[10] !== undefined)
      children[10].totalCount = 100
      children[10].seenCount = 10
      assert(children[11] !== undefined)
      children[11].totalCount = 100
      children[11].seenCount = 10
      assert(children[19] !== undefined)
      children[19].totalCount = 100
      children[19].seenCount = 10
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
    })
    it('should navigate to first unfinished child folder', async () => {
      assert(children[10] !== undefined)
      children[10].totalCount = 100
      children[10].seenCount = 10
      assert(children[11] !== undefined)
      children[11].totalCount = 100
      children[11].seenCount = 10
      assert(children[19] !== undefined)
      children[19].totalCount = 100
      children[19].seenCount = 10
      await handler()
      expect(navigateToStub.firstCall.args).to.deep.equal([children[10].path, 'FirstUnfinished'])
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await eventuallyRejects(handler())).to.equal(err)
    })
  })
})
