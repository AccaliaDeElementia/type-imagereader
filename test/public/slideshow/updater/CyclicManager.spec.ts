'use sanity'

import { describe, beforeEach, afterEach, it } from 'mocha'
import { CyclicManager, CyclicUpdater } from '../../../../public/scripts/slideshow/updater'
import { Cast } from '../../../testutils/TypeGuards'
import Sinon from 'sinon'
import { expect } from 'chai'
import { assert } from 'node:console'

describe('public/slideshow/updater class CyclicManager', () => {
  let fakeSetInterval: Sinon.SinonStub | undefined = undefined
  let fakeClearInterval: Sinon.SinonStub | undefined = undefined
  beforeEach(() => {
    CyclicManager.__updaters = []
    CyclicManager.__timer = undefined
    fakeSetInterval = Sinon.stub(global, 'setInterval')
    fakeSetInterval.returns(1)
    fakeClearInterval = Sinon.stub(global, 'clearInterval')
  })
  afterEach(() => {
    fakeSetInterval?.restore()
    fakeClearInterval?.restore()
  })
  after(() => {
    Sinon.restore()
  })
  describe('__triggerUpdaters()', () => {
    it('should handle updating zero updaters', async () => {
      await CyclicManager.__triggerUpdaters(10)
      assert(true, 'previous call should resolve successfully')
    })
    it('should trigger one updaters', async () => {
      const updater = new CyclicUpdater()
      const spy = Sinon.stub(updater, 'trigger').resolves()
      CyclicManager.__updaters = [updater]
      await CyclicManager.__triggerUpdaters(10)
      expect(spy.callCount).to.equal(1)
    })
    it('should trigger many updaters', async () => {
      const updater = new CyclicUpdater()
      const spy = Sinon.stub(updater, 'trigger').resolves()
      CyclicManager.__updaters = Cast<CyclicUpdater[]>(Array.from({ length: 10 }).fill(updater))
      await CyclicManager.__triggerUpdaters(10)
      expect(spy.callCount).to.equal(10)
    })
    it('should trigger with provided interval', async () => {
      const interval = Math.round(Math.random() * 1e9)
      const updater = new CyclicUpdater()
      const spy = Sinon.stub(updater, 'trigger').resolves()
      CyclicManager.__updaters = [updater]
      await CyclicManager.__triggerUpdaters(interval)
      expect(spy.firstCall.args).to.deep.equal([interval])
    })
    it('should tolerate updater rejecting', async () => {
      const updater = new CyclicUpdater()
      const spy = Sinon.stub(updater, 'trigger').resolves()
      spy.onThirdCall().rejects(new Error('This is a rejection error!'))
      CyclicManager.__updaters = Cast<CyclicUpdater[]>(Array.from({ length: 10 }).fill(updater))
      await CyclicManager.__triggerUpdaters(10)
      expect(spy.callCount).to.equal(10)
    })
    it('should tolerate updater throwing', async () => {
      const updater = new CyclicUpdater()
      const spy = Sinon.stub(updater, 'trigger').resolves()
      spy.onThirdCall().throws(new Error('This is a rejection error!'))
      CyclicManager.__updaters = Cast<CyclicUpdater[]>(Array.from({ length: 10 }).fill(updater))
      await CyclicManager.__triggerUpdaters(10)
      expect(spy.callCount).to.equal(10)
    })
  })
  describe('Add()', () => {
    const makeUpdater = (): CyclicUpdater => new CyclicUpdater()
    it('should add single updater to internal list', () => {
      const updater = new CyclicUpdater()
      CyclicManager.Add(updater)
      expect(CyclicManager.__updaters).to.have.length(1)
      expect(CyclicManager.__updaters[0]).to.equal(updater)
    })
    it('should append single updater to internal list', () => {
      CyclicManager.__updaters.push(new CyclicUpdater())
      const updater = new CyclicUpdater()
      CyclicManager.Add(updater)
      expect(CyclicManager.__updaters).to.have.length(2)
      expect(CyclicManager.__updaters[1]).to.equal(updater)
    })
    it('should add spread multiple __updaters to internal list', () => {
      const updaters = Array.from({ length: 5 }).map(makeUpdater)
      CyclicManager.Add(...updaters)
      expect(CyclicManager.__updaters).to.have.length(5)
      for (let i = 0; i < updaters.length; i++) {
        expect(CyclicManager.__updaters[i]).to.equal(updaters[i])
      }
    })
    it('should append spread multiple __updaters to internal list', () => {
      CyclicManager.__updaters = Array.from({ length: 5 }).map(makeUpdater)
      const updaters = Array.from({ length: 5 }).map(makeUpdater)
      CyclicManager.Add(...updaters)
      expect(CyclicManager.__updaters).to.have.length(10)
      for (let i = 0; i < updaters.length; i++) {
        expect(CyclicManager.__updaters[i + 5]).to.equal(updaters[i])
      }
    })
  })
  describe('Start()', () => {
    let fakeTrigger: Sinon.SinonStub | undefined = undefined
    beforeEach(() => {
      fakeTrigger = Sinon.stub(CyclicManager, '__triggerUpdaters').resolves()
    })
    afterEach(() => {
      fakeTrigger?.restore()
    })
    it('should set interval on call', () => {
      expect(fakeSetInterval?.callCount).to.equal(0)
      CyclicManager.Start(1000)
      expect(fakeSetInterval?.callCount).to.equal(1)
    })
    it('should set interval with provided interval', () => {
      const ival = Math.round(Math.random() * 1e9)
      CyclicManager.Start(ival)
      expect(fakeSetInterval?.firstCall.args[1]).to.equal(ival)
    })
    it('should save interval value from setInterval', () => {
      const timer = Math.round(Math.random() * 1e9)
      fakeSetInterval?.returns(timer)
      CyclicManager.Start(1000)
      expect(CyclicManager.__timer).to.equal(timer)
    })
    it('should trigger updaters when interval fires', () => {
      CyclicManager.Start(1000)
      const fn = Cast<() => void>(fakeSetInterval?.firstCall.args[0])
      expect(fakeTrigger?.callCount).to.equal(0)
      fn()
      expect(fakeTrigger?.callCount).to.equal(1)
    })
    it('should trigger updaters with provided interval', () => {
      const ival = Math.round(Math.random() * 1e9)
      CyclicManager.Start(ival)
      const fn = Cast<() => void>(fakeSetInterval?.firstCall.args[0])
      fn()
      expect(fakeTrigger?.firstCall.args).to.deep.equal([ival])
    })
    it('should tolerate trigger rejecting', async () => {
      let a = Promise.resolve()
      fakeTrigger?.callsFake(async () => {
        a = Promise.resolve()
        return await Promise.reject(new Error('this should get swallowed!'))
      })
      CyclicManager.Start(1000)
      const fn = Cast<() => void>(fakeSetInterval?.firstCall.args[0])
      fn()
      await a
      assert(true, 'the error should have been thrown aweay and not treated as uncaught error')
    })
  })
  describe('Stop()', () => {
    it('should not clear interval without starting', () => {
      CyclicManager.__timer = undefined
      CyclicManager.Stop()
      expect(fakeClearInterval?.callCount).to.equal(0)
    })
    it('should clear interval when timer set', () => {
      CyclicManager.__timer = 1
      CyclicManager.Stop()
      expect(fakeClearInterval?.callCount).to.equal(1)
    })
    it('should clear saved timer when stopping', () => {
      const timer = Math.round(Math.random() * 1e9)
      CyclicManager.__timer = timer
      CyclicManager.Stop()
      expect(fakeClearInterval?.firstCall.args).to.deep.equal([timer])
    })
    it('should erase saved timer when stopping', () => {
      const timer = Math.round(Math.random() * 1e9)
      CyclicManager.__timer = timer
      CyclicManager.Stop()
      expect(CyclicManager.__timer).to.equal(undefined)
    })
  })
})
