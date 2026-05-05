'use sanity'

import Sinon from 'sinon'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/PubSub.js'
import { expect } from 'chai'

const sandbox = Sinon.createSandbox()

describe('public/app/pubsub function Subscribe()', () => {
  let subscriber = sandbox.stub().resolves()
  beforeEach(() => {
    resetPubSub()
    PubSub.cycleTime = 10
    subscriber = sandbox.stub().resolves()
  })
  afterEach(() => {
    sandbox.restore()
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
      PubSub.subscribers['FOOBAR:BAZ'].push(sandbox.stub().resolves())
    }
    PubSub.Subscribe('Foobar:Baz', subscriber)
    expect(PubSub.subscribers['FOOBAR:BAZ']).to.have.lengthOf(11)
  })
  it('should append subscriber as last element in subscriber list', () => {
    PubSub.subscribers['FOOBAR:BAZ'] = []
    for (let i = 0; i < 10; i += 1) {
      PubSub.subscribers['FOOBAR:BAZ'].push(sandbox.stub().resolves())
    }
    PubSub.Subscribe('Foobar:Baz', subscriber)
    expect(PubSub.subscribers['FOOBAR:BAZ'][10]).to.equal(subscriber)
  })
})
