'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { PubSub, publish, Internals } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { cast } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

describe('public/app/pubsub publish()', () => {
  let publishAsyncSpy = vi.fn().mockResolvedValue(undefined)
  beforeEach(() => {
    publishAsyncSpy = vi.spyOn(Internals, 'publishAsync').mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call publishAsync once when publishing', () => {
    const topic = `TOPIC${Math.random()}`
    const data = `DATA${Math.random()}`
    publish(topic, data)
    expect(publishAsyncSpy.mock.calls.length).toBe(1)
  })
  it('should pass parameters to voided publishAsync', () => {
    const topic = `TOPIC${Math.random()}`
    const data = `DATA${Math.random()}`
    publish(topic, data)
    expect(publishAsyncSpy.mock.calls[0]).toEqual([topic, data])
  })
  it('should invoke guardCallback with the operation when set', () => {
    const guard = voidFn()
    PubSub.guardCallback = guard
    try {
      publish('Foobar:Baz')
    } finally {
      PubSub.guardCallback = undefined
    }
    expect(guard.mock.calls[0]?.[0]).toBe("publish 'Foobar:Baz'")
  })
  it('should propagate the throw from guardCallback before scheduling publishAsync', () => {
    PubSub.guardCallback = () => {
      throw new Error('guard tripped')
    }
    try {
      expect(() => {
        publish('Foobar:Baz')
      }).toThrow(/guard tripped/v)
      expect(publishAsyncSpy.mock.calls.length).toBe(0)
    } finally {
      PubSub.guardCallback = undefined
    }
  })
})

