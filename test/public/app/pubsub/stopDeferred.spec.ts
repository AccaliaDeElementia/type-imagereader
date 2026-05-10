'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { Internals, PubSub, stopDeferred } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pubsub stopDeferred()', () => {
  let dom = new JSDOM('<html></html>', {})
  let clearIntervalSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    clearIntervalSpy = sandbox.stub(global.window, 'clearInterval')
    PubSub.cycleTime = 17
    resetPubSub()
    PubSub.timer = 12
    sandbox.stub(Internals, 'executeInterval')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should clear interval with Window.clearInterval()', () => {
    stopDeferred()
    expect(clearIntervalSpy.callCount).to.equal(1)
  })
  it('should pass saved timer id to clearInterval()', () => {
    PubSub.timer = 6413287
    stopDeferred()
    expect(clearIntervalSpy.firstCall.args).to.deep.equal([6413287])
  })
  it('should clear saved timer id', () => {
    PubSub.timer = 6413287
    stopDeferred()
    expect(PubSub.timer).to.equal(undefined)
  })
  it('should not clear interval if timer is not set', () => {
    PubSub.timer = undefined
    stopDeferred()
    expect(clearIntervalSpy.callCount).to.equal(0)
  })
})
