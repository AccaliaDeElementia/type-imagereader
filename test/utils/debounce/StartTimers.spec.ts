'use sanity'

import Sinon from 'sinon'
import { Debouncer } from '../../../utils/debounce'
import { expect } from 'chai'
import { Cast } from '../../testutils/TypeGuards'

describe('utils/debounce Debouncer.startTimers()', () => {
  let setIntervalStub = Sinon.stub()
  let doCycleStub = Sinon.stub()
  beforeEach(() => {
    Debouncer._debouncers = []
    Debouncer._timer = undefined
    setIntervalStub = Sinon.stub(global, 'setInterval')
    doCycleStub = Sinon.stub(Debouncer, '_doCycle').resolves()
  })
  afterEach(() => {
    doCycleStub.restore()
    setIntervalStub.restore()
  })
  it('should start a timer', () => {
    Debouncer.startTimers()
    expect(setIntervalStub.callCount).to.equal(1)
  })
  it('should start a timer with specified callback and interval', () => {
    Debouncer.startTimers()
    expect(setIntervalStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should start timer with callback that executes _doCycle()', () => {
    Debouncer.startTimers()
    const fn = Cast<() => void>(setIntervalStub.firstCall.args[0])
    expect(doCycleStub.callCount).to.equal(0)
    fn()
    expect(doCycleStub.callCount).to.equal(1)
  })
  it('should start timer with configured interval', () => {
    Debouncer._interval = 0.618033988749
    Debouncer.startTimers()
    expect(setIntervalStub.firstCall.args[1]).to.equal(0.618033988749)
  })
  it('should not start timer when timer exists', () => {
    Debouncer._timer = Cast<ReturnType<typeof setInterval>>(69)
    Debouncer.startTimers()
    expect(setIntervalStub.callCount).to.equal(0)
  })
})
