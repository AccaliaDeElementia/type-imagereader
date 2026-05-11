'use sanity'

import Sinon from 'sinon'

import { timeUpdater } from '#public/scripts/slideshow/time.js'
import { overlayUpdater } from '#public/scripts/slideshow/overlay.js'
import { weatherUpdater, localWeatherUpdater } from '#public/scripts/slideshow/weather.js'
import { Imports, bootstrap } from '#public/scripts/slideshow/bootstrap.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/bootstrap', () => {
  let fakeCyclicAdd: Sinon.SinonStub | undefined = undefined
  let fakeCyclicStart: Sinon.SinonStub | undefined = undefined
  let fakeSocketConnect: Sinon.SinonStub | undefined = undefined
  beforeAll(() => {
    fakeCyclicAdd = sandbox.stub(Imports, 'cyclicManagerAdd')
    fakeCyclicStart = sandbox.stub(Imports, 'cyclicManagerStart')
    fakeSocketConnect = sandbox.stub(Imports, 'socketsConnect')
    bootstrap()
  })
  afterAll(() => {
    fakeSocketConnect?.restore()
    fakeCyclicStart?.restore()
    fakeCyclicAdd?.restore()
    Sinon.restore()
  })
  it('should add cyclic updaters on initial load', () => {
    expect(fakeCyclicAdd?.callCount).toBe(1)
  })
  it('should add all Updaters to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).toHaveLength(4)
  })
  it('should add timeUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).toContain(timeUpdater)
  })
  it('should add overlayUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).toContain(overlayUpdater)
  })
  it('should add weatherUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).toContain(weatherUpdater)
  })
  it('should add localWeatherUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).toContain(localWeatherUpdater)
  })
  it('should start CyclicManager after adding Cyclic Updaters', () => {
    assert(fakeCyclicAdd !== undefined)
    expect(fakeCyclicStart?.calledAfter(fakeCyclicAdd)).toBe(true)
  })
  it('should start CyclicManager on initial load', () => {
    expect(fakeCyclicStart?.callCount).toBe(1)
  })
  it('should start CyclicManager with 1/10s cycle time', () => {
    expect(fakeCyclicStart?.firstCall.args[0]).toBe(100)
  })
  it('should connect to Websockets on initial load', () => {
    expect(fakeSocketConnect?.callCount).toBe(1)
  })
  it('should connect to Websockets after starting Cyclic Manager', () => {
    assert(fakeCyclicStart !== undefined)
    expect(fakeSocketConnect?.calledAfter(fakeCyclicStart)).toBe(true)
  })
})
