'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { PubSub, publish, Internals } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { cast } from '#testutils/typeGuards.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/app/pubsub publish()', () => {
  let publishAsyncSpy = sandbox.stub().resolves()
  beforeEach(() => {
    publishAsyncSpy = sandbox.stub(Internals, 'publishAsync').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call publishAsync once when publishing', () => {
    const topic = `TOPIC${Math.random()}`
    const data = `DATA${Math.random()}`
    publish(topic, data)
    expect(publishAsyncSpy.callCount).toBe(1)
  })
  it('should pass parameters to voided publishAsync', () => {
    const topic = `TOPIC${Math.random()}`
    const data = `DATA${Math.random()}`
    publish(topic, data)
    expect(publishAsyncSpy.firstCall.args).toEqual([topic, data])
  })
})

describe('public/app/pubsub publishAsync()', () => {
  let subscriber = sandbox.stub().resolves()
  let dom = new JSDOM('<html></html')
  let consoleWarn = sandbox.stub()
  let consoleError = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html')
    mountDom(dom)
    consoleWarn = sandbox.stub(global.window.console, 'warn')
    consoleError = sandbox.stub(global.window.console, 'error')

    subscriber = sandbox.stub().resolves()
    resetPubSub()
    PubSub.subscribers = {
      'FOO:BAR': [subscriber],
    }
    PubSub.cycleTime = 10
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should print warning once on publish for unknown topic', async () => {
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.callCount).toBe(1)
  })
  it('should print warning with expected args on publish for unknown topic', async () => {
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.firstCall.args).toEqual(['PUBSUB: topic Quux published without subscribers', 'Digital'])
  })
  it('should print warning once on publish with only subscribers to child event', async () => {
    await Internals.publishAsync('Foo', 'Digital')
    expect(consoleWarn.callCount).toBe(1)
  })
  it('should print warning with expected args on publish with only subscribers to child event', async () => {
    await Internals.publishAsync('Foo', 'Digital')
    expect(consoleWarn.firstCall.args).toEqual(['PUBSUB: topic Foo published without subscribers', 'Digital'])
  })
  it('should print warning once on publish with registered topic missing subscribers', async () => {
    PubSub.subscribers.QUUX = []
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.callCount).toBe(1)
  })
  it('should print warning with expected args on publish with registered topic missing subscribers', async () => {
    PubSub.subscribers.QUUX = []
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.firstCall.args).toEqual(['PUBSUB: topic QUUX registered without subscribers!'])
  })
  it('should call subscriber once on valid event', async () => {
    await Internals.publishAsync('foo:bar', 'Quux')
    expect(subscriber.callCount).toBe(1)
  })
  it('should call subscriber with expected args on valid event', async () => {
    await Internals.publishAsync('foo:bar', 'Quux')
    expect(subscriber.firstCall.args).toEqual(['Quux', 'FOO:BAR'])
  })
  it('should call subscriber once on valid cascading event', async () => {
    await Internals.publishAsync('foo:bar:baz:xyzzy', 'Quux')
    expect(subscriber.callCount).toBe(1)
  })
  it('should call subscriber with expected args on valid cascading event', async () => {
    await Internals.publishAsync('foo:bar:baz:xyzzy', 'Quux')
    expect(subscriber.firstCall.args).toEqual(['Quux', 'FOO:BAR:BAZ:XYZZY'])
  })
  it('should call all subscribers when publishing', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.callCount).toBe(1)
    for (let i = 1; i <= 10; i += 1) {
      const current = cast<Sinon.SinonStub>(PubSub.subscribers['FOO:BAR'][i])
      expect(current.callCount).toBe(1)
    }
  })
  it('should publish to all subscribers in order', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    for (let i = 1; i <= 10; i += 1) {
      const prior = cast<Sinon.SinonStub>(PubSub.subscribers['FOO:BAR'][i - 1])
      const current = cast<Sinon.SinonStub>(PubSub.subscribers['FOO:BAR'][i])
      expect(prior.calledBefore(current)).toBe(true)
    }
  })
  it('should call a subscriber when publishing top down', async () => {
    const a = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D:E'] = [sandbox.stub().resolves()]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(a.callCount).toBe(1)
  })
  it('should call ab subscriber when publishing top down', async () => {
    const ab = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D:E'] = [sandbox.stub().resolves()]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(ab.callCount).toBe(1)
  })
  it('should call abc subscriber when publishing top down', async () => {
    const abc = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D:E'] = [sandbox.stub().resolves()]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abc.callCount).toBe(1)
  })
  it('should call abcd subscriber when publishing top down', async () => {
    const abcd = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [sandbox.stub().resolves()]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abcd.callCount).toBe(1)
  })
  it('should call abcde subscriber when publishing top down', async () => {
    const abcde = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D'] = [sandbox.stub().resolves()]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abcde.callCount).toBe(1)
  })
  it('should publish ab after a in hierarchy top down', async () => {
    const a = sandbox.stub().resolves()
    const ab = sandbox.stub().resolves()
    const abc = sandbox.stub().resolves()
    const abcd = sandbox.stub().resolves()
    const abcde = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(ab.calledAfter(a)).toBe(true)
  })
  it('should publish abc after ab in hierarchy top down', async () => {
    const a = sandbox.stub().resolves()
    const ab = sandbox.stub().resolves()
    const abc = sandbox.stub().resolves()
    const abcd = sandbox.stub().resolves()
    const abcde = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abc.calledAfter(ab)).toBe(true)
  })
  it('should publish abcd after abc in hierarchy top down', async () => {
    const a = sandbox.stub().resolves()
    const ab = sandbox.stub().resolves()
    const abc = sandbox.stub().resolves()
    const abcd = sandbox.stub().resolves()
    const abcde = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abcd.calledAfter(abc)).toBe(true)
  })
  it('should publish abcde after abcd in hierarchy top down', async () => {
    const a = sandbox.stub().resolves()
    const ab = sandbox.stub().resolves()
    const abc = sandbox.stub().resolves()
    const abcd = sandbox.stub().resolves()
    const abcde = sandbox.stub().resolves()
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abcde.calledAfter(abcd)).toBe(true)
  })
  it('should still call all subscribers when one rejects', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    subscriber.rejects('foo rejects!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.callCount).toBe(1)
    for (const sub of PubSub.subscribers['FOO:BAR']) {
      expect(cast<Sinon.SinonStub>(sub).callCount).toBe(1)
    }
  })
  it('should log error once when one subscriber rejects', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    subscriber.rejects('foo rejects!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.callCount).toBe(1)
  })
  it('should log expected message when one subscriber rejects', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    subscriber.rejects('foo rejects!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.firstCall.args[0]).toBe('Subscriber for FOO:BAR rejected with error:')
  })
  it('should still call all subscribers when one throws', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    subscriber.throws('foo throws!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.callCount).toBe(1)
    for (const sub of PubSub.subscribers['FOO:BAR']) {
      expect(cast<Sinon.SinonStub>(sub).callCount).toBe(1)
    }
  })
  it('should log error once when one subscriber throws', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    subscriber.throws('foo throws!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.callCount).toBe(1)
  })
  it('should log expected message when one subscriber throws', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(sandbox.stub().resolves())
    }
    subscriber.throws('foo throws!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.firstCall.args[0]).toBe('Subscriber for FOO:BAR rejected with error:')
  })
})
