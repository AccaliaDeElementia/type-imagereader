'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { resetPubSub } from '../../../../testutils/PubSub'

describe('public/app/pubsub function AddInterval()', () => {
  beforeEach(() => {
    PubSub.cycleTime = 10
    resetPubSub()
  })
  it('should add to intervals map', () => {
    const spy = Sinon.spy()
    PubSub.AddInterval('FOOBAR', spy, 0)
    expect(PubSub.intervals).to.have.any.keys('FOOBAR')
  })
  it('should store method to intervals map', () => {
    const spy = Sinon.spy()
    PubSub.AddInterval('FOOBAR', spy, 0)
    expect(PubSub.intervals.FOOBAR?.method).to.equal(spy)
  })
  it('should replace interval method when adding already existing name', () => {
    const ival = {
      method: Sinon.spy(),
      intervalCycles: 9,
      delayCycles: 0,
    }
    PubSub.intervals.FOOBAR = ival
    PubSub.AddInterval('FOOBAR', Sinon.spy(), 0)
    expect(PubSub.intervals.FOOBAR).to.not.equal(ival)
  })
  it('should add method with a zero delay cycles valuu', () => {
    const spy = Sinon.spy()
    PubSub.AddInterval('FOOBAR', spy, 65535)
    expect(PubSub.intervals.FOOBAR?.delayCycles).to.equal(0)
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
    it(`should convert an interval of ${delay}ms to ${mapped} interval cycles`, () => {
      PubSub.AddInterval('FOOBAR', Sinon.spy(), delay)
      expect(PubSub.intervals.FOOBAR?.intervalCycles).to.equal(mapped)
    })
  }
})
