'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import assert from 'node:assert'
import { Cast } from '../../../testutils/TypeGuards'

interface TestVisualViewport {
  scale: number
}

describe('public/app/pictures function InitMouse()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html><body><div id="bigImage"><img class="hidden"/></div></body></html>', {})
  const ignoreClickSpy = Sinon.stub().resolves()
  const executePreviousSpy = Sinon.stub().resolves()
  const executeNextSpy = Sinon.stub().resolves()
  const executeMenuSpy = Sinon.stub().resolves()
  let getBoundingSpy = Sinon.stub()
  let visualViewport: TestVisualViewport = { scale: 1 }
  let boundingRect = {
    x: 0,
    y: 0,
    width: 1024,
    height: 768,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="bigImage"><img class="hidden"/></div></body></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    Pictures.mainImage = dom.window.document.querySelector('img')
    visualViewport = { scale: 1 }
    // @ts-expect-error Ignore that visualviewport is read-only
    dom.window.visualViewport = visualViewport
    boundingRect = {
      x: 0,
      y: 0,
      width: 1024,
      height: 768,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }
    const tgt = Pictures.mainImage?.parentElement
    assert(tgt != null)
    getBoundingSpy = Sinon.stub(tgt, 'getBoundingClientRect').callsFake(() => Cast<DOMRect>(boundingRect))
    ignoreClickSpy.resetHistory()
    executePreviousSpy.resetHistory()
    executeNextSpy.resetHistory()
    executeMenuSpy.resetHistory()
    PubSub.subscribers = {
      'IGNORED MOUSE CLICK': [ignoreClickSpy],
      'ACTION:EXECUTE:NEXT': [executeNextSpy],
      'ACTION:EXECUTE:PREVIOUS': [executePreviousSpy],
      'ACTION:EXECUTE:SHOWMENU': [executeMenuSpy],
    }

    assert(Pictures.mainImage != null)
  })
  afterEach(() => {
    getBoundingSpy.restore()
    executeMenuSpy.resetHistory()
    executeNextSpy.resetHistory()
    executePreviousSpy.resetHistory()
    ignoreClickSpy.resetHistory()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should store initial scale from visual viewport', () => {
    visualViewport.scale = 972
    Pictures.InitMouse()
    expect(Pictures.initialScale).to.equal(972)
  })
  it('should store default initial scale when visual viewport is nullish', () => {
    // @ts-expect-error Ignore that visualviewport is read-only
    dom.window.visualViewport = null
    Pictures.InitMouse()
    expect(Pictures.initialScale).to.equal(-1)
  })
  it('should navigate to previous from left area click', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(1)
  })
  it('should process click when current scale is zoomed out from initial', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    visualViewport.scale = 1
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(1)
  })
  it('should ignore click when current scale is zoomed in from initial', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    visualViewport.scale = 2.0001
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(0)
    expect(ignoreClickSpy.callCount).to.equal(1)
  })
  it('should ignore click when mainImage bounding rect invalid', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    const tgt = Pictures.mainImage?.parentElement
    Pictures.mainImage = null
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    tgt?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(0)
    expect(ignoreClickSpy.callCount).to.equal(1)
  })
  it('should ignore click when click target width is zero', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    boundingRect.width = 0
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(0)
    expect(ignoreClickSpy.callCount).to.equal(1)
  })
  it('should navigate to previous from left area click with de', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(1)
  })
  it('should navigate to previous from left area click', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(1)
  })
  it('should show menu from middle area click', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 2,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executeMenuSpy.callCount).to.equal(1)
  })
  it('should navigate to next from right area click', () => {
    visualViewport.scale = 2
    Pictures.InitMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: (3 * boundingRect.width) / 4,
      clientY: boundingRect.height / 2,
    })
    expect(Pictures.mainImage).to.not.equal(null)
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executeNextSpy.callCount).to.equal(1)
  })
})
