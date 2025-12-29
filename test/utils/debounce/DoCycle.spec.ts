'use sanity'

import { Debouncer } from '../../../utils/debounce'
import { expect } from 'chai'
import Sinon from 'sinon'

describe('utils/debounce static function doCycle()', () => {
  const bouncer = new Debouncer()
  beforeEach(() => {
    Debouncer._debouncers = [bouncer]
    bouncer._counters = []
  })
  afterEach(() => {
    Debouncer._debouncers = []
  })
  it('should not fire pending counter', async () => {
    const counter = {
      key: 'foo',
      callback: Sinon.stub().resolves(),
      counter: 27,
    }
    bouncer._counters.push(counter)
    await Debouncer._doCycle()
    expect(counter.counter).to.equal(26)
  })
  it('should not fire pending counter', async () => {
    const spy = Sinon.stub().resolves()
    bouncer._counters.push({
      key: 'foo',
      callback: spy,
      counter: 1,
    })
    await Debouncer._doCycle()
    expect(spy.callCount).to.equal(0)
  })
  it('should not remove pending counter', async () => {
    bouncer._counters.push({
      key: 'foo',
      callback: async () => {
        await Promise.resolve()
      },
      counter: 1,
    })
    await Debouncer._doCycle()
    expect(bouncer._counters).to.have.lengthOf(1)
  })
  it('should fire due counter', async () => {
    const spy = Sinon.stub().resolves()
    bouncer._counters.push({
      key: 'foo',
      callback: spy,
      counter: 0,
    })
    await Debouncer._doCycle()
    expect(spy.callCount).to.equal(1)
  })
  it('should handle callbacks that reject gracefully', async () => {
    const spy = Sinon.stub().rejects('BOO')
    bouncer._counters.push({
      key: 'foo',
      callback: spy,
      counter: 0,
    })
    await Debouncer._doCycle()
    expect(spy.callCount).to.equal(1)
  })
  it('should remove due counter', async () => {
    bouncer._counters.push({
      key: 'foo',
      callback: async () => {
        await Promise.resolve()
      },
      counter: 0,
    })
    await Debouncer._doCycle()
    expect(bouncer._counters).to.have.lengthOf(0)
  })
  it('should not fire expired counter', async () => {
    const spy = Sinon.stub().resolves()
    bouncer._counters.push({
      key: 'foo',
      callback: spy,
      counter: -1,
    })
    await Debouncer._doCycle()
    expect(spy.callCount).to.equal(0)
  })
  it('should remove expired counter', async () => {
    bouncer._counters.push({
      key: 'foo',
      callback: async () => {
        await Promise.resolve()
      },
      counter: -1,
    })
    await Debouncer._doCycle()
    expect(bouncer._counters).to.have.lengthOf(0)
  })
})
