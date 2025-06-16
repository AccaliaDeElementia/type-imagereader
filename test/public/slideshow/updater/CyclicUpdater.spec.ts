'use sanity'

import { beforeEach, afterEach, before, after, describe } from 'mocha'
import { CyclicUpdater, defaultUpdateFn } from '../../../../public/scripts/slideshow/updater'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import Sinon from 'sinon'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/slideshow/updater class CyclicUpdater', () => {
  it('should set default update function when fn undefined', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test.updateFn).to.equal(defaultUpdateFn)
  })
  it('should set proviced update function', () => {
    const fn = Sinon.stub().resolves()
    const test = new CyclicUpdater(fn, undefined)
    expect(test.updateFn).to.equal(fn)
  })
  it('should set default period when cycle period zero', () => {
    const test = new CyclicUpdater(undefined, 0)
    expect(test.period).to.equal(60000)
  })
  it('should set default period when cycle period negative', () => {
    const test = new CyclicUpdater(undefined, -1)
    expect(test.period).to.equal(60000)
  })
  it('should set default period when cycle period undefined', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test.period).to.equal(60000)
  })
  it('should set provided valid period', () => {
    const test = new CyclicUpdater(undefined, 79)
    expect(test.period).to.equal(79)
  })
  it('should start with a ready to trigger countdown', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test._countdown).to.equal(-1)
  })
  it('should construct with no fails recorded', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test._failCount).to.equal(0)
  })
  it('should construct with reasonable maxfails', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test._maxFails).to.equal(10)
  })
  describe('this.trigger()', () => {
    const existingWindow = Cast<Window & typeof globalThis>(global.window)
    const existingDocument = global.document
    const dom = new JSDOM('', {})
    let errorStub = Sinon.stub()
    const updateFn = Sinon.stub().resolves()
    const updater = new CyclicUpdater(updateFn, undefined)
    before(() => {
      global.window = Cast<Window & typeof globalThis>(dom.window)
      Object.defineProperty(global, 'document', {
        configurable: true,
        get: () => dom.window.document,
      })
    })
    after(() => {
      global.window = existingWindow
      Object.defineProperty(global, 'document', {
        configurable: true,
        get: () => existingDocument,
      })
      Sinon.restore()
    })
    beforeEach(() => {
      updateFn.reset()
      updateFn.resolves()
      updater.period = 60000
      updater._countdown = 6000
      updater._failCount = 0
      errorStub = Sinon.stub(global.window.console, 'error')
    })
    afterEach(() => {
      errorStub.restore()
    })
    it('should decrement countdown on call', async () => {
      await updater.trigger(200)
      expect(updateFn.callCount).to.equal(0)
      expect(updater._countdown).to.equal(5800)
    })
    it('should set countdown to infinite while waiting for updater to run', async () => {
      const waiter = updater.trigger(200000)
      expect(updater._countdown).to.equal(Infinity)
      await waiter
    })
    it('should set call update function when triggered', async () => {
      const waiter = updater.trigger(200000)
      expect(updateFn.callCount).to.equal(1)
      await waiter
    })
    it('should set call update function for overdue updater', async () => {
      updater._countdown = -9
      const waiter = updater.trigger(0)
      expect(updateFn.callCount).to.equal(1)
      await waiter
    })
    it('should set set countdown to base period on update success', async () => {
      updater._countdown = -9
      updater.period = 65535
      await updater.trigger(0)
      expect(updater._countdown).to.equal(65535)
    })
    it('should set reset failCount on update success', async () => {
      updater._countdown = -9
      updater._failCount = 65535
      await updater.trigger(0)
      expect(updater._failCount).to.equal(0)
    })
    it('should not log anything when update not yet due', async () => {
      updater._countdown = 65535
      await updater.trigger(0)
      expect(errorStub.callCount).to.equal(0)
    })
    it('should not log anything when update succeeds', async () => {
      updater._countdown = -9
      await updater.trigger(0)
      expect(errorStub.callCount).to.equal(0)
    })
    it('should log error when update fails', async () => {
      updater._countdown = -9
      const err = new Error('FOO')
      updateFn.rejects(err)
      await updater.trigger(0)
      expect(errorStub.callCount).to.equal(1)
      expect(errorStub.firstCall.args).to.deep.equal(['CyclicUpdater update resulted in error:', err])
    })
    it('should increase failCount when update fails', async () => {
      updater._countdown = -9
      updater._failCount = 0
      updateFn.rejects(new Error('FOO'))
      await updater.trigger(0)
      expect(updater._failCount).to.equal(1)
    })
    it('should increase failCount up to maximum when update fails', async () => {
      updater._countdown = -9
      updater._failCount = 9
      updateFn.rejects(new Error('FOO'))
      await updater.trigger(0)
      expect(updater._failCount).to.equal(10)
    })
    it('should cap failCount to maxFails when update fails', async () => {
      updater._countdown = -9
      updater._failCount = 100
      updater._maxFails = 50
      updateFn.rejects(new Error('FOO'))
      await updater.trigger(0)
      expect(updater._failCount).to.equal(50)
    })
    it('should exponentially decay countdown when update fails', async () => {
      updateFn.rejects(new Error('FOO'))
      updater.period = 10
      for (let i = 0; i < 5; i++) {
        updater._countdown = -1
        updater._failCount = i
        await updater.trigger(0)
        expect(updater._countdown).to.equal(10 * Math.pow(2, i + 1))
      }
    })
  })
})
