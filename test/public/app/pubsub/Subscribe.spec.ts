'use sanity'

import Sinon from 'sinon'
import { PubSub } from '#public/scripts/app/pubsub'
import { resetPubSub } from '#testutils/PubSub'
import { expect } from 'chai'

describe('public/app/pubsub function Subscribe()', () => {
  let subscriber = Sinon.stub().resolves()
  beforeEach(() => {
    resetPubSub()
    PubSub.cycleTime = 10
    subscriber = Sinon.stub().resolves()
  })

  const topics = ['foobar:baz', 'Foobar:Baz', 'fOoBaR:bAz', 'FoOBaR:BaZ', 'FOOBAR:BAZ', 'foobar:BAZ', 'FOOBAR:baz']
  topics.forEach((topic) => {
    it(`should normalise ${topic} to FOOBAR:BAZ key`, () => {
      PubSub.Subscribe(topic, subscriber)
      expect(PubSub.subscribers).to.have.any.keys('FOOBAR:BAZ')
    })
    it(`should store subscriber under FOOBAR:BAZ when topic is ${topic}`, () => {
      PubSub.Subscribe(topic, subscriber)
      expect(PubSub.subscribers['FOOBAR:BAZ']).to.deep.equal([subscriber])
    })
  })
  it('should grow subscriber list length to 11 when appending to 10 existing', () => {
    PubSub.subscribers['FOOBAR:BAZ'] = []
    for (let i = 0; i < 10; i += 1) {
      PubSub.subscribers['FOOBAR:BAZ'].push(Sinon.stub().resolves())
    }
    PubSub.Subscribe('Foobar:Baz', subscriber)
    expect(PubSub.subscribers['FOOBAR:BAZ']).to.have.lengthOf(11)
  })
  it('should append subscriber as last element in subscriber list', () => {
    PubSub.subscribers['FOOBAR:BAZ'] = []
    for (let i = 0; i < 10; i += 1) {
      PubSub.subscribers['FOOBAR:BAZ'].push(Sinon.stub().resolves())
    }
    PubSub.Subscribe('Foobar:Baz', subscriber)
    expect(PubSub.subscribers['FOOBAR:BAZ'][10]).to.equal(subscriber)
  })
})
