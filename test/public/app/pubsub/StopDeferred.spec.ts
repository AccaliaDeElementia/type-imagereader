'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pubsub function StopDeferred()', () => {
  let dom = new JSDOM('<html></html>', {})
  let clearIntervalSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    clearIntervalSpy = sandbox.stub(global.window, 'clearInterval')
    PubSub.cycleTime = 17
    resetPubSub()
    PubSub.timer = 12
    sandbox.stub(PubSub, 'ExecuteInterval')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should clear interval with Window.clearInterval()', () => {
    PubSub.StopDeferred()
    expect(clearIntervalSpy.callCount).to.equal(1)
  })
  it('should pass saved timer id to clearInterval()', () => {
    PubSub.timer = 6413287
    PubSub.StopDeferred()
    expect(clearIntervalSpy.firstCall.args).to.deep.equal([6413287])
  })
  it('should clear saved timer id', () => {
    PubSub.timer = 6413287
    PubSub.StopDeferred()
    expect(PubSub.timer).to.equal(undefined)
  })
  it('should not clear interval if timer is not set', () => {
    PubSub.timer = undefined
    PubSub.StopDeferred()
    expect(clearIntervalSpy.callCount).to.equal(0)
  })
})
