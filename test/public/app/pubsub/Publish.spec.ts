'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { expect } from 'chai'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'
import assert from 'node:assert'

describe('public/app/pubsub function Publish()', () => {
  let publishAsyncSpy = Sinon.stub().resolves()
  beforeEach(() => {
    publishAsyncSpy = Sinon.stub(PubSub, 'PublishAsync').resolves()
  })
  afterEach(() => {
    publishAsyncSpy.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should pass parameters to voided PublishAsync', () => {
    const topic = `TOPIC${Math.random()}`
    const data = `DATA${Math.random()}`
    PubSub.Publish(topic, data)
    expect(publishAsyncSpy.callCount).to.equal(1)
    expect(publishAsyncSpy.firstCall.args).to.deep.equal([topic, data])
  })
})

describe('public/app/pubsub function PublishAsync()', () => {
  let subscriber = Sinon.stub().resolves()
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html')
  let consoleWarn = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html')
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    consoleWarn = Sinon.stub(global.window.console, 'warn')

    subscriber = Sinon.stub().resolves()
    PubSub.subscribers = {
      'FOO:BAR': [subscriber],
    }
    PubSub.deferred = []
    PubSub.intervals = {}
    PubSub.timer = undefined
    PubSub.cycleTime = 10
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should print warning on Publish for unknown topic', async () => {
    await PubSub.PublishAsync('Quux', 'Digital')
    expect(consoleWarn.callCount).to.equal(1)
    expect(consoleWarn.firstCall.args).to.deep.equal(['PUBSUB: topic Quux published without subscribers', 'Digital'])
  })
  it('should print warning on publish with only subscribers to child event', async () => {
    await PubSub.PublishAsync('Foo', 'Digital')
    expect(consoleWarn.callCount).to.equal(1)
    expect(consoleWarn.firstCall.args).to.deep.equal(['PUBSUB: topic Foo published without subscribers', 'Digital'])
  })
  it('should print warning on publish with registered topic missing subscribers', async () => {
    PubSub.subscribers.QUUX = []
    await PubSub.PublishAsync('Quux', 'Digital')
    expect(consoleWarn.callCount).to.equal(1)
    expect(consoleWarn.firstCall.args).to.deep.equal(['PUBSUB: topic QUUX registered without subscribers!'])
  })
  it('should publish valid event', async () => {
    await PubSub.PublishAsync('foo:bar', 'Quux')
    expect(subscriber.callCount).to.equal(1)
    expect(subscriber.firstCall.args).to.deep.equal(['Quux', 'FOO:BAR'])
  })
  it('should publish valid cascading event', async () => {
    await PubSub.PublishAsync('foo:bar:baz:xyzzy', 'Quux')
    expect(subscriber.callCount).to.equal(1)
    expect(subscriber.firstCall.args).to.deep.equal(['Quux', 'FOO:BAR:BAZ:XYZZY'])
  })
  it('should publish to all subscribers in order', async () => {
    assert(PubSub.subscribers['FOO:BAR'] != null)
    for (let i = 1; i <= 10; i++) {
      PubSub.subscribers['FOO:BAR'].push(Sinon.stub().resolves())
    }
    await PubSub.PublishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.callCount).to.equal(1)
    for (let i = 1; i <= 10; i++) {
      const prior = Cast<Sinon.SinonStub>(PubSub.subscribers['FOO:BAR'][i - 1])
      const current = Cast<Sinon.SinonStub>(PubSub.subscribers['FOO:BAR'][i])
      expect(current.callCount).to.equal(1)
      expect(prior.calledBefore(current)).to.equal(true)
    }
  })
  it('should publish whole hierarchy top down', async () => {
    const a = Sinon.stub().resolves()
    const ab = Sinon.stub().resolves()
    const abc = Sinon.stub().resolves()
    const abcd = Sinon.stub().resolves()
    const abcde = Sinon.stub().resolves()
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await PubSub.PublishAsync('_:a:b:c:d:e', 'FOO')
    expect(a.callCount).to.equal(1)
    expect(ab.callCount).to.equal(1)
    expect(ab.calledAfter(a)).to.equal(true)
    expect(abc.callCount).to.equal(1)
    expect(abc.calledAfter(ab)).to.equal(true)
    expect(abcd.callCount).to.equal(1)
    expect(abcd.calledAfter(abc)).to.equal(true)
    expect(abcde.callCount).to.equal(1)
    expect(abcde.calledAfter(abcd)).to.equal(true)
  })
  it('should tolerate one subscriber rejecting', async () => {
    assert(PubSub.subscribers['FOO:BAR'] != null)
    for (let i = 1; i <= 10; i++) {
      PubSub.subscribers['FOO:BAR'].push(Sinon.stub().resolves())
    }
    subscriber.rejects('foo rejects!')
    await PubSub.PublishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.callCount).to.equal(1)
    for (const sub of PubSub.subscribers['FOO:BAR']) {
      expect(Cast<Sinon.SinonStub>(sub).callCount).to.equal(1)
    }
  })
  it('should tolerate one subscriber throwing', async () => {
    assert(PubSub.subscribers['FOO:BAR'] != null)
    for (let i = 1; i <= 10; i++) {
      PubSub.subscribers['FOO:BAR'].push(Sinon.stub().resolves())
    }
    subscriber.throws('foo throws!')
    await PubSub.PublishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.callCount).to.equal(1)
    for (const sub of PubSub.subscribers['FOO:BAR']) {
      expect(Cast<Sinon.SinonStub>(sub).callCount).to.equal(1)
    }
  })
})
