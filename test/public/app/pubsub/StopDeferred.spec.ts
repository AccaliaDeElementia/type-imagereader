'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'

import { Internals, PubSub, StopDeferred } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pubsub StopDeferred()', () => {
  let dom = new JSDOM('<html></html>', {})
  let clearIntervalSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    clearIntervalSpy = sandbox.stub(global.window, 'clearInterval')
    PubSub.cycleTime = 17
    resetPubSub()
    PubSub.timer = 12
    sandbox.stub(Internals, 'ExecuteInterval')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should clear interval with Window.clearInterval()', () => {
    StopDeferred()
    expect(clearIntervalSpy.callCount).to.equal(1)
  })
  it('should pass saved timer id to clearInterval()', () => {
    PubSub.timer = 6413287
    StopDeferred()
    expect(clearIntervalSpy.firstCall.args).to.deep.equal([6413287])
  })
  it('should clear saved timer id', () => {
    PubSub.timer = 6413287
    StopDeferred()
    expect(PubSub.timer).to.equal(undefined)
  })
  it('should not clear interval if timer is not set', () => {
    PubSub.timer = undefined
    StopDeferred()
    expect(clearIntervalSpy.callCount).to.equal(0)
  })
})
