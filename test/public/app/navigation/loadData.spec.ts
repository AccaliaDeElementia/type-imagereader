'use sanity'

import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { isListing } from '#contracts/listing.js'
import { eventuallyFulfills } from '#testutils/errors.js'

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
describe('public/app/navigation loadData()', () => {
  let dom = new JSDOM('', {})
  let publishStub = sandbox.stub()
  let titleElement: HTMLTitleElement | null = null
  let brandElement: HTMLAnchorElement | null = null
  let getJSONSpy = sandbox.stub()
  let suppressMenuSpy = sandbox.stub()
  let historySpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    titleElement = dom.window.document.querySelector('head title')
    assert(titleElement !== null)
    brandElement = dom.window.document.querySelector('a.navbar-brand')
    assert(brandElement !== null)
    historySpy = sandbox.stub(dom.window.history, 'pushState')

    resetPubSub()
    publishStub = sandbox.stub(Imports, 'publish')
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
    getJSONSpy = sandbox.stub(Imports, 'getJSON').resolves({
      path: '/foo',
      name: 'foo',
      parent: '/',
    })
    suppressMenuSpy = sandbox.stub(Internals, 'isSuppressMenu').returns(false)
  })
  afterEach(() => {
    sandbox.restore()
  })
  afterAll(() => {
    unmountDom()
    Sinon.restore()
  })
  it('should publish Loading:show at start of processing', async () => {
    await Internals.loadData()
    expect(publishStub.withArgs('Loading:show').called).toBe(true)
  })
  it('should call getJSON', async () => {
    await Internals.loadData()
    expect(getJSONSpy.called).toBe(true)
  })
  it('should call getJSON with 2 arguments', async () => {
    await Internals.loadData()
    expect(getJSONSpy.firstCall.args).toHaveLength(2)
  })
  it('should call getJSON after Loading:show has been published', async () => {
    await Internals.loadData()
    expect(getJSONSpy.calledAfter(publishStub.withArgs('Loading:show'))).toBe(true)
  })
  it('should request data from expected listing path', async () => {
    Navigation.current.path = '/foo/bar/baz/99382111'
    await Internals.loadData()
    expect(getJSONSpy.firstCall.args[0]).toBe('/api/listing/foo/bar/baz/99382111')
  })
  it('should use isListing contract assertion method to validate getJSON results', async () => {
    await Internals.loadData()
    expect(getJSONSpy.firstCall.args[1]).toBe(isListing)
  })
  it('should update Navigation.current with results from getJSON call', async () => {
    const data = {
      name: 'Nude in Bar!',
      path: '/N/Nude in Bar',
      parent: '/N',
    }
    getJSONSpy.resolves(data)
    await Internals.loadData()
    expect(Navigation.current).toBe(data)
  })
  it('should set noMenu as false when menu is not suppressed', async () => {
    suppressMenuSpy.returns(false)
    await Internals.loadData()
    expect(Navigation.current.noMenu).toBe(false)
  })
  it('should set noMenu as true when menu is suppressed', async () => {
    suppressMenuSpy.returns(true)
    await Internals.loadData()
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should set noMenu as true when suppressMenu argument is true', async () => {
    suppressMenuSpy.returns(false)
    await Internals.loadData(false, true)
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should set noMenu as true when suppressMenu argument is true and isSuppressMenu is true', async () => {
    suppressMenuSpy.returns(true)
    await Internals.loadData(false, true)
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should set noMenu as false when suppressMenu argument is false and isSuppressMenu is false', async () => {
    suppressMenuSpy.returns(false)
    await Internals.loadData(false, false)
    expect(Navigation.current.noMenu).toBe(false)
  })
  it('should set noMenu as true when suppressMenu argument is false and isSuppressMenu is true', async () => {
    suppressMenuSpy.returns(true)
    await Internals.loadData(false, false)
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should not inherit noMenu from prior Navigation.current state when suppressMenu argument is omitted', async () => {
    suppressMenuSpy.returns(false)
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
      noMenu: true,
    }
    await Internals.loadData()
    expect(Navigation.current.noMenu).toBe(false)
  })
  it('should set title element content as retrieved name', async () => {
    getJSONSpy.resolves({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(titleElement?.innerHTML).toBe('Nude in Bar')
  })
  it('should set title element content as retrieved path when name is empty', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(titleElement?.innerHTML).toBe('/N/Nude in Bar')
  })
  it('should set brand element content as retrieved name', async () => {
    getJSONSpy.resolves({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(brandElement?.innerHTML).toBe('Nude in Bar')
  })
  it('should set brand element content as retrieved path when name is empty', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(brandElement?.innerHTML).toBe('/N/Nude in Bar')
  })
  it('should tolerate missing title element', async () => {
    titleElement?.parentElement?.removeChild(titleElement)
    await eventuallyFulfills(Internals.loadData())
  })
  it('should tolerate missing brand element', async () => {
    brandElement?.parentElement?.removeChild(brandElement)
    await eventuallyFulfills(Internals.loadData())
  })
  it('should not push state when loading data with no history flag set true', async () => {
    await Internals.loadData(true)
    expect(historySpy.called).toBe(false)
  })
  it('should not push state when loading data with no history flag set false', async () => {
    await Internals.loadData(false)
    expect(historySpy.called).toBe(true)
  })
  it('should not push state when loading data with no history flag unset', async () => {
    await Internals.loadData()
    expect(historySpy.called).toBe(true)
  })
  it('should push history with 3 arguments', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.firstCall.args).toHaveLength(3)
  })
  it('should push history with empty state object', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.firstCall.args[0]).toEqual({})
  })
  it('should push history with empty title', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.firstCall.args[1]).toBe('')
  })
  it('should push history with URL derived from resolved path', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.firstCall.args[2]).toBe('http://127.0.0.1:2999//N/Nude in Bar')
  })
  it('should push history after retrieving data', async () => {
    await Internals.loadData()
    expect(historySpy.calledAfter(getJSONSpy)).toBe(true)
  })
  it('should publish Loading:Hide after pushing history', async () => {
    await Internals.loadData()
    expect(publishStub.withArgs('Loading:Hide').calledAfter(historySpy))
  })
  it('should publish Loading:Hide after retrieving data when not saving history', async () => {
    await Internals.loadData(true)
    expect(publishStub.withArgs('Loading:Hide').calledAfter(getJSONSpy))
  })
  it('should publish Navigate:Data after hiding loading screen', async () => {
    await Internals.loadData()
    expect(publishStub.withArgs('Navigate:Data').calledAfter(publishStub.withArgs('Loading:Hide'))).toBe(true)
  })
  it('should publish retrieved data as Navigate:Data payload', async () => {
    await Internals.loadData()
    expect(publishStub.withArgs('Navigate:Data').firstCall.args[1]).toBe(Navigation.current)
  })
  it('should not publish Loading:Error when no error occurs', async () => {
    await Internals.loadData()
    expect(publishStub.withArgs('Loading:Error').called).toBe(false)
  })
  it('should publish Loading:Error when GetJson rejects', async () => {
    getJSONSpy.rejects('FOO')
    await Internals.loadData()
    expect(publishStub.withArgs('Loading:Error').called).toBe(true)
  })
  it('should publish Loading:Error when push history throws', async () => {
    historySpy.throws('FOO')
    await Internals.loadData()
    expect(publishStub.withArgs('Loading:Error').called).toBe(true)
  })
  it('should publish recieved error when GetJson rejects', async () => {
    const err = new Error('FOO')
    getJSONSpy.rejects(err)
    await Internals.loadData()
    expect(publishStub.withArgs('Loading:Error').firstCall.args[1]).toBe(err)
  })

  const runStaleResponseScenario = async (): Promise<{
    secondData: { name: string; path: string; parent: string }
  }> => {
    const { promise: firstPromise, resolve: resolveFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    const secondData = { name: 'second', path: '/second', parent: '/' }
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const a = Internals.loadData()
    const b = Internals.loadData()
    resolveSecond(secondData)
    await b
    resolveFirst({ name: 'first', path: '/first', parent: '/' })
    await a
    return { secondData }
  }

  it('should not overwrite Navigation.current with a stale response', async () => {
    const { secondData } = await runStaleResponseScenario()
    expect(Navigation.current).toBe(secondData)
  })

  it('should push history exactly once when a stale response arrives after a newer one', async () => {
    await runStaleResponseScenario()
    expect(historySpy.callCount).toBe(1)
  })

  it('should publish Navigate:Data exactly once when a stale response arrives after a newer one', async () => {
    await runStaleResponseScenario()
    expect(publishStub.withArgs('Navigate:Data').callCount).toBe(1)
  })

  it('should not publish Loading:Error for a stale rejection', async () => {
    const { promise: firstPromise, reject: rejectFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const a = Internals.loadData()
    const b = Internals.loadData()
    resolveSecond({ name: 'second', path: '/second', parent: '/' })
    await b
    rejectFirst(new Error('stale'))
    await a
    expect(publishStub.withArgs('Loading:Error').called).toBe(false)
  })
})
