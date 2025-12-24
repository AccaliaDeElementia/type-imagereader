'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import assert from 'node:assert'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pubsub function StartDeferred()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let setIntervalSpy = Sinon.stub()
  let executeIntervalSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    setIntervalSpy = Sinon.stub(global.window, 'setInterval')
    setIntervalSpy.returns(1)
    PubSub.cycleTime = 17
    PubSub.timer = undefined
    executeIntervalSpy = Sinon.stub(PubSub, 'ExecuteInterval')
  })
  afterEach(() => {
    setIntervalSpy.restore()
    executeIntervalSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should set interval with Window.SetInterval()', () => {
    PubSub.StartDeferred()
    expect(setIntervalSpy.callCount).to.equal(1)
  })
  it('should call executeInterval with interval fn', () => {
    PubSub.StartDeferred()
    const fn = setIntervalSpy.firstCall.args[0] as unknown
    assert(fn != null)
    Cast<() => void>(fn)()
    expect(executeIntervalSpy.callCount).to.equal(1)
  })
  it('should set interval with configured interval period', () => {
    PubSub.StartDeferred()
    expect(setIntervalSpy.firstCall.args).to.have.lengthOf(2)
    expect(setIntervalSpy.firstCall.args[1]).to.equal(17)
  })
  it('should save timer id for later deactivation', () => {
    setIntervalSpy.returns(6413287)
    PubSub.StartDeferred()
    expect(PubSub.timer).to.equal(6413287)
  })
})
