'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../public/scripts/app/pubsub'
import { Loading } from '../../../public/scripts/app/loading'
import { Cast } from '../../testutils/TypeGuards'
import assert from 'assert'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading function Init()', () => {
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
  it('should subscribe to Loading:Error', () => {
    expect(PubSub.subscribers['LOADING:ERROR']).to.have.length(1)
  })
  it('should subscribe to Loading:Success', () => {
    expect(PubSub.subscribers['LOADING:SUCCESS']).to.have.length(1)
  })
  it('should subscribe to Loading:Hide', () => {
    expect(PubSub.subscribers['LOADING:HIDE']).to.have.length(1)
  })
  it('should subscribe to Loading:Show', () => {
    expect(PubSub.subscribers['LOADING:SHOW']).to.have.length(1)
  })
  it('should select overlay for disabling input', () => {
    expect(Loading.overlay).to.not.equal(null)
  })
  it('should select navbar for feedback', () => {
    expect(Loading.navbar).to.not.equal(null)
  })
})
describe('public/app/loading subscriber "Loading:Show" and "Loading:Hide"', () => {
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
  it('should show the loading overlay for "Loading:Show"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'none')
    PubSub.Publish('Loading:Show')
    expect(overlay?.style.getPropertyValue('display')).to.equal('block')
  })
  it('should hide the loading overlay for "Loading:Hide"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'block')
    PubSub.Publish('Loading:Hide')
    expect(overlay?.style.getPropertyValue('display')).to.equal('none')
  })
  it('should tolerate missing overlay for "Loading:Show"', () => {
    Loading.overlay = null
    expect(() => {
      PubSub.Publish('Loading:Show')
    }).to.not.throw()
  })
  it('should hide the loading overlay for "Loading:Hide"', () => {
    Loading.overlay = null
    expect(() => {
      PubSub.Publish('Loading:Hide')
    }).to.not.throw()
  })
})
describe('public/app/loading subscriber "Loading:Error"', () => {
  let consoleError = Sinon.stub()
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    consoleError = Sinon.stub(global.window.console, 'error')
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
  it('should log message to web console', () => {
    const message = `error message! ${Math.random()}`
    PubSub.Publish('Loading:Error', message)
    expect(consoleError.calledOnceWithExactly(message)).to.equal(true)
  })
  it('should not log null message to web console', () => {
    PubSub.Publish('Loading:Error', null)
    expect(consoleError.called).to.equal(false)
  })
  it('should not log undefined message to web console', () => {
    PubSub.Publish('Loading:Error', undefined)
    expect(consoleError.called).to.equal(false)
  })
  it('should hide loading overlay', async () => {
    let hidden = false
    PubSub.Subscribe('Loading:Hide', async () => {
      hidden = true
      await Promise.resolve()
    })
    const subs = PubSub.subscribers['LOADING:ERROR']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:ERROR') // execute all subscribers manually
    }
    expect(hidden).to.equal(true)
  })
  it('should remove css transition style on navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    const subs = PubSub.subscribers['LOADING:ERROR']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:ERROR') // execute all subscribers manually
    }
    expect(navbar?.style.getPropertyValue('transition')).to.equal('')
  })
  it('should set scary red background navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('background-color')
    const subs = PubSub.subscribers['LOADING:ERROR']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:ERROR') // execute all subscribers manually
    }
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('rgb(255, 0, 0)')
  })
  it('should set a deferred function', async () => {
    expect(PubSub.deferred).to.have.length(0)
    const subs = PubSub.subscribers['LOADING:ERROR']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:ERROR') // execute all subscribers manually
    }
    expect(PubSub.deferred).to.have.length(1)
  })
  it('should defer transition definition', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('transition')
    const subs = PubSub.subscribers['LOADING:ERROR']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:ERROR') // execute all subscribers manually
    }
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('transition')).to.equal('background-color 2s ease-in-out')
  })
  it('should defer background-color change', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('background-color', '#FFFFFF')
    const subs = PubSub.subscribers['LOADING:ERROR']
    assert(subs !== undefined)
    for (const sub of subs) {
      await sub(undefined, 'LOADING:ERROR') // execute all subscribers manually
    }
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('')
  })
})
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
  const testCases: Array<[string, boolean]> = [
    ['inline', false],
    ['block', true],
    ['contents', false],
    ['flex', false],
    ['grid', false],
    ['inline-block', false],
    ['inline-flex', false],
    ['inline-grid', false],
    ['inline-table', false],
    ['list-item', false],
    ['run-in', false],
    ['table', false],
    ['table-caption', false],
    ['table-column-group', false],
    ['table-header-group', false],
    ['table-footer-group', false],
    ['table-row-group', false],
    ['table-cell', false],
    ['table-column', false],
    ['table-row', false],
    ['none', false],
    ['initial', false],
    ['inherit', false],
  ]
  testCases.forEach(([style, expected]) => {
    it(`should ${expected ? '' : 'not '}consider ${style} as IsLoading`, () => {
      const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
      overlay?.style.setProperty('display', style)
      expect(Loading.IsLoading()).to.equal(expected)
    })
  })
})
