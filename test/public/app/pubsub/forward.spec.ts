'use sanity'

import Sinon from 'sinon'
import { PubSub, forward } from '#public/scripts/app/pubsub.js'
import { getSubscriber, resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pubsub forward()', () => {
  beforeEach(() => {
    resetPubSub()
    PubSub.cycleTime = 10
  })
  afterEach(() => {
    sandbox.restore()
  })

  it('should register a subscriber under the source topic', () => {
    forward('Foo:Bar', 'Baz:Qux')
    expect(Object.keys(PubSub.subscribers)).toContain('FOO:BAR')
  })
  it('should register exactly one subscriber on the source topic', () => {
    forward('Foo:Bar', 'Baz:Qux')
    expect(PubSub.subscribers['FOO:BAR']).toHaveLength(1)
  })
  it('should publish to the target topic when the source-topic subscriber fires', async () => {
    forward('Foo:Bar', 'Baz:Qux')
    const targetSpy = sandbox.stub().resolves()
    PubSub.subscribers['BAZ:QUX'] = [targetSpy]
    const handler = getSubscriber('FOO:BAR')
    await handler(undefined)
    expect(targetSpy.callCount).toBe(1)
  })
  it('should not invoke the target subscriber before the source fires', () => {
    const targetSpy = sandbox.stub().resolves()
    PubSub.subscribers['BAZ:QUX'] = [targetSpy]
    forward('Foo:Bar', 'Baz:Qux')
    expect(targetSpy.callCount).toBe(0)
  })
  it('should append rather than replace when a subscriber already exists on the source topic', () => {
    const existing = sandbox.stub().resolves()
    PubSub.subscribers['FOO:BAR'] = [existing]
    forward('Foo:Bar', 'Baz:Qux')
    expect(PubSub.subscribers['FOO:BAR']).toHaveLength(2)
  })
})
