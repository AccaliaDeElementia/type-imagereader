'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { WebSockets } from '#public/scripts/slideshow/sockets'

import TimeUpdater from '#public/scripts/slideshow/time'
import OverlayUpdater from '#public/scripts/slideshow/overlay'
import { WeatherUpdater, LocalWeatherUpdater } from '#public/scripts/slideshow/weather'
import { CyclicManager } from '#public/scripts/slideshow/updater'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/index', () => {
  let fakeCyclicAdd: Sinon.SinonStub | undefined = undefined
  let fakeCyclicStart: Sinon.SinonStub | undefined = undefined
  let fakeSocketConnect: Sinon.SinonStub | undefined = undefined
  before(() => {
    fakeCyclicAdd = sandbox.stub(CyclicManager, 'Add')
    fakeCyclicStart = sandbox.stub(CyclicManager, 'Start')
    fakeSocketConnect = sandbox.stub(WebSockets, 'connect')
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- side-effect load after stubs; native import() would force ESM resolution that ts-node's CJS hook can't intercept
    require('../../../public/scripts/slideshow/index')
  })
  after(() => {
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
