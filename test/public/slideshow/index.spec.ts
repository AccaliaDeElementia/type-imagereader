'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { WebSockets } from '../../../public/scripts/slideshow/sockets'

import TimeUpdater from '../../../public/scripts/slideshow/time'
import OverlayUpdater from '../../../public/scripts/slideshow/overlay'
import { WeatherUpdater, LocalWeatherUpdater } from '../../../public/scripts/slideshow/weather'
import { CyclicManager } from '../../../public/scripts/slideshow/updater'
import assert from 'assert'

describe('public/slideshow/index', () => {
  let fakeCyclicAdd: Sinon.SinonStub | undefined = undefined
  let fakeCyclicStart: Sinon.SinonStub | undefined = undefined
  let fakeSocketConnect: Sinon.SinonStub | undefined = undefined
  before(async () => {
    fakeCyclicAdd = Sinon.stub(CyclicManager, 'Add')
    fakeCyclicStart = Sinon.stub(CyclicManager, 'Start')
    fakeSocketConnect = Sinon.stub(WebSockets, 'connect')
    await import('../../../public/scripts/slideshow/index')
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
    assert(fakeCyclicAdd != null)
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
    assert(fakeCyclicStart != null)
    expect(fakeSocketConnect?.calledAfter(fakeCyclicStart)).to.equal(true)
  })
})
