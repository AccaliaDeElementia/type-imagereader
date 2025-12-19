'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'

import { PubSub } from '../../../../public/scripts/app/pubsub'

describe('public/app/pubsub function Defer()', () => {
  beforeEach(() => {
    PubSub.deferred = []
    PubSub.cycleTime = 10
  })
  it('add method to deferred list', () => {
    const spy = Sinon.spy()
    PubSub.Defer(spy, 0)
    expect(PubSub.deferred).to.have.lengthOf(1)
    expect(PubSub.deferred.pop()?.method).to.equal(spy)
  })
  it('deferred method does not immediately fire', () => {
    const spy = Sinon.spy()
    PubSub.Defer(spy, 0)
    expect(spy.callCount).to.equal(0)
  })
  it('append method to deferred list', () => {
    PubSub.deferred.push(
      ...Array.from({ length: 10 }).map(() => ({
        method: Sinon.spy(),
        delayCycles: 1,
      })),
    )
    const spy = Sinon.spy()
    PubSub.Defer(spy, 0)
    expect(PubSub.deferred).to.have.lengthOf(11)
    expect(PubSub.deferred.pop()?.method).to.equal(spy)
  })
  const delayMaps: Array<[number, number]> = [
    [-100, 1],
    [-1, 1],
    [0, 1],
    [1, 1],
    [9, 1],
    [10, 1],
    [11, 2],
    [19, 2],
    [20, 2],
    [21, 3],
    [0.5, 1],
    [19.999999, 2],
    [31, 4],
  ]
  for (const [delay, mapped] of delayMaps) {
    it(`should convert a delay of ${delay}ms to ${mapped} delay cycles`, () => {
      PubSub.Defer(Sinon.spy(), delay)
      expect(PubSub.deferred.pop()?.delayCycles).to.equal(mapped)
    })
  }
})
