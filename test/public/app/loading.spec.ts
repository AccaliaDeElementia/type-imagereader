'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Loading } from '../../../public/scripts/app/loading'
import { ForceCastTo } from '../../testutils/TypeGuards'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`

@suite
export class AppLoadingTests extends PubSub {
  consoleError: sinon.SinonStub
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  constructor() {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('', {})
    this.consoleError = sinon.stub()
  }

  before(): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.existingWindow = global.window
    global.window = ForceCastTo<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    global.document = this.dom.window.document
    this.consoleError = sinon.stub(global.window.console, 'error')
    PubSub.subscribers = {}
    PubSub.deferred = []
    Loading.Init()
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }

  @test
  'Loading subscribes to Loading:Error'(): void {
    expect(PubSub.subscribers['LOADING:ERROR']).to.have.length(1)
  }

  @test
  'Loading subscribes to Loading:Success'(): void {
    expect(PubSub.subscribers['LOADING:SUCCESS']).to.have.length(1)
  }

  @test
  'Loading subscribes to Loading:Hide'(): void {
    expect(PubSub.subscribers['LOADING:HIDE']).to.have.length(1)
  }

  @test
  'Loading subscribes to Loading:Show'(): void {
    expect(PubSub.subscribers['LOADING:SHOW']).to.have.length(1)
  }

  @test
  'Publishing Loading:Show shows the loading overlay'(): void {
    const overlay = this.dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'none')
    PubSub.Publish('Loading:Show')
    expect(overlay?.style.getPropertyValue('display')).to.equal('block')
  }

  @test
  'Publishing Loading:Hide removes the loading overlay'(): void {
    const overlay = this.dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'block')
    PubSub.Publish('Loading:Hide')
    expect(overlay?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  'Publishing Loading:Error with message logs message to web console'(): void {
    const message = `error message! ${Math.random()}`
    PubSub.Publish('Loading:Error', message)
    expect(this.consoleError.calledOnceWithExactly(message)).to.equal(true)
  }

  @test
  'Publishing Loading:Error without message logs no message to web console'(): void {
    PubSub.Publish('Loading:Error')
    expect(this.consoleError.called).to.equal(false)
  }

  @test
  'Publishing Loading:Error hides loading overlay'(): void {
    let hidden = false
    PubSub.Subscribe('Loading:Hide', () => {
      hidden = true
    })
    PubSub.Publish('Loading:Error')
    expect(hidden).to.equal(true)
  }

  @test
  'Publishing Loading:Error removes css transition style on navbar'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    PubSub.Publish('Loading:Error')
    expect(navbar?.style.getPropertyValue('transition')).to.equal('')
  }

  @test
  'Publishing Loading:Error sets scary red background navbar'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('background-color')
    PubSub.Publish('Loading:Error')
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('rgb(255, 0, 0)')
  }

  @test
  'Publishing Loading:Error sets a deferred function'(): void {
    expect(PubSub.deferred).to.have.length(0)
    PubSub.Publish('Loading:Error')
    expect(PubSub.deferred).to.have.length(1)
  }

  @test
  'Publishing Loading:Error defers transition definition'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('transition')
    PubSub.Publish('Loading:Error')
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('transition')).to.equal('background-color 2s ease-in-out')
  }

  @test
  'Publishing Loading:Error deferres background-color change'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('background-color', '#FFFFFF')
    PubSub.Publish('Loading:Error')
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('')
  }

  @test
  'Publishing Loading:Success removes css transition style on navbar'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    PubSub.Publish('Loading:Success')
    expect(navbar?.style.getPropertyValue('transition')).to.equal('')
  }

  @test
  'Publishing Loading:Success sets soothing green background navbar'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('background-color')
    PubSub.Publish('Loading:Success')
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('rgb(0, 170, 0)')
  }

  @test
  'Publishing Loading:Success sets a deferred function'(): void {
    expect(PubSub.deferred).to.have.length(0)
    PubSub.Publish('Loading:Success')
    expect(PubSub.deferred).to.have.length(1)
  }

  @test
  'Publishing Loading:Success defers transition definition'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('transition')
    PubSub.Publish('Loading:Success')
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('transition')).to.equal('background-color 2s ease-in-out')
  }

  @test
  'Publishing Loading:Success deferres background-color change'(): void {
    const navbar = this.dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('background-color', '#FFFFFF')
    PubSub.Publish('Loading:Success')
    PubSub.deferred.forEach((fn) => {
      fn.method()
    })
    expect(navbar?.style.getPropertyValue('background-color')).to.equal('')
  }

  @test
  'IsLoading is true when overlay is displayed as block element'(): void {
    const overlay = this.dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'block')
    expect(Loading.IsLoading).to.equal(true)
  }

  @test
  'IsLoading is false when overlay is not displayed as block element'(): void {
    const overlay = this.dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    for (const display of ['flex', 'none', 'inline-block']) {
      overlay?.style.setProperty('display', display)
      expect(Loading.IsLoading).to.equal(false)
    }
  }
}
