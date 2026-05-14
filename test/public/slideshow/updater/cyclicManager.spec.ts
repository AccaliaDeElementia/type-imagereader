'use sanity'

import { add, CyclicManager, CyclicUpdater, Internals, start, stop } from '#public/scripts/slideshow/updater.js'
import { cast } from '#testutils/typeGuards.js'
import { assert } from 'node:console'
import type { MockInstance } from 'vitest'

describe('public/slideshow/updater CyclicManager', () => {
  let fakeSetInterval: MockInstance | undefined = undefined
  let fakeClearInterval: MockInstance | undefined = undefined
  beforeEach(() => {
    CyclicManager.__updaters = []
    CyclicManager.__timer = undefined
    fakeSetInterval = vi.spyOn(global, 'setInterval').mockReturnValue(cast(1))
    fakeClearInterval = vi.spyOn(global, 'clearInterval').mockImplementation((..._args: unknown[]) => undefined)
  })
  describe('__triggerUpdaters()', () => {
    it('should handle updating zero updaters', async () => {
      await Internals.triggerUpdaters(10)
      assert(true, 'previous call should resolve successfully')
    })
    it('should trigger one updaters', async () => {
      const updater = new CyclicUpdater()
      const spy = vi.spyOn(updater, 'trigger').mockResolvedValue(undefined)
      CyclicManager.__updaters = [updater]
      await Internals.triggerUpdaters(10)
      expect(spy.mock.calls.length).toBe(1)
    })
    it('should trigger many updaters', async () => {
      const updater = new CyclicUpdater()
      const spy = vi.spyOn(updater, 'trigger').mockResolvedValue(undefined)
      CyclicManager.__updaters = cast<CyclicUpdater[]>(Array.from({ length: 10 }).fill(updater))
      await Internals.triggerUpdaters(10)
      expect(spy.mock.calls.length).toBe(10)
    })
    it('should trigger with provided interval', async () => {
      const interval = Math.round(Math.random() * 1e9)
      const updater = new CyclicUpdater()
      const spy = vi.spyOn(updater, 'trigger').mockResolvedValue(undefined)
      CyclicManager.__updaters = [updater]
      await Internals.triggerUpdaters(interval)
      expect(spy.mock.calls[0]).toEqual([interval])
    })
    it('should tolerate updater rejecting', async () => {
      const updater = new CyclicUpdater()
      const spy = vi.spyOn(updater, 'trigger').mockResolvedValue(undefined)
      spy.mockRejectedValueOnce(new Error('This is a rejection error!'))
      CyclicManager.__updaters = cast<CyclicUpdater[]>(Array.from({ length: 10 }).fill(updater))
      await Internals.triggerUpdaters(10)
      expect(spy.mock.calls.length).toBe(10)
    })
    it('should tolerate updater throwing', async () => {
      const updater = new CyclicUpdater()
      const spy = vi.spyOn(updater, 'trigger').mockResolvedValue(undefined)
      spy
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockImplementationOnce(() => {
          throw new Error('This is a rejection error!')
        })
      CyclicManager.__updaters = cast<CyclicUpdater[]>(Array.from({ length: 10 }).fill(updater))
      await Internals.triggerUpdaters(10)
      expect(spy.mock.calls.length).toBe(10)
    })
  })
  describe('add()', () => {
    const makeUpdater = (): CyclicUpdater => new CyclicUpdater()
    it('should increase list length to 1 when adding a single updater', () => {
      add(new CyclicUpdater())
      expect(CyclicManager.__updaters).toHaveLength(1)
    })
    it('should store the added updater at index 0', () => {
      const updater = new CyclicUpdater()
      add(updater)
      expect(CyclicManager.__updaters[0]).toBe(updater)
    })
    it('should increase list length to 2 when appending a single updater', () => {
      CyclicManager.__updaters.push(new CyclicUpdater())
      add(new CyclicUpdater())
      expect(CyclicManager.__updaters).toHaveLength(2)
    })
    it('should store the appended updater at index 1', () => {
      CyclicManager.__updaters.push(new CyclicUpdater())
      const updater = new CyclicUpdater()
      add(updater)
      expect(CyclicManager.__updaters[1]).toBe(updater)
    })
    it('should set list length to 5 when adding 5 spread updaters', () => {
      add(...Array.from({ length: 5 }).map(makeUpdater))
      expect(CyclicManager.__updaters).toHaveLength(5)
    })
    it('should store each of 5 spread updaters at its respective index', () => {
      const updaters = Array.from({ length: 5 }).map(makeUpdater)
      add(...updaters)
      for (let i = 0; i < updaters.length; i += 1) {
        expect(CyclicManager.__updaters[i]).toBe(updaters[i])
      }
    })
    it('should set list length to 10 when appending 5 spread updaters to existing 5', () => {
      CyclicManager.__updaters = Array.from({ length: 5 }).map(makeUpdater)
      add(...Array.from({ length: 5 }).map(makeUpdater))
      expect(CyclicManager.__updaters).toHaveLength(10)
    })
    it('should store each of the 5 appended updaters at indices 5-9', () => {
      CyclicManager.__updaters = Array.from({ length: 5 }).map(makeUpdater)
      const updaters = Array.from({ length: 5 }).map(makeUpdater)
      add(...updaters)
      for (let i = 0; i < updaters.length; i += 1) {
        expect(CyclicManager.__updaters[i + 5]).toBe(updaters[i])
      }
    })
  })
  describe('start()', () => {
    let fakeTrigger: MockInstance | undefined = undefined
    beforeEach(() => {
      fakeTrigger = vi.spyOn(Internals, 'triggerUpdaters').mockResolvedValue(undefined)
    })
    it('should set interval on call', () => {
      expect(fakeSetInterval?.mock.calls.length).toBe(0)
      start(1000)
      expect(fakeSetInterval?.mock.calls.length).toBe(1)
    })
    it('should set interval with provided interval', () => {
      const ival = Math.round(Math.random() * 1e9)
      start(ival)
      expect(fakeSetInterval?.mock.calls[0]?.[1]).toBe(ival)
    })
    it('should save interval value from setInterval', () => {
      const timer = Math.round(Math.random() * 1e9)
      fakeSetInterval?.mockReturnValue(timer)
      start(1000)
      expect(CyclicManager.__timer).toBe(timer)
    })
    it('should trigger updaters when interval fires', () => {
      start(1000)
      const fn = cast<() => void>(fakeSetInterval?.mock.calls[0]?.[0])
      expect(fakeTrigger?.mock.calls.length).toBe(0)
      fn()
      expect(fakeTrigger?.mock.calls.length).toBe(1)
    })
    it('should trigger updaters with provided interval', () => {
      const ival = Math.round(Math.random() * 1e9)
      start(ival)
      const fn = cast<() => void>(fakeSetInterval?.mock.calls[0]?.[0])
      fn()
      expect(fakeTrigger?.mock.calls[0]).toEqual([ival])
    })
    it('should tolerate trigger rejecting', async () => {
      let a = Promise.resolve()
      fakeTrigger?.mockImplementation(async () => {
        a = Promise.resolve()
        return await Promise.reject(new Error('this should get swallowed!'))
      })
      start(1000)
      const fn = cast<() => void>(fakeSetInterval?.mock.calls[0]?.[0])
      fn()
      await a
      assert(true, 'the error should have been thrown aweay and not treated as uncaught error')
    })
    it('should not call setInterval when a timer is already running', () => {
      CyclicManager.__timer = 42
      start(1000)
      expect(fakeSetInterval?.mock.calls.length).toBe(0)
    })
    it('should preserve the existing timer when start is called again', () => {
      CyclicManager.__timer = 42
      start(1000)
      expect(CyclicManager.__timer).toBe(42)
    })
    it('should not call clearInterval when start is called again', () => {
      CyclicManager.__timer = 42
      start(1000)
      expect(fakeClearInterval?.mock.calls.length).toBe(0)
    })
  })
  describe('stop()', () => {
    it('should not clear interval without starting', () => {
      CyclicManager.__timer = undefined
      stop()
      expect(fakeClearInterval?.mock.calls.length).toBe(0)
    })
    it('should clear interval when timer set', () => {
      CyclicManager.__timer = 1
      stop()
      expect(fakeClearInterval?.mock.calls.length).toBe(1)
    })
    it('should clear saved timer when stopping', () => {
      const timer = Math.round(Math.random() * 1e9)
      CyclicManager.__timer = timer
      stop()
      expect(fakeClearInterval?.mock.calls[0]).toEqual([timer])
    })
    it('should erase saved timer when stopping', () => {
      const timer = Math.round(Math.random() * 1e9)
      CyclicManager.__timer = timer
      stop()
      expect(CyclicManager.__timer).toBe(undefined)
    })
  })
})
