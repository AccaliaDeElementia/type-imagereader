'use sanity'

import Sinon from 'sinon'
import { Debouncer } from '../../../utils/debounce'
import { expect } from 'chai'

describe('utils/debounce Debouncer.debounce', () => {
  let debouncer = new Debouncer(100)
  let callback = Sinon.stub().resolves()
  beforeEach(() => {
    Debouncer._debouncers = []
    Debouncer._timer = undefined
    Debouncer._interval = 100
    debouncer = new Debouncer(500)
    callback = Sinon.stub().resolves()
  })
  it('should add new key to list of debouncers', () => {
    debouncer.debounce('foo', callback)
    expect(debouncer._counters).to.have.lengthOf(1)
    expect(debouncer._counters[0]?.key).to.equal('foo')
  })
  it('should add new callback to list of debouncers', () => {
    debouncer.debounce('foo', callback)
    expect(debouncer._counters).to.have.lengthOf(1)
    expect(debouncer._counters[0]?.callback).to.equal(callback)
  })
  it('should set new key cycle count to default', () => {
    debouncer.debounce('foo', callback)
    expect(debouncer._counters).to.have.lengthOf(1)
    expect(debouncer._counters[0]?.counter).to.equal(5)
  })
  it('should overwrite key for existing key', () => {
    debouncer._counters.push({
      key: 'foo',
      callback: Sinon.stub().resolves(),
      counter: 5,
    })
    debouncer.debounce('foo', callback)
    expect(debouncer._counters).to.have.lengthOf(1)
    expect(debouncer._counters[0]?.key).to.equal('foo')
  })
  it('should overwrite callback for existing key', () => {
    debouncer._counters.push({
      key: 'foo',
      callback: Sinon.stub().resolves(),
      counter: 5,
    })
    debouncer.debounce('foo', callback)
    expect(debouncer._counters).to.have.lengthOf(1)
    expect(debouncer._counters[0]?.callback).to.equal(callback)
  })
  it('should reset count for existing key', () => {
    debouncer._counters.push({
      key: 'foo',
      callback: Sinon.stub().resolves(),
      counter: 1,
    })
    debouncer.debounce('foo', callback)
    expect(debouncer._counters).to.have.lengthOf(1)
    expect(debouncer._counters[0]?.counter).to.equal(5)
  })
})
