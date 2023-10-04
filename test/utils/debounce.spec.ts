'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { Debouncer } from '../../utils/debounce'

@suite
export class DebouncerTests extends Debouncer {
  clock: sinon.SinonFakeTimers
  constructor () {
    super()
    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })
  }

  before () {
    Debouncer.debouncers = []
    this.clock.restore()
    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })
  }

  after () {
    Debouncer.timer = undefined
    this.clock.restore()
  }

  @test
  'static startTimer() starts the timers' () {
    expect(this.clock.countTimers()).to.equal(0)
    Debouncer.startTimers()
    expect(this.clock.countTimers()).to.equal(1)
  }

  @test
  'static startTimer() starts the timers once' () {
    expect(this.clock.countTimers()).to.equal(0)
    Debouncer.startTimers()
    Debouncer.startTimers()
    expect(this.clock.countTimers()).to.equal(1)
  }

  @test
  'static stopTimer() stops the timers' () {
    Debouncer.startTimers()
    expect(this.clock.countTimers()).to.equal(1)
    Debouncer.stopTimers()
    expect(this.clock.countTimers()).to.equal(0)
  }

  @test
  'static stopTimer() allows multiple stops' () {
    expect(this.clock.countTimers()).to.equal(0)
    Debouncer.stopTimers()
    expect(this.clock.countTimers()).to.equal(0)
  }

  @test
  'static interval fires timers periodically' () {
    Debouncer.startTimers()
    const object = Debouncer.create(200) as DebouncerTests
    object.debounce('foobar', () => Promise.resolve())
    expect(object.counters[0]?.counter).to.equal(2)
    this.clock.tick(50)
    expect(object.counters[0]?.counter, 'timer fired early!').to.equal(2)
    this.clock.tick(50)
    expect(object.counters[0]?.counter, 'timer fired late!').to.equal(1)
  }

  @test
  'protected static getDebouncers gets the underlying debounce array' () {
    expect(Debouncer.getDebouncers()).to.equal(Debouncer.debouncers)
  }

  @test
  'create() creates Debouncer' () {
    const object = Debouncer.create(0)
    expect(object).to.be.instanceOf(Debouncer)
  }

  @test
  'create() creates Debouncer with default duration' () {
    const object = Debouncer.create() as DebouncerTests
    expect(object).to.be.instanceOf(Debouncer)
    expect(object.cycleCount).to.equal(1)
  }

  @test
  'create() adds Debouncer to bouncer list' () {
    expect(Debouncer.debouncers).to.have.length(0)
    const object = Debouncer.create(0)
    expect(Debouncer.debouncers).to.have.length(1)
    expect(Debouncer.debouncers).to.deep.equal([object])
  }

  @test
  'remove() clears Debouncer from bouncer list' () {
    const object = Debouncer.create(0)
    Debouncer.remove(object)
    expect(Debouncer.debouncers).to.not.include(object)
  }

  @test
  'doCycle() decrements pending debouncers' () {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', () => Promise.resolve())
    expect(object.counters[0]?.counter).to.equal(5)
    DebouncerTests.doCycle()
    expect(object.counters[0]?.counter).to.equal(4)
  }

  @test
  'doCycle() does not fire pending debouncers' () {
    const object = Debouncer.create(500) as DebouncerTests
    let fired = false
    object.debounce('foobar', () => {
      fired = true
      return Promise.resolve()
    })
    expect(fired).to.equal(false)
    DebouncerTests.doCycle()
    expect(fired).to.equal(false)
  }

  @test
  'doCycle() fires due debouncers' () {
    const object = Debouncer.create(500) as DebouncerTests
    let fired = false
    object.debounce('foobar', () => {
      fired = true
      return Promise.resolve()
    })

    const counter = object.counters[0]
    expect(counter).to.not.equal(undefined)
    if (counter) {
      counter.counter = 0
    }

    expect(fired).to.equal(false)
    DebouncerTests.doCycle()
    expect(fired).to.equal(true)
  }

  @test
  'doCycle() removes due debouncers' () {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', () => Promise.resolve())

    const counter = object.counters[0]
    expect(counter).to.not.equal(undefined)
    if (counter) {
      counter.counter = 0
    }

    expect(object.counters).to.have.length(1)
    DebouncerTests.doCycle()
    expect(object.counters).to.have.length(0)
  }

  @test
  'doCycle() handles due debouncers that reject' () {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', () => Promise.reject(new Error('OOOGA BOOGA!')))

    const counter = object.counters[0]
    expect(counter).to.not.equal(undefined)
    if (counter) {
      counter.counter = 0
    }

    expect(() => DebouncerTests.doCycle()).to.not.Throw()
  }

  @test
  'doCycle() does not fire expired debouncers' () {
    const object = Debouncer.create(500) as DebouncerTests
    let fired = false
    object.debounce('foobar', () => {
      fired = true
      return Promise.resolve()
    })

    const counter = object.counters[0]
    expect(counter).to.not.equal(undefined)
    if (counter) {
      counter.counter = -10
    }

    expect(fired).to.equal(false)
    DebouncerTests.doCycle()
    expect(fired).to.equal(false)
  }

  @test
  'doCycle() removes expired debouncers' () {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', () => Promise.resolve())

    const counter = object.counters[0]
    expect(counter).to.not.equal(undefined)
    if (counter) {
      counter.counter = -10
    }

    expect(object.counters).to.have.length(1)
    DebouncerTests.doCycle()
    expect(object.counters).to.have.length(0)
  }

  @test
  'constructor sets cycleCount' () {
    const object = Debouncer.create(200) as DebouncerTests
    expect(object.cycleCount).to.equal(2)
  }

  @test
  'constructor sets cycleCount, rounding up' () {
    const object = Debouncer.create(150) as DebouncerTests
    expect(object.cycleCount).to.equal(2)
  }

  @test
  'constructor sets cycleCount, not negative' () {
    const object = Debouncer.create(-100) as DebouncerTests
    expect(object.cycleCount).to.equal(1)
  }

  @test
  'constructor sets cycleCount, minimum one' () {
    const object = Debouncer.create(0) as DebouncerTests
    expect(object.cycleCount).to.equal(1)
  }

  @test
  'debounce() adds to counters' () {
    const key = `${Math.random()}`
    const fn = () => Promise.resolve()

    const object = Debouncer.create(500) as DebouncerTests
    expect(object.counters).to.have.length(0)

    object.debounce(key, fn)

    expect(object.counters).to.have.length(1)
    expect(object.counters[0]?.key).to.equal(key)
    expect(object.counters[0]?.counter).to.equal(5)
    expect(object.counters[0]?.callback).to.equal(fn)
  }

  @test
  'debounce() replaces existing callback when debouncing' () {
    const key = `${Math.random()}`
    const replaced = () => Promise.resolve()
    const fn = () => Promise.resolve()

    const object = Debouncer.create(500) as DebouncerTests
    object.debounce(key, replaced)
    expect(object.counters).to.have.length(1)

    object.debounce(key, fn)

    expect(object.counters).to.have.length(1)
    expect(object.counters[0]?.key).to.equal(key)
    expect(object.counters[0]?.counter).to.equal(5)
    expect(object.counters[0]?.callback).to.equal(fn)
  }

  @test
  'debounce() resets countdown when debouncing' () {
    const key = `${Math.random()}`
    const replaced = () => Promise.resolve()
    const fn = () => Promise.resolve()

    const object = Debouncer.create(500) as DebouncerTests
    object.debounce(key, replaced)
    const counter = object.counters[0]
    expect(counter).to.not.equal(undefined)
    if (counter) {
      counter.counter = 1
    }

    object.debounce(key, fn)

    expect(object.counters).to.have.length(1)
    expect(object.counters[0]?.key).to.equal(key)
    expect(object.counters[0]?.counter).to.equal(5)
  }
}
