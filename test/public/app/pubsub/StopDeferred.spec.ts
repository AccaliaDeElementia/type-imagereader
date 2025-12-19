'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pubsub function RemoveInterval()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let clearIntervalSpy = Sinon.stub()
  let executeIntervalSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    clearIntervalSpy = Sinon.stub(global.window, 'clearInterval')
    PubSub.cycleTime = 17
    PubSub.timer = 12
    executeIntervalSpy = Sinon.stub(PubSub, 'ExecuteInterval')
  })
  afterEach(() => {
    clearIntervalSpy.restore()
    executeIntervalSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
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
  it('should not clear interrval if timer is not set', () => {
    PubSub.timer = undefined
    PubSub.StartDeferred()
    expect(clearIntervalSpy.callCount).to.equal(0)
  })
})
