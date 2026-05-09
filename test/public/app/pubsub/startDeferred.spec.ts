'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { Internals, PubSub, startDeferred } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import assert from 'node:assert'
import { cast } from '#testutils/typeGuards.js'
import { hasValue } from '#utils/helpers.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pubsub startDeferred()', () => {
  let dom = new JSDOM('<html></html>', {})
  let setIntervalSpy = sandbox.stub()
  let executeIntervalSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    setIntervalSpy = sandbox.stub(global.window, 'setInterval')
    setIntervalSpy.returns(1)
    PubSub.cycleTime = 17
    resetPubSub()
    executeIntervalSpy = sandbox.stub(Internals, 'ExecuteInterval')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should set interval with Window.SetInterval()', () => {
    startDeferred()
    expect(setIntervalSpy.callCount).to.equal(1)
  })
  it('should call executeInterval with interval fn', () => {
    startDeferred()
    const fn = setIntervalSpy.firstCall.args[0] as unknown
    assert(hasValue(fn))
    cast<() => void>(fn)()
    expect(executeIntervalSpy.callCount).to.equal(1)
  })
  it('should call setInterval with 2 arguments', () => {
    startDeferred()
    expect(setIntervalSpy.firstCall.args).to.have.lengthOf(2)
  })
  it('should set interval with configured interval period', () => {
    startDeferred()
    expect(setIntervalSpy.firstCall.args[1]).to.equal(17)
  })
  it('should save timer id for later deactivation', () => {
    setIntervalSpy.returns(6413287)
    startDeferred()
    expect(PubSub.timer).to.equal(6413287)
  })
})
