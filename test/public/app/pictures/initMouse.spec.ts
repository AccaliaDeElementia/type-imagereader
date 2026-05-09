'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictures/state.js'
import { initMouse } from '#public/scripts/app/pictures/inputs.js'
import { PubSub } from '#public/scripts/app/pubsub.js'
import assert from 'node:assert'
import { cast } from '#testutils/typeGuards.js'
import { hasValue } from '#utils/helpers.js'

const sandbox = Sinon.createSandbox()

interface TestVisualViewport {
  scale: number
}

describe('public/app/pictures initMouse()', () => {
  let dom = new JSDOM('<html><body><div id="bigImage"><img class="hidden"/></div></body></html>', {})
  const ignoreClickSpy = sandbox.stub().resolves()
  const executePreviousSpy = sandbox.stub().resolves()
  const executeNextSpy = sandbox.stub().resolves()
  const executeMenuSpy = sandbox.stub().resolves()
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
    mountDom(dom)
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
    assert(hasValue(tgt))
    sandbox.stub(tgt, 'getBoundingClientRect').callsFake(() => cast<DOMRect>(boundingRect))
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

    assert(Pictures.mainImage !== null)
  })
  afterEach(() => {
    sandbox.restore()
    executeMenuSpy.resetHistory()
    executeNextSpy.resetHistory()
    executePreviousSpy.resetHistory()
    ignoreClickSpy.resetHistory()
    unmountDom()
  })
  it('should store initial scale from visual viewport', () => {
    visualViewport.scale = 972
    initMouse()
    expect(Pictures.initialScale).to.equal(972)
  })
  it('should store default initial scale when visual viewport is nullish', () => {
    // @ts-expect-error Ignore that visualviewport is read-only
    dom.window.visualViewport = null
    initMouse()
    expect(Pictures.initialScale).to.equal(-1)
  })
  it('should navigate to previous from left area click', () => {
    visualViewport.scale = 2
    initMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(1)
  })
  it('should process click when current scale is zoomed out from initial', () => {
    visualViewport.scale = 2
    initMouse()
    visualViewport.scale = 1
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(1)
  })
  it('should not navigate when current scale is zoomed in from initial', () => {
    visualViewport.scale = 2
    initMouse()
    visualViewport.scale = 2.0001
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(0)
  })
  it('should ignore click when current scale is zoomed in from initial', () => {
    visualViewport.scale = 2
    initMouse()
    visualViewport.scale = 2.0001
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(ignoreClickSpy.callCount).to.equal(1)
  })
  it('should not navigate when mainImage bounding rect invalid', () => {
    visualViewport.scale = 2
    initMouse()
    const tgt = Pictures.mainImage?.parentElement
    Pictures.mainImage = null
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    tgt?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(0)
  })
  it('should ignore click when mainImage bounding rect invalid', () => {
    visualViewport.scale = 2
    initMouse()
    const tgt = Pictures.mainImage?.parentElement
    Pictures.mainImage = null
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    tgt?.dispatchEvent(evt)
    expect(ignoreClickSpy.callCount).to.equal(1)
  })
  it('should not navigate when click target width is zero', () => {
    visualViewport.scale = 2
    initMouse()
    boundingRect.width = 0
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executePreviousSpy.callCount).to.equal(0)
  })
  it('should ignore click when click target width is zero', () => {
    visualViewport.scale = 2
    initMouse()
    boundingRect.width = 0
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(ignoreClickSpy.callCount).to.equal(1)
  })
  it('should show menu from middle area click', () => {
    visualViewport.scale = 2
    initMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 2,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executeMenuSpy.callCount).to.equal(1)
  })
  it('should navigate to next from right area click', () => {
    visualViewport.scale = 2
    initMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: (3 * boundingRect.width) / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(executeNextSpy.callCount).to.equal(1)
  })
})
