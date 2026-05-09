'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { Imports, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { resetPubSub } from '#testutils/PubSub.js'
import { isListing } from '#contracts/listing.js'
import { eventuallyFulfills } from '#testutils/Errors.js'

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
describe('public/app/navigation LoadData()', () => {
  let dom = new JSDOM('', {})
  const loadingShowSpy = sandbox.stub()
  const loadingHideSpy = sandbox.stub()
  const loadingErrorSpy = sandbox.stub()
  const navigateDataSpy = sandbox.stub()
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

    loadingErrorSpy.resolves()
    loadingHideSpy.resolves()
    loadingShowSpy.resolves()
    navigateDataSpy.resolves()
    resetPubSub()
    PubSub.subscribers = {
      'NAVIGATE:DATA': [navigateDataSpy],
      'LOADING:SHOW': [loadingShowSpy],
      'LOADING:HIDE': [loadingHideSpy],
      'LOADING:ERROR': [loadingErrorSpy],
    }
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
    getJSONSpy = sandbox.stub(Imports, 'GetJSON').resolves({
      path: '/foo',
      name: 'foo',
      parent: '/',
    })
    suppressMenuSpy = sandbox.stub(Internals, 'IsSuppressMenu').returns(false)
  })
  afterEach(() => {
    sandbox.restore()
    loadingErrorSpy.reset()
    loadingHideSpy.reset()
    loadingShowSpy.reset()
    navigateDataSpy.reset()
  })
  afterAll(() => {
    unmountDom()
    Sinon.restore()
  })
  it('should publish Loading:Show at start of processing', async () => {
    await Internals.LoadData()
    expect(loadingShowSpy.called).to.equal(true)
  })
  it('should call getJSON', async () => {
    await Internals.LoadData()
    expect(getJSONSpy.called).to.equal(true)
  })
  it('should call getJSON with 2 arguments', async () => {
    await Internals.LoadData()
    expect(getJSONSpy.firstCall.args).to.have.lengthOf(2)
  })
  it('should call getJSON after Loading:Show has been published', async () => {
    await Internals.LoadData()
    expect(getJSONSpy.calledAfter(loadingShowSpy)).to.equal(true)
  })
  it('should request data from expected listing path', async () => {
    Navigation.current.path = '/foo/bar/baz/99382111'
    await Internals.LoadData()
    expect(getJSONSpy.firstCall.args[0]).to.equal('/api/listing/foo/bar/baz/99382111')
  })
  it('should use isListing contract assertion method to validate getJSON results', async () => {
    await Internals.LoadData()
    expect(getJSONSpy.firstCall.args[1]).to.equal(isListing)
  })
  it('should update Navigation.current with results from GetJSON call', async () => {
    const data = {
      name: 'Nude in Bar!',
      path: '/N/Nude in Bar',
      parent: '/N',
    }
    getJSONSpy.resolves(data)
    await Internals.LoadData()
    expect(Navigation.current).to.equal(data)
  })
  it('should set noMenu as false when menu is not suppressed', async () => {
    suppressMenuSpy.returns(false)
    await Internals.LoadData()
    expect(Navigation.current.noMenu).to.equal(false)
  })
  it('should set noMenu as true when menu is suppressed', async () => {
    suppressMenuSpy.returns(true)
    await Internals.LoadData()
    expect(Navigation.current.noMenu).to.equal(true)
  })
  it('should set noMenu as true when suppressMenu argument is true', async () => {
    suppressMenuSpy.returns(false)
    await Internals.LoadData(false, true)
    expect(Navigation.current.noMenu).to.equal(true)
  })
  it('should set noMenu as true when suppressMenu argument is true and IsSuppressMenu is true', async () => {
    suppressMenuSpy.returns(true)
    await Internals.LoadData(false, true)
    expect(Navigation.current.noMenu).to.equal(true)
  })
  it('should set noMenu as false when suppressMenu argument is false and IsSuppressMenu is false', async () => {
    suppressMenuSpy.returns(false)
    await Internals.LoadData(false, false)
    expect(Navigation.current.noMenu).to.equal(false)
  })
  it('should set noMenu as true when suppressMenu argument is false and IsSuppressMenu is true', async () => {
    suppressMenuSpy.returns(true)
    await Internals.LoadData(false, false)
    expect(Navigation.current.noMenu).to.equal(true)
  })
  it('should not inherit noMenu from prior Navigation.current state when suppressMenu argument is omitted', async () => {
    suppressMenuSpy.returns(false)
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
      noMenu: true,
    }
    await Internals.LoadData()
    expect(Navigation.current.noMenu).to.equal(false)
  })
  it('should set title element content as retrieved name', async () => {
    getJSONSpy.resolves({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(titleElement?.innerHTML).to.equal('Nude in Bar')
  })
  it('should set title element content as retrieved path when name is empty', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(titleElement?.innerHTML).to.equal('/N/Nude in Bar')
  })
  it('should set brand element content as retrieved name', async () => {
    getJSONSpy.resolves({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(brandElement?.innerHTML).to.equal('Nude in Bar')
  })
  it('should set brand element content as retrieved path when name is empty', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(brandElement?.innerHTML).to.equal('/N/Nude in Bar')
  })
  it('should tolerate missing title element', async () => {
    titleElement?.parentElement?.removeChild(titleElement)
    await eventuallyFulfills(Internals.LoadData())
  })
  it('should tolerate missing brand element', async () => {
    brandElement?.parentElement?.removeChild(brandElement)
    await eventuallyFulfills(Internals.LoadData())
  })
  it('should not push state when loading data with no history flag set true', async () => {
    await Internals.LoadData(true)
    expect(historySpy.called).to.equal(false)
  })
  it('should not push state when loading data with no history flag set false', async () => {
    await Internals.LoadData(false)
    expect(historySpy.called).to.equal(true)
  })
  it('should not push state when loading data with no history flag unset', async () => {
    await Internals.LoadData()
    expect(historySpy.called).to.equal(true)
  })
  it('should push history with 3 arguments', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(historySpy.firstCall.args).to.have.lengthOf(3)
  })
  it('should push history with empty state object', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(historySpy.firstCall.args[0]).to.deep.equal({})
  })
  it('should push history with empty title', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(historySpy.firstCall.args[1]).to.equal('')
  })
  it('should push history with URL derived from resolved path', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Internals.LoadData()
    expect(historySpy.firstCall.args[2]).to.equal('http://127.0.0.1:2999//N/Nude in Bar')
  })
  it('should push history after retrieving data', async () => {
    await Internals.LoadData()
    expect(historySpy.calledAfter(getJSONSpy)).to.equal(true)
  })
  it('should publish Loading:Hide after pushing history', async () => {
    await Internals.LoadData()
    expect(loadingHideSpy.calledAfter(historySpy))
  })
  it('should publish Loading:Hide after retrieving data when not saving history', async () => {
    await Internals.LoadData(true)
    expect(loadingHideSpy.calledAfter(getJSONSpy))
  })
  it('should publish Navigate:Data after hiding loading screen', async () => {
    await Internals.LoadData()
    expect(navigateDataSpy.calledAfter(loadingHideSpy)).to.equal(true)
  })
  it('should publish retrieved data as Navigate:Data payload', async () => {
    await Internals.LoadData()
    expect(navigateDataSpy.firstCall.args[0]).to.equal(Navigation.current)
  })
  it('should not publish Loading:Error when no error occurs', async () => {
    await Internals.LoadData()
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should publish Loading:Error when GetJson rejects', async () => {
    getJSONSpy.rejects('FOO')
    await Internals.LoadData()
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should publish Loading:Error when push history throws', async () => {
    historySpy.throws('FOO')
    await Internals.LoadData()
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should publish recieved error when GetJson rejects', async () => {
    const err = new Error('FOO')
    getJSONSpy.rejects(err)
    await Internals.LoadData()
    expect(loadingErrorSpy.firstCall.args[0]).to.equal(err)
  })

  const runStaleResponseScenario = async (): Promise<{
    secondData: { name: string; path: string; parent: string }
  }> => {
    const { promise: firstPromise, resolve: resolveFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    const secondData = { name: 'second', path: '/second', parent: '/' }
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const a = Internals.LoadData()
    const b = Internals.LoadData()
    resolveSecond(secondData)
    await b
    resolveFirst({ name: 'first', path: '/first', parent: '/' })
    await a
    return { secondData }
  }

  it('should not overwrite Navigation.current with a stale response', async () => {
    const { secondData } = await runStaleResponseScenario()
    expect(Navigation.current).to.equal(secondData)
  })

  it('should push history exactly once when a stale response arrives after a newer one', async () => {
    await runStaleResponseScenario()
    expect(historySpy.callCount).to.equal(1)
  })

  it('should publish Navigate:Data exactly once when a stale response arrives after a newer one', async () => {
    await runStaleResponseScenario()
    expect(navigateDataSpy.callCount).to.equal(1)
  })

  it('should not publish Loading:Error for a stale rejection', async () => {
    const { promise: firstPromise, reject: rejectFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const a = Internals.LoadData()
    const b = Internals.LoadData()
    resolveSecond({ name: 'second', path: '/second', parent: '/' })
    await b
    rejectFirst(new Error('stale'))
    await a
    expect(loadingErrorSpy.called).to.equal(false)
  })
})
