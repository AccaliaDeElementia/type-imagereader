'use sanity'

import Sinon from 'sinon'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { expect } from 'chai'

describe('public/app/pubsub function Subscribe()', () => {
  let subscriber = Sinon.stub().resolves()
  beforeEach(() => {
    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.intervals = {}
    PubSub.timer = undefined
    PubSub.cycleTime = 10
    subscriber = Sinon.stub().resolves()
  })

  const topics = ['foobar:baz', 'Foobar:Baz', 'fOoBaR:bAz', 'FoOBaR:BaZ', 'FOOBAR:BAZ', 'foobar:BAZ', 'FOOBAR:baz']
  topics.forEach((topic) => {
    it(`should add ${topic} subscriber as 'FOOBAR:BAZ topic`, () => {
      PubSub.Subscribe(topic, subscriber)
      expect(PubSub.subscribers).to.have.any.keys('FOOBAR:BAZ')
      expect(PubSub.subscribers['FOOBAR:BAZ']).to.deep.equal([subscriber])
    })
  })
  it('should append subscriber to subscriber list', () => {
    PubSub.subscribers['FOOBAR:BAZ'] = []
    for (let i = 0; i < 10; i++) {
      PubSub.subscribers['FOOBAR:BAZ'].push(Sinon.stub().resolves())
    }
    PubSub.Subscribe('Foobar:Baz', subscriber)
    expect(PubSub.subscribers['FOOBAR:BAZ']).to.have.lengthOf(11)
    expect(PubSub.subscribers['FOOBAR:BAZ'][10]).to.equal(subscriber)
  })
})
