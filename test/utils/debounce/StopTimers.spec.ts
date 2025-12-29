'use sanity'

import Sinon from 'sinon'
import { Debouncer } from '../../../utils/debounce'
import { expect } from 'chai'
import { Cast } from '../../testutils/TypeGuards'

describe('utils/debounce Debouncer.stopTimers()', () => {
  let clearIntervalStub = Sinon.stub()
  beforeEach(() => {
    Debouncer._debouncers = []
    Debouncer._timer = undefined
    clearIntervalStub = Sinon.stub(global, 'clearInterval')
  })
  afterEach(() => {
    clearIntervalStub.restore()
  })
  it('should stop running timer', () => {
    Debouncer._timer = Cast<ReturnType<typeof setInterval>>(69)
    Debouncer.stopTimers()
    expect(clearIntervalStub.callCount).to.equal(1)
  })
  it('should stop running timer', () => {
    Debouncer._timer = Cast<ReturnType<typeof setInterval>>(1.618033988749)
    Debouncer.stopTimers()
    expect(clearIntervalStub.firstCall.args).to.deep.equal([1.618033988749])
  })
  it('should clear existing timer', () => {
    Debouncer._timer = Cast<ReturnType<typeof setInterval>>(69)
    Debouncer.stopTimers()
    expect(Debouncer._timer).to.equal(undefined)
  })
  it('should not stop when not running timer', () => {
    Debouncer._timer = Cast<ReturnType<typeof setInterval>>(undefined)
    Debouncer.stopTimers()
    expect(clearIntervalStub.callCount).to.equal(0)
  })
})
