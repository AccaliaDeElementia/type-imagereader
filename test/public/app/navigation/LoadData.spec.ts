'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'
import { Net } from '../../../../public/scripts/app/net'
import { isListing } from '../../../../contracts/listing'
import { EventuallyFullfills } from '../../../testutils/Errors'

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
describe('public/app/navigation function LoadData()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const loadingShowSpy = Sinon.stub()
  const loadingHideSpy = Sinon.stub()
  const loadingErrorSpy = Sinon.stub()
  const navigateDataSpy = Sinon.stub()
  let titleElement: HTMLTitleElement | null = null
  let brandElement: HTMLAnchorElement | null = null
  let getJSONSpy = Sinon.stub()
  let suppressMenuSpy = Sinon.stub()
  let historySpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    titleElement = dom.window.document.querySelector('head title')
    assert(titleElement != null)
    brandElement = dom.window.document.querySelector('a.navbar-brand')
    assert(brandElement != null)
    historySpy = Sinon.stub(dom.window.history, 'pushState')

    loadingErrorSpy.resolves()
    loadingHideSpy.resolves()
    loadingShowSpy.resolves()
    navigateDataSpy.resolves()
    PubSub.subscribers = {
      'NAVIGATE:DATA': [navigateDataSpy],
      'LOADING:SHOW': [loadingShowSpy],
      'LOADING:HIDE': [loadingHideSpy],
      'LOADING:ERROR': [loadingErrorSpy],
    }
    PubSub.deferred = []
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
    getJSONSpy = Sinon.stub(Net, 'GetJSON').resolves({
      path: '/foo',
      name: 'foo',
      parent: '/',
    })
    suppressMenuSpy = Sinon.stub(Navigation, 'IsSuppressMenu').returns(false)
  })
  afterEach(() => {
    suppressMenuSpy.restore()
    getJSONSpy.restore()
    historySpy.restore()
    loadingErrorSpy.reset()
    loadingHideSpy.reset()
    loadingShowSpy.reset()
    navigateDataSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
  })
  it('should publish Loading:Show at start of processing', async () => {
    await Navigation.LoadData()
    expect(loadingShowSpy.called).to.equal(true)
  })
  it('should call getJSON after Loading:Show has been published', async () => {
    await Navigation.LoadData()
    expect(getJSONSpy.called).to.equal(true)
    expect(getJSONSpy.firstCall.args).to.have.lengthOf(2)
    expect(getJSONSpy.calledAfter(loadingShowSpy)).to.equal(true)
  })
  it('should request data from expected listing path', async () => {
    Navigation.current.path = '/foo/bar/baz/99382111'
    await Navigation.LoadData()
    expect(getJSONSpy.firstCall.args[0]).to.equal('/api/listing/foo/bar/baz/99382111')
  })
  it('should use isListing contract assertion method to validate getJSON results', async () => {
    await Navigation.LoadData()
    expect(getJSONSpy.firstCall.args[1]).to.equal(isListing)
  })
  it('should update Navigation.current with results from GetJSON call', async () => {
    const data = {
      name: 'Nude in Bar!',
      path: '/N/Nude in Bar',
      parent: '/N',
    }
    getJSONSpy.resolves(data)
    await Navigation.LoadData()
    expect(Navigation.current).to.equal(data)
  })
  it('should set noMenu as false when menu is not suppressed', async () => {
    suppressMenuSpy.returns(false)
    await Navigation.LoadData()
    expect(Navigation.current.noMenu).to.equal(false)
  })
  it('should set noMenu as true when menu is suppressed', async () => {
    suppressMenuSpy.returns(true)
    await Navigation.LoadData()
    expect(Navigation.current.noMenu).to.equal(true)
  })
  it('should set title element content as retrieved name', async () => {
    getJSONSpy.resolves({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Navigation.LoadData()
    expect(titleElement?.innerHTML).to.equal('Nude in Bar')
  })
  it('should set title element content as retrieved path when name is empty', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Navigation.LoadData()
    expect(titleElement?.innerHTML).to.equal('/N/Nude in Bar')
  })
  it('should set brand element content as retrieved name', async () => {
    getJSONSpy.resolves({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Navigation.LoadData()
    expect(brandElement?.innerHTML).to.equal('Nude in Bar')
  })
  it('should set brand element content as retrieved path when name is empty', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Navigation.LoadData()
    expect(brandElement?.innerHTML).to.equal('/N/Nude in Bar')
  })
  it('should tolerate missing title element', async () => {
    titleElement?.parentElement?.removeChild(titleElement)
    await EventuallyFullfills(Navigation.LoadData())
  })
  it('should tolerate missing brand element', async () => {
    brandElement?.parentElement?.removeChild(brandElement)
    await EventuallyFullfills(Navigation.LoadData())
  })
  it('should not push state when loading data with no history flag set true', async () => {
    await Navigation.LoadData(true)
    expect(historySpy.called).to.equal(false)
  })
  it('should not push state when loading data with no history flag set false', async () => {
    await Navigation.LoadData(false)
    expect(historySpy.called).to.equal(true)
  })
  it('should not push state when loading data with no history flag unset', async () => {
    await Navigation.LoadData()
    expect(historySpy.called).to.equal(true)
  })
  it('should push expected stat when saving history', async () => {
    getJSONSpy.resolves({ name: '', path: '/N/Nude in Bar' })
    await Navigation.LoadData()
    expect(historySpy.firstCall.args).to.have.lengthOf(3)
    expect(historySpy.firstCall.args[0]).to.deep.equal({})
    expect(historySpy.firstCall.args[1]).to.equal('')
    expect(historySpy.firstCall.args[2]).to.equal('http://127.0.0.1:2999//N/Nude in Bar')
  })
  it('should push history after retrieving data', async () => {
    await Navigation.LoadData()
    expect(historySpy.calledAfter(getJSONSpy)).to.equal(true)
  })
  it('should publish Loading:Hide after pushing history', async () => {
    await Navigation.LoadData()
    expect(loadingHideSpy.calledAfter(historySpy))
  })
  it('should publish Loading:Hide after retrieving data when not saving history', async () => {
    await Navigation.LoadData(true)
    expect(loadingHideSpy.calledAfter(getJSONSpy))
  })
  it('should publish Navigate:Data after hiding loading screen', async () => {
    await Navigation.LoadData()
    expect(navigateDataSpy.calledAfter(loadingHideSpy)).to.equal(true)
  })
  it('should publish retrieved data as Navigate:Data payload', async () => {
    await Navigation.LoadData()
    expect(navigateDataSpy.firstCall.args[0]).to.equal(Navigation.current)
  })
  it('should not publish Loading:Error when no error occurs', async () => {
    await Navigation.LoadData()
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should publish Loading:Error when GetJson rejects', async () => {
    getJSONSpy.rejects('FOO')
    await Navigation.LoadData()
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should publish Loading:Error when push history throws', async () => {
    historySpy.throws('FOO')
    await Navigation.LoadData()
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should publish recieved error when GetJson rejects', async () => {
    const err = new Error('FOO')
    getJSONSpy.rejects(err)
    await Navigation.LoadData()
    expect(loadingErrorSpy.firstCall.args[0]).to.equal(err)
  })
})
