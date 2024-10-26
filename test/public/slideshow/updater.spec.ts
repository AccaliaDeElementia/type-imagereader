'use sanity'

import { expect, use as ChaiUse } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { CyclicManager, CyclicUpdater } from '../../../public/scripts/slideshow/updater'

ChaiUse(chaiAsPromised)

const markup = `
html
  body
`

@suite
export class SlideshowUpdaterTests extends CyclicUpdater {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  clock: sinon.SinonFakeTimers
  updateSpy: sinon.SinonStub
  constructor () {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('', {})

    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })

    this.updateSpy = sinon.stub()
    this.updateFn = this.updateSpy
  }

  async before (): Promise<void> {
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

    this.updateSpy.reset()
    this.countdown = 1000
    this.failCount = 0
  }

  async after (): Promise<void> {
    global.window = this.existingWindow
    global.document = this.existingDocument

    this.clock.restore()
  }

  @test
  async 'triggering not yet due Cycler decrements countdown' () {
    this.countdown = 1000
    this.updateSpy.resolves()

    await this.trigger(100)

    expect(this.countdown).to.equal(900)
    expect(this.updateSpy.called).to.equal(false)
  }

  @test
  async 'triggering not yet due Cycler fires when trigger becomes due' () {
    this.countdown = 10
    this.updateSpy.resolves()

    await this.trigger(100)

    expect(this.countdown).to.equal(this.period)
    expect(this.updateSpy.called).to.equal(true)
  }

  @test
  async 'triggering overdue Cycler fires' () {
    this.countdown = -1000
    this.updateSpy.resolves()

    await this.trigger(100)

    expect(this.countdown).to.equal(this.period)
    expect(this.updateSpy.called).to.equal(true)
  }

  @test
  async 'Rejecting update triggers rollback of frequency' () {
    this.countdown = -1000
    this.updateSpy.rejects('MUY MALO!')

    const consoleSpy = sinon.stub(
      global.window.console,
      'error'
    )
    consoleSpy.returns()
    try {
      await this.trigger(100)

      expect(this.failCount).to.equal(1)
      expect(this.countdown).to.equal(2 * this.period)
      expect(this.updateSpy.called).to.equal(true)
      expect(consoleSpy.called).to.equal(true)
      expect(consoleSpy.calledWith('CyclicUpdater update resulted in error:')).to.equal(true)
    } finally {
      consoleSpy.restore()
    }
  }

  @test
  async 'Rejecting update triggers escalating rollback of frequency' () {
    this.countdown = -1000
    this.failCount = 4
    this.updateSpy.rejects('MUY MALO!')

    const consoleSpy = sinon.stub(
      global.window.console,
      'error'
    )
    consoleSpy.returns()
    try {
      await this.trigger(100)

      expect(this.failCount).to.equal(5)
      expect(this.countdown).to.equal(Math.pow(2, 5) * this.period)
      expect(this.updateSpy.called).to.equal(true)
      expect(consoleSpy.called).to.equal(true)
      expect(consoleSpy.calledWith('CyclicUpdater update resulted in error:')).to.equal(true)
    } finally {
      consoleSpy.restore()
    }
  }

  @test
  async 'Escalating rollback of frequency maxes out at 10 doublings' () {
    this.countdown = -1000
    this.failCount = 40
    this.updateSpy.rejects('MUY MALO!')

    const consoleSpy = sinon.stub(
      global.window.console,
      'error'
    )
    consoleSpy.returns()
    try {
      await this.trigger(100)

      expect(this.failCount).to.equal(10)
      expect(this.countdown).to.equal(Math.pow(2, 10) * this.period)
      expect(this.updateSpy.called).to.equal(true)
      expect(consoleSpy.called).to.equal(true)
      expect(consoleSpy.calledWith('CyclicUpdater update resulted in error:')).to.equal(true)
    } finally {
      consoleSpy.restore()
    }
  }

  @test
  async 'Default Updater rejects when triggered' () {
    const sadness = new CyclicUpdater()
    await expect(sadness.updateFn()).to.eventually.be.rejectedWith('Cyclic Updater Called with No Updater')
  }
}

@suite
export class SlideshowCyclicManagerTests extends CyclicManager {
  clock: sinon.SinonFakeTimers
  constructor () {
    super()
    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })
  }

  async before (): Promise<void> {
    this.clock.restore()
    this.clock = sinon.useFakeTimers({
      shouldClearNativeTimers: false
    })
    CyclicManager.updaters = []
  }

  async after (): Promise<void> {
    CyclicManager.Stop()
    this.clock.restore()
  }

  @test
  'Add appends to existing list' () {
    CyclicManager.updaters.push(
      ...Array.from({ length: 10 }).map(() => new CyclicUpdater())
    )
    expect(CyclicManager.updaters).to.have.length(10)
    CyclicManager.Add(...Array.from({ length: 10 }).map(() => new CyclicUpdater()))
    expect(CyclicManager.updaters).to.have.length(20)
  }

  @test
  'start sets timer going' () {
    const spy = sinon.stub()
    spy.resolves()
    const updater = new CyclicUpdater(spy, 10)
    CyclicManager.Add(updater)
    expect(CyclicManager.timer).to.equal(undefined)
    CyclicManager.Start(100)
    expect(CyclicManager.timer).to.not.equal(undefined)
  }

  @test
  'started timer triggers updaters' () {
    const spy = sinon.stub()
    spy.resolves()
    const updater = new CyclicUpdater(spy, 10)
    CyclicManager.Add(updater)
    CyclicManager.Start(100)
    this.clock.tick(100)
    expect(spy.called).to.equal(true)
  }

  @test
  'stop clears timer' () {
    const spy = sinon.stub()
    spy.resolves()
    const updater = new CyclicUpdater(spy, 10)
    CyclicManager.Add(updater)
    CyclicManager.Start(100)
    expect(CyclicManager.timer).to.not.equal(undefined)
    CyclicManager.Stop()
    this.clock.tick(100)
    expect(CyclicManager.timer).to.equal(undefined)
    expect(spy.called).to.equal(false)
  }
}
