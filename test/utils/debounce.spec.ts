'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { Debouncer } from '../../utils/debounce'
import assert from 'assert'

@suite
export class DebouncerTests extends Debouncer {
  clock: sinon.SinonFakeTimers
  constructor () {
    super()
    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })
  }

  before (): void {
    Debouncer.debouncers = []
    this.clock.restore()
    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })
  }

  after (): void {
    Debouncer.timer = undefined
    this.clock.restore()
  }

  @test
  'static startTimer() starts the timers' (): void {
    expect(this.clock.countTimers()).to.equal(0)
    Debouncer.startTimers()
    expect(this.clock.countTimers()).to.equal(1)
  }

  @test
  'static startTimer() starts the timers once' (): void {
    expect(this.clock.countTimers()).to.equal(0)
    Debouncer.startTimers()
    Debouncer.startTimers()
    expect(this.clock.countTimers()).to.equal(1)
  }

  @test
  'static stopTimer() stops the timers' (): void {
    Debouncer.startTimers()
    expect(this.clock.countTimers()).to.equal(1)
    Debouncer.stopTimers()
    expect(this.clock.countTimers()).to.equal(0)
  }

  @test
  'static stopTimer() allows multiple stops' (): void {
    expect(this.clock.countTimers()).to.equal(0)
    Debouncer.stopTimers()
    expect(this.clock.countTimers()).to.equal(0)
  }

  @test
  'static interval fires timers periodically' (): void {
    Debouncer.startTimers()
    const object = Debouncer.create(200) as DebouncerTests
    object.debounce('foobar', async () => { await Promise.resolve() })
    expect(object.counters[0]?.counter).to.equal(2)
    this.clock.tick(50)
    expect(object.counters[0]?.counter, 'timer fired early!').to.equal(2)
    this.clock.tick(50)
    expect(object.counters[0]?.counter, 'timer fired late!').to.equal(1)
  }

  @test
  'protected static getDebouncers gets the underlying debounce array' (): void {
    expect(Debouncer.getDebouncers()).to.equal(Debouncer.debouncers)
  }

  @test
  'create() creates Debouncer' (): void {
    const object = Debouncer.create(0)
    expect(object).to.be.instanceOf(Debouncer)
  }

  @test
  'create() creates Debouncer with default duration' (): void {
    const object = Debouncer.create() as DebouncerTests
    expect(object).to.be.instanceOf(Debouncer)
    expect(object.cycleCount).to.equal(1)
  }

  @test
  'create() adds Debouncer to bouncer list' (): void {
    expect(Debouncer.debouncers).to.have.length(0)
    const object = Debouncer.create(0)
    expect(Debouncer.debouncers).to.have.length(1)
    expect(Debouncer.debouncers).to.deep.equal([object])
  }

  @test
  'remove() clears Debouncer from bouncer list' (): void {
    const object = Debouncer.create(0)
    Debouncer.remove(object)
    expect(Debouncer.debouncers).to.not.include(object)
  }

  @test
  'doCycle() decrements pending debouncers' (): void {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', async () => { await Promise.resolve() })
    expect(object.counters[0]?.counter).to.equal(5)
    DebouncerTests.doCycle()
    expect(object.counters[0]?.counter).to.equal(4)
  }

  @test
  'doCycle() does not fire pending debouncers' (): void {
    const object = Debouncer.create(500) as DebouncerTests
    let fired = false
    object.debounce('foobar', async () => {
      fired = true
      await Promise.resolve()
    })
    expect(fired).to.equal(false)
    DebouncerTests.doCycle()
    expect(fired).to.equal(false)
  }

  @test
  'doCycle() fires due debouncers' (): void {
    const object = Debouncer.create(500) as DebouncerTests
    let fired = false
    object.debounce('foobar', async () => {
      fired = true
      await Promise.resolve()
    })

    const counter = object.counters[0]
    assert(counter != null, 'counter must have a value')
    counter.counter = 0

    expect(fired).to.equal(false)
    DebouncerTests.doCycle()
    expect(fired).to.equal(true)
  }

  @test
  'doCycle() removes due debouncers' (): void {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', async () => { await Promise.resolve() })

    const counter = object.counters[0]
    assert(counter != null, 'counter must have a value')
    counter.counter = 0

    expect(object.counters).to.have.length(1)
    DebouncerTests.doCycle()
    expect(object.counters).to.have.length(0)
  }

  @test
  'doCycle() handles due debouncers that reject' (): void {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', async () => { await Promise.reject(new Error('OOOGA BOOGA!')) })

    const counter = object.counters[0]
    assert(counter != null, 'counter must have a value')
    counter.counter = 0

    expect(() => { DebouncerTests.doCycle() }).to.not.Throw()
  }

  @test
  'doCycle() does not fire expired debouncers' (): void {
    const object = Debouncer.create(500) as DebouncerTests
    let fired = false
    object.debounce('foobar', async () => {
      fired = true
      await Promise.resolve()
    })

    const counter = object.counters[0]
    assert(counter != null, 'counter must have a value')
    counter.counter = -10

    expect(fired).to.equal(false)
    DebouncerTests.doCycle()
    expect(fired).to.equal(false)
  }

  @test
  'doCycle() removes expired debouncers' (): void {
    const object = Debouncer.create(500) as DebouncerTests
    object.debounce('foobar', async () => { await Promise.resolve() })

    const counter = object.counters[0]
    assert(counter != null, 'counter must have a value')
    counter.counter = -10

    expect(object.counters).to.have.length(1)
    DebouncerTests.doCycle()
    expect(object.counters).to.have.length(0)
  }

  @test
  'constructor sets cycleCount' (): void {
    const object = Debouncer.create(200) as DebouncerTests
    expect(object.cycleCount).to.equal(2)
  }

  @test
  'constructor sets cycleCount, rounding up' (): void {
    const object = Debouncer.create(150) as DebouncerTests
    expect(object.cycleCount).to.equal(2)
  }

  @test
  'constructor sets cycleCount, not negative' (): void {
    const object = Debouncer.create(-100) as DebouncerTests
    expect(object.cycleCount).to.equal(1)
  }

  @test
  'constructor sets cycleCount, minimum one' (): void {
    const object = Debouncer.create(0) as DebouncerTests
    expect(object.cycleCount).to.equal(1)
  }

  @test
  'debounce() adds to counters' (): void {
    const key = `${Math.random()}`
    const fn = async (): Promise<void> => { await Promise.resolve() }

    const object = Debouncer.create(500) as DebouncerTests
    expect(object.counters).to.have.length(0)

    object.debounce(key, fn)

    expect(object.counters).to.have.length(1)
    expect(object.counters[0]?.key).to.equal(key)
    expect(object.counters[0]?.counter).to.equal(5)
    expect(object.counters[0]?.callback).to.equal(fn)
  }

  @test
  'debounce() replaces existing callback when debouncing' (): void {
    const key = `${Math.random()}`
    const replaced = async (): Promise<void> => { await Promise.resolve() }
    const fn = async (): Promise<void> => { await Promise.resolve() }

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
  'debounce() resets countdown when debouncing' (): void {
    const key = `${Math.random()}`
    const replaced = async (): Promise<void> => { await Promise.resolve() }
    const fn = async (): Promise<void> => { await Promise.resolve() }

    const object = Debouncer.create(500) as DebouncerTests
    object.debounce(key, replaced)
    const counter = object.counters[0]
    assert(counter != null, 'counter must have a value')
    counter.counter = 1

    object.debounce(key, fn)

    expect(object.counters).to.have.length(1)
    expect(object.counters[0]?.key).to.equal(key)
    expect(object.counters[0]?.counter).to.equal(5)
  }
}
