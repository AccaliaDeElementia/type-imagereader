'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../testutils/TypeGuards'

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
describe('public/app/navigation Message handler Action:Execute:Slideshow', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
  let locationAssignSpy = Sinon.stub()
  let handler = async (_?: unknown, __?: string): Promise<void> => {
    await Promise.resolve()
  }
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
    Navigation.Init()
    locationAssignSpy = Sinon.stub(Navigation, 'LocationAssign')
    const h = PubSub.subscribers['ACTION:EXECUTE:SLIDESHOW']?.pop()
    assert(h != null)
    handler = h
  })
  afterEach(() => {
    locationAssignSpy.restore()
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
  })
  it('should alter location via locationAssign when invoked', async () => {
    await handler()
    expect(locationAssignSpy.callCount).to.equal(1)
  })
  it('should alter location to expected path when invoked', async () => {
    const path = `/foo/${Math.random()}`
    Navigation.current.path = path
    await handler()
    expect(locationAssignSpy.firstCall.args[0]).to.equal(`/slideshow${path}`)
  })
  it('should pass expected this value when invoked', async () => {
    await handler()
    expect(locationAssignSpy.firstCall.thisValue).to.equal(dom.window.location)
  })
})
