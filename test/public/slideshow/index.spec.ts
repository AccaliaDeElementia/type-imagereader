'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { WebSockets } from '#public/scripts/slideshow/sockets.js'

import TimeUpdater from '#public/scripts/slideshow/time.js'
import OverlayUpdater from '#public/scripts/slideshow/overlay.js'
import { WeatherUpdater, LocalWeatherUpdater } from '#public/scripts/slideshow/weather.js'
import { CyclicManager } from '#public/scripts/slideshow/updater.js'
import { bootstrap } from '#public/scripts/slideshow/index.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/index', () => {
  let fakeCyclicAdd: Sinon.SinonStub | undefined = undefined
  let fakeCyclicStart: Sinon.SinonStub | undefined = undefined
  let fakeSocketConnect: Sinon.SinonStub | undefined = undefined
  beforeAll(() => {
    fakeCyclicAdd = sandbox.stub(CyclicManager, 'Add')
    fakeCyclicStart = sandbox.stub(CyclicManager, 'Start')
    fakeSocketConnect = sandbox.stub(WebSockets, 'connect')
    bootstrap()
  })
  afterAll(() => {
    fakeSocketConnect?.restore()
    fakeCyclicStart?.restore()
    fakeCyclicAdd?.restore()
    Sinon.restore()
  })
  it('should add cyclic updaters on initial load', () => {
    expect(fakeCyclicAdd?.callCount).to.equal(1)
  })
  it('should add all Updaters to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).to.have.lengthOf(4)
  })
  it('should add TimeUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).to.contain(TimeUpdater)
  })
  it('should add OverlayUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).to.contain(OverlayUpdater)
  })
  it('should add WeatherUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).to.contain(WeatherUpdater)
  })
  it('should add LocalWeatherUpdater to Cyclic Manager', () => {
    expect(fakeCyclicAdd?.firstCall.args).to.contain(LocalWeatherUpdater)
  })
  it('should start CyclicManager after adding Cyclic Updaters', () => {
    assert(fakeCyclicAdd !== undefined)
    expect(fakeCyclicStart?.calledAfter(fakeCyclicAdd)).to.equal(true)
  })
  it('should start CyclicManager on initial load', () => {
    expect(fakeCyclicStart?.callCount).to.equal(1)
  })
  it('should start CyclicManager with 1/10s cycle time', () => {
    expect(fakeCyclicStart?.firstCall.args[0]).to.equal(100)
  })
  it('should connect to Websockets on initial load', () => {
    expect(fakeSocketConnect?.callCount).to.equal(1)
  })
  it('should connect to Websockets after starting Cyclic Manager', () => {
    assert(fakeCyclicStart !== undefined)
    expect(fakeSocketConnect?.calledAfter(fakeCyclicStart)).to.equal(true)
  })
})
