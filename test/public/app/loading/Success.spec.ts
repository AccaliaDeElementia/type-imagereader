'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Loading } from '../../../../public/scripts/app/loading'
import { Cast } from '../../../testutils/TypeGuards'
import assert from 'node:assert'
const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading subscriber "Loading:Success"', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    Loading.overlay = null
    Loading.navbar = null
    Loading.Init()
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should remove css transition style on navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    const subs = PubSub.subscribers['LOADING:SUCCESS']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:SUCCESS') // execute all subscribers manually
    }
    expect(navbar?.style.getPropertyValue('transition')).to.equal('')
  })
  it('should set soothing green background navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('background-color')
    const subs = PubSub.subscribers['LOADING:SUCCESS']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:SUCCESS') // execute all subscribers manually
    }
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('rgb(0, 170, 0)')
  })
  it('should set a deferred function', async () => {
    expect(PubSub.deferred).to.have.length(0)
    const subs = PubSub.subscribers['LOADING:SUCCESS']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:SUCCESS') // execute all subscribers manually
    }
    expect(PubSub.deferred).to.have.length(1)
  })
  it('should defer transition definition', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('transition')
    const subs = PubSub.subscribers['LOADING:SUCCESS']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:SUCCESS') // execute all subscribers manually
    }
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('transition')).to.equal('background-color 2s ease-in-out')
  })
  it('should defer background-color change', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('background-color', '#FFFFFF')
    const subs = PubSub.subscribers['LOADING:SUCCESS']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:SUCCESS') // execute all subscribers manually
    }
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('')
  })
})
