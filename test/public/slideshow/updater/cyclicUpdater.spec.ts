'use sanity'

import { CyclicUpdater, Internals } from '#public/scripts/slideshow/updater.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import type { MockInstance } from 'vitest'
describe('public/slideshow/updater CyclicUpdater', () => {
  it('should set default update function when fn undefined', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test.updateFn).toBe(Internals.defaultUpdateFn)
  })
  it('should set proviced update function', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const test = new CyclicUpdater(fn, undefined)
    expect(test.updateFn).toBe(fn)
  })
  it('should set default period when cycle period zero', () => {
    const test = new CyclicUpdater(undefined, 0)
    expect(test.period).toBe(60000)
  })
  it('should set default period when cycle period negative', () => {
    const test = new CyclicUpdater(undefined, -1)
    expect(test.period).toBe(60000)
  })
  it('should set default period when cycle period undefined', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test.period).toBe(60000)
  })
  it('should set provided valid period', () => {
    const test = new CyclicUpdater(undefined, 79)
    expect(test.period).toBe(79)
  })
  it('should start with a ready to trigger countdown', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test._countdown).toBe(-1)
  })
  it('should construct with no fails recorded', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test._failCount).toBe(0)
  })
  it('should construct with reasonable maxfails', () => {
    const test = new CyclicUpdater(undefined, undefined)
    expect(test._maxFails).toBe(10)
  })
  describe('this.trigger()', () => {
    const dom = new JSDOM('', {})
    let errorStub: MockInstance = vi.fn()
    const updateFn = vi.fn().mockResolvedValue(undefined)
    const updater = new CyclicUpdater(updateFn, undefined)
    beforeAll(() => {
      mountDom(dom)
    })
    afterAll(() => {
      unmountDom()
      vi.restoreAllMocks()
    })
    beforeEach(() => {
      updateFn.mockClear()
      updateFn.mockResolvedValue(undefined)
      updater.period = 60000
      updater._countdown = 6000
      updater._failCount = 0
      errorStub = vi.spyOn(global.window.console, 'error').mockImplementation((..._args: unknown[]) => undefined)
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })
    it('should not call updateFn when countdown has not expired', async () => {
      await updater.trigger(200)
      expect(updateFn.mock.calls.length).toBe(0)
    })
    it('should decrement countdown on call', async () => {
      await updater.trigger(200)
      expect(updater._countdown).toBe(5800)
    })
    it('should set countdown to infinite while waiting for updater to run', async () => {
      const waiter = updater.trigger(200000)
      expect(updater._countdown).toBe(Infinity)
      await waiter
    })
    it('should set call update function when triggered', async () => {
      const waiter = updater.trigger(200000)
      expect(updateFn.mock.calls.length).toBe(1)
      await waiter
    })
    it('should set call update function for overdue updater', async () => {
      updater._countdown = -9
      const waiter = updater.trigger(0)
      expect(updateFn.mock.calls.length).toBe(1)
      await waiter
    })
    it('should set set countdown to base period on update success', async () => {
      updater._countdown = -9
      updater.period = 65535
      await updater.trigger(0)
      expect(updater._countdown).toBe(65535)
    })
    it('should set reset failCount on update success', async () => {
      updater._countdown = -9
      updater._failCount = 65535
      await updater.trigger(0)
      expect(updater._failCount).toBe(0)
    })
    it('should not log anything when update not yet due', async () => {
      updater._countdown = 65535
      await updater.trigger(0)
      expect(errorStub.mock.calls.length).toBe(0)
    })
    it('should not log anything when update succeeds', async () => {
      updater._countdown = -9
      await updater.trigger(0)
      expect(errorStub.mock.calls.length).toBe(0)
    })
    it('should log once when update fails', async () => {
      updater._countdown = -9
      updateFn.mockRejectedValue(new Error('FOO'))
      await updater.trigger(0)
      expect(errorStub.mock.calls.length).toBe(1)
    })
    it('should log the error with message when update fails', async () => {
      updater._countdown = -9
      const err = new Error('FOO')
      updateFn.mockRejectedValue(err)
      await updater.trigger(0)
      expect(errorStub.mock.calls[0]).toEqual(['CyclicUpdater update resulted in error:', err])
    })
    it('should increase failCount when update fails', async () => {
      updater._countdown = -9
      updater._failCount = 0
      updateFn.mockRejectedValue(new Error('FOO'))
      await updater.trigger(0)
      expect(updater._failCount).toBe(1)
    })
    it('should increase failCount up to maximum when update fails', async () => {
      updater._countdown = -9
      updater._failCount = 9
      updateFn.mockRejectedValue(new Error('FOO'))
      await updater.trigger(0)
      expect(updater._failCount).toBe(10)
    })
    it('should cap failCount to maxFails when update fails', async () => {
      updater._countdown = -9
      updater._failCount = 100
      updater._maxFails = 50
      updateFn.mockRejectedValue(new Error('FOO'))
      await updater.trigger(0)
      expect(updater._failCount).toBe(50)
    })
    const expectedDelays: Array<[number, number]> = [
      [0, 20],
      [1, 40],
      [2, 80],
      [3, 160],
      [4, 320],
      [5, 640],
    ]
    expectedDelays.forEach(([failCount, expectedDelay]) => {
      it(`should set countdown of ${expectedDelay} for failed trigger after ${failCount} prior fails`, async () => {
        updateFn.mockRejectedValue(new Error('FOO'))
        updater.period = 10
        updater._countdown = -1
        updater._failCount = failCount
        await updater.trigger(0)
        expect(updater._countdown).toBe(expectedDelay)
      })
    })
  })
})
