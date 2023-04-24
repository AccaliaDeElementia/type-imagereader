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

class BaseAppPubSubTests extends PubSub {
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

    PubSub.cycleTime = 10
    PubSub.subscribers = {}
    PubSub.deferred = []
    for (const key of Object.keys(PubSub.intervals)) {
      delete PubSub.intervals[key]
    }
  }

  after (): void {
    global.window = this.existingWindow
    global.document = this.existingDocument

    if (PubSub.timer) {
      clearInterval(PubSub.timer)
      PubSub.timer = undefined
    }
    this.clock.restore()
  }
}

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
    for (const key of Object.keys(PubSub.intervals)) {
      delete PubSub.intervals[key]
    }
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
      [5, 1],
      [10, 1],
      [11, 2],
      [21, 3],
      [31, 4]
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
    const spy = sinon.stub()
    PubSub.Defer(spy, 50)
    const deferred = PubSub.deferred[0]
    expect(deferred?.delayCycles).to.equal(5)
    PubSub.ExecuteInterval()
    expect(deferred?.delayCycles).to.equal(4)
    PubSub.ExecuteInterval()
    expect(deferred?.delayCycles).to.equal(3)
    PubSub.ExecuteInterval()
    expect(deferred?.delayCycles).to.equal(2)
    PubSub.ExecuteInterval()
    expect(deferred?.delayCycles).to.equal(1)
    expect(spy.called).to.equal(false)
  }

  @test
  'Defer trigger fires overdue defer and removes' () {
    const spy = sinon.stub()
    PubSub.Defer(spy, 500)
    const deferred = PubSub.deferred[0] || { delayCycles: 0 }
    deferred.delayCycles = -1
    PubSub.ExecuteInterval()
    expect(spy.called).to.equal(true)
    expect(PubSub.deferred).to.not.contain(spy)
  }

  @test
  'Defer trigger fires due defer and removes' () {
    const spy = sinon.stub()
    PubSub.Defer(spy, 500)
    const deferred = PubSub.deferred[0] || { delayCycles: 0 }
    deferred.delayCycles = 0
    PubSub.ExecuteInterval()
    expect(spy.called).to.equal(true)
    expect(PubSub.deferred).to.not.contain(spy)
  }

  @test
  'Defer trigger fires interval that is due' () {
    const spy = sinon.stub()
    const testInterval = {
      method: spy,
      delayCycles: 0,
      intervalCycles: 5
    }
    PubSub.intervals['FOO IS FOO'] = testInterval
    PubSub.ExecuteInterval()
    expect(spy.called).to.equal(true)
    expect(testInterval.delayCycles).to.equal(5)
  }

  @test
  'Defer trigger fires interval that is overdue' () {
    const spy = sinon.stub()
    const testInterval = {
      method: spy,
      delayCycles: -5,
      intervalCycles: 5
    }
    PubSub.intervals['FOO IS FOO'] = testInterval
    PubSub.ExecuteInterval()
    expect(spy.called).to.equal(true)
    expect(testInterval.delayCycles).to.equal(5)
  }

  @test
  'Defer trigger decrements interval timer' () {
    const spy = sinon.stub()
    const testInterval = {
      method: spy,
      delayCycles: 5,
      intervalCycles: 5
    }
    PubSub.intervals['FOO IS FOO'] = testInterval
    PubSub.ExecuteInterval()
    expect(spy.called).to.equal(false)
    expect(testInterval.delayCycles).to.equal(4)
  }
}

@suite
export class PubSubAddIntervalTests extends BaseAppPubSubTests {
  @test
  'Adds interval to map' () {
    expect(PubSub.intervals['Test Interval']).to.equal(undefined)
    PubSub.AddInterval('Test Interval', () => {}, 100)
    expect(PubSub.intervals['Test Interval']).to.not.equal(undefined)
  }

  @test
  'Stores function in interval object' () {
    const expected = () => {}
    PubSub.AddInterval('Test Interval', expected, 100)
    expect(PubSub.intervals['Test Interval']?.method).to.equal(expected)
  }

