'use sanity'

import { timeUpdater } from '#public/scripts/slideshow/time.js'
import { overlayUpdater } from '#public/scripts/slideshow/overlay.js'
import { weatherUpdater, localWeatherUpdater } from '#public/scripts/slideshow/weather.js'
import { Imports, bootstrap } from '#public/scripts/slideshow/bootstrap.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

describe('public/slideshow/bootstrap', () => {
  let fakeCyclicAdd: MockInstance | undefined = undefined
  let fakeCyclicStart: MockInstance | undefined = undefined
  let fakeSocketConnect: MockInstance | undefined = undefined
  beforeAll(() => {
    fakeCyclicAdd = vi.spyOn(Imports, 'cyclicManagerAdd').mockImplementation((..._args: unknown[]) => undefined)
    fakeCyclicStart = vi.spyOn(Imports, 'cyclicManagerStart').mockImplementation((..._args: unknown[]) => undefined)
    fakeSocketConnect = vi.spyOn(Imports, 'socketsConnect').mockImplementation((..._args: unknown[]) => undefined)
    bootstrap()
  })
  afterAll(() => {
    fakeSocketConnect?.mockRestore()
    fakeCyclicStart?.mockRestore()
    fakeCyclicAdd?.mockRestore()
    vi.restoreAllMocks()
  })
  it('should add cyclic updaters on initial load', () => {
    expect(fakeCyclicAdd?.mock.calls.length).toBe(1)
  })
  it('should add all Updaters to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.mock.calls[0]).toHaveLength(4)
  })
  it('should add timeUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.mock.calls[0]).toContain(timeUpdater)
  })
  it('should add overlayUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.mock.calls[0]).toContain(overlayUpdater)
  })
  it('should add weatherUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.mock.calls[0]).toContain(weatherUpdater)
  })
  it('should add localWeatherUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.mock.calls[0]).toContain(localWeatherUpdater)
  })
  it('should start CyclicManager after adding Cyclic Updaters', () => {
    assert(fakeCyclicAdd !== undefined)
    expect((fakeCyclicStart?.mock.invocationCallOrder[0] ?? 0) > (fakeCyclicAdd.mock.invocationCallOrder[0] ?? 0)).toBe(
      true,
    )
  })
  it('should start CyclicManager on initial load', () => {
    expect(fakeCyclicStart?.mock.calls.length).toBe(1)
  })
  it('should start CyclicManager with 1/10s cycle time', () => {
    expect(fakeCyclicStart?.mock.calls[0]?.[0]).toBe(100)
  })
  it('should connect to Websockets on initial load', () => {
    expect(fakeSocketConnect?.mock.calls.length).toBe(1)
  })
  it('should connect to Websockets after starting Cyclic Manager', () => {
    assert(fakeCyclicStart !== undefined)
    expect(
      (fakeSocketConnect?.mock.invocationCallOrder[0] ?? 0) > (fakeCyclicStart.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })
})
