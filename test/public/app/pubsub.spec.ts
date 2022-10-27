'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'

const markup = `
html
  body
`

@suite
export class AppPubSubTests extends PubSub {
  consoleWarn: sinon.SinonStub
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  clock: sinon.SinonFakeTimers
  constructor () {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('', {})

    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })

    this.consoleWarn = sinon.stub()
  }

  before (): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999'
    })
    this.existingWindow = global.window
    global.window = (this.dom.window as unknown) as Window & typeof globalThis
    this.existingDocument = global.document
    global.document = this.dom.window.document

    this.clock.restore()
    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })
    this.consoleWarn = sinon.stub(global.window.console, 'warn')

    PubSub.subscribers = {}
    PubSub.deferred = []
  }

  after (): void {
    global.window = this.existingWindow
    global.document = this.existingDocument

    PubSub.StopDeferred()
    this.clock.restore()
  }

  @test
  'Subscribe adds subscriber to list' () {
    const fn = sinon.stub()
    const key = 'FOOBAR'
    PubSub.Subscribe(key, fn)
    expect(PubSub.subscribers[key]).to.deep.equal([fn])
    expect(this.consoleWarn.called).to.equal(false)
  }

  @test
  'Subscribe appends subscriber to list' () {
    const fn = sinon.stub()
    const fn2 = sinon.stub()
    const key = 'FOOBAR'
    PubSub.subscribers[key] = [fn]
    PubSub.Subscribe(key, fn2)
    expect(PubSub.subscribers[key]).to.deep.equal([fn, fn2])
    expect(this.consoleWarn.called).to.equal(false)
  }

  @test
  'Publish Warns on publish with no subscribers' () {
    PubSub.Publish('Foo:Bar', 'Baz')
    expect(this.consoleWarn.callCount).to.equal(1)
    expect(this.consoleWarn.calledWithExactly('PUBSUB: topic Foo:Bar published without subscribers', 'Baz')).to.equal(true)
  }

  @test
  'Publish Warns on publish with no subscribers, but with subscribvers to child event' () {
    const spy = sinon.stub()
    PubSub.subscribers['Foo:Bar'] = [spy]
    PubSub.Publish('Foo', 'Baz')
    expect(this.consoleWarn.callCount).to.equal(1)
    expect(this.consoleWarn.calledWithExactly('PUBSUB: topic Foo published without subscribers', 'Baz')).to.equal(true)
    expect(spy.called).to.equal(false)
  }

  @test
  'Publish Warns on publish with registered topic but no subscribers' () {
    PubSub.subscribers['FOO:BAR'] = []
    PubSub.Publish('Foo:Bar', 'Baz')
    expect(this.consoleWarn.callCount).to.equal(1)
    expect(this.consoleWarn.calledWithExactly('PUBSUB: topic FOO:BAR registered without subscribers!')).to.equal(true)
  }

  @test
  'Publish publishes valid event' () {
    const spy = sinon.stub()
    const topic = `FOO:${Math.random()}`
    const data = Math.random()
    PubSub.subscribers[topic] = [spy]
    PubSub.Publish(topic, data)
    expect(spy.calledWithExactly(data, topic)).to.equal(true)
  }

  @test
  'Publish publishes all for valid event' () {
    const spy1 = sinon.stub()
    const spy2 = sinon.stub()
    const spy3 = sinon.stub()
    const topic = `FOO:${Math.random()}`
    const data = Math.random()
    PubSub.subscribers[topic] = [spy1, spy2, spy3]
    PubSub.Publish(topic, data)
    expect(spy1.calledWithExactly(data, topic)).to.equal(true)
    expect(spy2.calledWithExactly(data, topic)).to.equal(true)
    expect(spy3.calledWithExactly(data, topic)).to.equal(true)
    expect(spy1.calledBefore(spy2)).to.equal(true)
    expect(spy1.calledBefore(spy3)).to.equal(true)
    expect(spy2.calledBefore(spy3)).to.equal(true)
  }

  @test
  'Publish publishes hierarchy for valid event' () {
    const spy1 = sinon.stub()
    const spy2 = sinon.stub()
    const spy3 = sinon.stub()
    const data = Math.random()
    PubSub.subscribers.FOO = [spy1]
    PubSub.subscribers['FOO:BAR'] = [spy2]
    PubSub.subscribers['FOO:BAR:BAZ'] = [spy3]
    PubSub.Publish('FOO:BAR:BAZ', data)
    expect(spy1.calledWithExactly(data, 'FOO:BAR:BAZ')).to.equal(true)
    expect(spy2.calledWithExactly(data, 'FOO:BAR:BAZ')).to.equal(true)
    expect(spy3.calledWithExactly(data, 'FOO:BAR:BAZ')).to.equal(true)
    expect(spy1.calledBefore(spy2)).to.equal(true)
    expect(spy1.calledBefore(spy3)).to.equal(true)
    expect(spy2.calledBefore(spy3)).to.equal(true)
  }

  @test
  'Defer adds method to the list of defers' () {
    const spy = sinon.stub()
    PubSub.Defer(spy, 100)
    expect(PubSub.deferred).to.have.length(1)
    expect(PubSub.deferred[0]?.method).to.equal(spy)
  }

  @test
  'Defer enforces positive integer delay cycle count' () {
    const matrix: [number, number][] = [
      [-100, 1],
      [0, 1],
      [50, 1],
      [100, 1],
      [101, 2],
      [200, 2],
      [301, 4]
    ]
    for (const [delay, expected] of matrix) {
      PubSub.Defer(() => {}, delay)
      expect(PubSub.deferred.pop()?.delayCycles).to.equal(expected)
    }
  }

  @test
  'Defer does not fire immediately' () {
    const spy = sinon.stub()
    PubSub.Defer(spy, 500)
    expect(spy.called).to.equal(false)
  }

  @test
  'Defer trigger decrements remaining cycles' () {
    PubSub.StartDeferred()
    const spy = sinon.stub()
    PubSub.Defer(spy, 500)
    const deferred = PubSub.deferred[0]
    expect(deferred?.delayCycles).to.equal(5)
    this.clock.tick(100)
    expect(deferred?.delayCycles).to.equal(4)
    this.clock.tick(100)
    expect(deferred?.delayCycles).to.equal(3)
    this.clock.tick(100)
    expect(deferred?.delayCycles).to.equal(2)
    this.clock.tick(100)
    expect(deferred?.delayCycles).to.equal(1)
    expect(spy.called).to.equal(false)
  }

  @test
  'Defer trigger fires overdue defer and removes' () {
    PubSub.StartDeferred()
    const spy = sinon.stub()
    PubSub.Defer(spy, 500)
    const deferred = PubSub.deferred[0] || { delayCycles: 0 }
    deferred.delayCycles = -1
    this.clock.tick(100)
    expect(spy.called).to.equal(true)
    expect(PubSub.deferred).to.not.contain(spy)
  }

  @test
  'Defer trigger fires due defer and removes' () {
    PubSub.StartDeferred()
    const spy = sinon.stub()
    PubSub.Defer(spy, 500)
    const deferred = PubSub.deferred[0] || { delayCycles: 0 }
    deferred.delayCycles = 0
    this.clock.tick(100)
    expect(spy.called).to.equal(true)
    expect(PubSub.deferred).to.not.contain(spy)
  }
}