  @test
  'adds function with delay of zero' () {
    PubSub.AddInterval('Test Interval', () => {}, 100)
    expect(PubSub.intervals['Test Interval']?.delayCycles).to.equal(0)
  }

  @test
  'adds function with specified ineterval' () {
    PubSub.cycleTime = 30
    PubSub.AddInterval('Test Interval', () => {}, 100)
    expect(PubSub.intervals['Test Interval']?.intervalCycles).to.equal(4)
  }

  @test
  'Second add overwrites first' () {
    const expected = () => {}
    PubSub.AddInterval('Test Interval', () => {}, 150)
    PubSub.AddInterval('Test Interval', expected, 100)
    expect(PubSub.intervals['Test Interval']?.method).to.equal(expected)
    expect(PubSub.intervals['Test Interval']?.intervalCycles).to.equal(10)
  }
}

@suite
export class PubSubRemoveIntervalTests extends BaseAppPubSubTests {
  @test
  'Removes interval from map' () {
    PubSub.intervals['Test Interval'] = {
      method: () => {},
      delayCycles: 0,
      intervalCycles: 0
    }
    PubSub.RemoveInterval('Test Interval')
    expect(PubSub.intervals['Test Interval']).to.equal(undefined)
  }

  @test
  'Can remove non existing interval from map' () {
    expect(() => PubSub.RemoveInterval('Test Interval')).to.not.throw()
  }
}

@suite
export class PubSubStartDeferredAddsTimer extends BaseAppPubSubTests {
  @test
  'Removes interval from map' () {
    expect(PubSub.timer).that.equal(undefined)
    PubSub.StartDeferred()
    expect(PubSub.timer).to.not.equal(undefined)
  }
}

@suite
export class PubSubStartDeferred extends BaseAppPubSubTests {
  setIntervalStub: sinon.SinonStub = sinon.stub()
  baseCycleTime = PubSub.cycleTime
  before (): void {
    super.before()
    this.setIntervalStub = sinon.stub(global, 'setInterval')
    PubSub.cycleTime = this.baseCycleTime
  }

  after (): void {
    this.setIntervalStub.restore()
    PubSub.timer = undefined
    super.after()
  }

  @test
  'it should call setInterval to create interval' () {
    PubSub.StartDeferred()
    expect(this.setIntervalStub.called).to.equal(true)
  }

  @test
  'it should save timer id for later cancelation' () {
    const expected = Math.random() * 1000
    this.setIntervalStub.returns(expected)
    PubSub.StartDeferred()
    expect(PubSub.timer).to.equal(expected)
  }

  @test
  'it should call setInterval with configured interval' () {
    const expected = Math.random() * 1000
    PubSub.cycleTime = expected
    PubSub.StartDeferred()
    expect(this.setIntervalStub.firstCall.args[1]).to.equal(expected)
  }

  @test
  'it should call ExecuteInterval on firing interval' () {
    const spy = sinon.stub(PubSub, 'ExecuteInterval')
    try {
      PubSub.StartDeferred()
      this.setIntervalStub.firstCall.args[0]()
      expect(spy.called).to.equal(true)
    } finally {
      spy.restore()
    }
  }
}

@suite
export class PubSubStopDeferred extends BaseAppPubSubTests {
  clearIntervalStub: sinon.SinonStub = sinon.stub()
  baseCycleTime = PubSub.cycleTime
  before (): void {
    super.before()
    this.clearIntervalStub = sinon.stub(global, 'clearInterval')
  }

  after (): void {
    this.clearIntervalStub.restore()
    PubSub.timer = undefined
    super.after()
  }

  @test
  'it should not call clearInterval when no timer exists' () {
    PubSub.timer = undefined
    PubSub.StopDeferred()
    expect(this.clearIntervalStub.called).to.equal(false)
  }

  @test
  'it should call clearInterval to clear timer' () {
    const expected = Math.random() + 1000
    PubSub.timer = expected
    PubSub.StopDeferred()
    expect(this.clearIntervalStub.calledWith(expected)).to.equal(true)
  }

  @test
  'it should delete timer' () {
    PubSub.timer = Math.random() + 1000
    PubSub.StopDeferred()
    expect(PubSub.timer).to.equal(undefined)
  }
}