describe('public/app/pubsub publishAsync()', () => {
  let subscriber = vi.fn().mockResolvedValue(undefined)
  let dom = new JSDOM('<html></html')
  let consoleWarn: MockInstance = vi.fn()
  let consoleError: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html></html')
    mountDom(dom)
    consoleWarn = vi.spyOn(global.window.console, 'warn').mockImplementation((..._args: unknown[]) => undefined)
    consoleError = vi.spyOn(global.window.console, 'error').mockImplementation((..._args: unknown[]) => undefined)

    subscriber = vi.fn().mockResolvedValue(undefined)
    resetPubSub()
    PubSub.subscribers = {
      'FOO:BAR': [subscriber],
    }
    PubSub.cycleTime = 10
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should print warning once on publish for unknown topic', async () => {
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.mock.calls.length).toBe(1)
  })
  it('should print warning with expected args on publish for unknown topic', async () => {
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.mock.calls[0]).toEqual(['PUBSUB: topic Quux published without subscribers', 'Digital'])
  })
  it('should print warning once on publish with only subscribers to child event', async () => {
    await Internals.publishAsync('Foo', 'Digital')
    expect(consoleWarn.mock.calls.length).toBe(1)
  })
  it('should print warning with expected args on publish with only subscribers to child event', async () => {
    await Internals.publishAsync('Foo', 'Digital')
    expect(consoleWarn.mock.calls[0]).toEqual(['PUBSUB: topic Foo published without subscribers', 'Digital'])
  })
  it('should print warning once on publish with registered topic missing subscribers', async () => {
    PubSub.subscribers.QUUX = []
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.mock.calls.length).toBe(1)
  })
  it('should print warning with expected args on publish with registered topic missing subscribers', async () => {
    PubSub.subscribers.QUUX = []
    await Internals.publishAsync('Quux', 'Digital')
    expect(consoleWarn.mock.calls[0]).toEqual(['PUBSUB: topic QUUX registered without subscribers!'])
  })
  it('should call subscriber once on valid event', async () => {
    await Internals.publishAsync('foo:bar', 'Quux')
    expect(subscriber.mock.calls.length).toBe(1)
  })
  it('should call subscriber with expected args on valid event', async () => {
    await Internals.publishAsync('foo:bar', 'Quux')
    expect(subscriber.mock.calls[0]).toEqual(['Quux', 'FOO:BAR'])
  })
  it('should call subscriber once on valid cascading event', async () => {
    await Internals.publishAsync('foo:bar:baz:xyzzy', 'Quux')
    expect(subscriber.mock.calls.length).toBe(1)
  })
  it('should call subscriber with expected args on valid cascading event', async () => {
    await Internals.publishAsync('foo:bar:baz:xyzzy', 'Quux')
    expect(subscriber.mock.calls[0]).toEqual(['Quux', 'FOO:BAR:BAZ:XYZZY'])
  })
  it('should call all subscribers when publishing', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.mock.calls.length).toBe(1)
    for (let i = 1; i <= 10; i += 1) {
      const current = cast<MockInstance>(PubSub.subscribers['FOO:BAR'][i])
      expect(current.mock.calls.length).toBe(1)
    }
  })
  it('should publish to all subscribers in order', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    for (let i = 1; i <= 10; i += 1) {
      const prior = cast<MockInstance>(PubSub.subscribers['FOO:BAR'][i - 1])
      const current = cast<MockInstance>(PubSub.subscribers['FOO:BAR'][i])
      expect((prior.mock.invocationCallOrder[0] ?? 0) < (current.mock.invocationCallOrder[0] ?? 0)).toBe(true)
    }
  })
  it('should call a subscriber when publishing top down', async () => {
    const a = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D:E'] = [vi.fn().mockResolvedValue(undefined)]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(a.mock.calls.length).toBe(1)
  })
  it('should call ab subscriber when publishing top down', async () => {
    const ab = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D:E'] = [vi.fn().mockResolvedValue(undefined)]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(ab.mock.calls.length).toBe(1)
  })
  it('should call abc subscriber when publishing top down', async () => {
    const abc = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D:E'] = [vi.fn().mockResolvedValue(undefined)]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abc.mock.calls.length).toBe(1)
  })
  it('should call abcd subscriber when publishing top down', async () => {
    const abcd = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [vi.fn().mockResolvedValue(undefined)]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abcd.mock.calls.length).toBe(1)
  })
  it('should call abcde subscriber when publishing top down', async () => {
    const abcde = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D'] = [vi.fn().mockResolvedValue(undefined)]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect(abcde.mock.calls.length).toBe(1)
  })
  it('should publish ab after a in hierarchy top down', async () => {
    const a = vi.fn().mockResolvedValue(undefined)
    const ab = vi.fn().mockResolvedValue(undefined)
    const abc = vi.fn().mockResolvedValue(undefined)
    const abcd = vi.fn().mockResolvedValue(undefined)
    const abcde = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect((ab.mock.invocationCallOrder[0] ?? 0) > (a.mock.invocationCallOrder[0] ?? 0)).toBe(true)
  })
  it('should publish abc after ab in hierarchy top down', async () => {
    const a = vi.fn().mockResolvedValue(undefined)
    const ab = vi.fn().mockResolvedValue(undefined)
    const abc = vi.fn().mockResolvedValue(undefined)
    const abcd = vi.fn().mockResolvedValue(undefined)
    const abcde = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect((abc.mock.invocationCallOrder[0] ?? 0) > (ab.mock.invocationCallOrder[0] ?? 0)).toBe(true)
  })
  it('should publish abcd after abc in hierarchy top down', async () => {
    const a = vi.fn().mockResolvedValue(undefined)
    const ab = vi.fn().mockResolvedValue(undefined)
    const abc = vi.fn().mockResolvedValue(undefined)
    const abcd = vi.fn().mockResolvedValue(undefined)
    const abcde = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect((abcd.mock.invocationCallOrder[0] ?? 0) > (abc.mock.invocationCallOrder[0] ?? 0)).toBe(true)
  })
  it('should publish abcde after abcd in hierarchy top down', async () => {
    const a = vi.fn().mockResolvedValue(undefined)
    const ab = vi.fn().mockResolvedValue(undefined)
    const abc = vi.fn().mockResolvedValue(undefined)
    const abcd = vi.fn().mockResolvedValue(undefined)
    const abcde = vi.fn().mockResolvedValue(undefined)
    PubSub.subscribers['_:A'] = [a]
    PubSub.subscribers['_:A:B'] = [ab]
    PubSub.subscribers['_:A:B:C'] = [abc]
    PubSub.subscribers['_:A:B:C:D'] = [abcd]
    PubSub.subscribers['_:A:B:C:D:E'] = [abcde]
    await Internals.publishAsync('_:a:b:c:d:e', 'FOO')
    expect((abcde.mock.invocationCallOrder[0] ?? 0) > (abcd.mock.invocationCallOrder[0] ?? 0)).toBe(true)
  })
  it('should still call all subscribers when one rejects', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscriber.mockRejectedValue('foo rejects!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.mock.calls.length).toBe(1)
    for (const sub of PubSub.subscribers['FOO:BAR']) {
      expect(cast<MockInstance>(sub).mock.calls.length).toBe(1)
    }
  })
  it('should log error once when one subscriber rejects', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscriber.mockRejectedValue('foo rejects!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.mock.calls.length).toBe(1)
  })
  it('should log expected message when one subscriber rejects', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscriber.mockRejectedValue('foo rejects!')
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.mock.calls[0]?.[0]).toBe('Subscriber for FOO:BAR rejected with error:')
  })
  it('should still call all subscribers when one throws', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscriber.mockImplementation(() => {
      throw cast<Error>('foo throws!')
    })
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(subscriber.mock.calls.length).toBe(1)
    for (const sub of PubSub.subscribers['FOO:BAR']) {
      expect(cast<MockInstance>(sub).mock.calls.length).toBe(1)
    }
  })
  it('should log error once when one subscriber throws', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscriber.mockImplementation(() => {
      throw cast<Error>('foo throws!')
    })
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.mock.calls.length).toBe(1)
  })
  it('should log expected message when one subscriber throws', async () => {
    assert(PubSub.subscribers['FOO:BAR'] !== undefined)
    for (let i = 1; i <= 10; i += 1) {
      PubSub.subscribers['FOO:BAR'].push(vi.fn().mockResolvedValue(undefined))
    }
    subscriber.mockImplementation(() => {
      throw cast<Error>('foo throws!')
    })
    await Internals.publishAsync('Foo:bar', 'Digital Life')
    expect(consoleError.mock.calls[0]?.[0]).toBe('Subscriber for FOO:BAR rejected with error:')
  })
})
