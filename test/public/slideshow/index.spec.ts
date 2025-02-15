'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { WebSockets } from '../../../public/scripts/slideshow/sockets'

import TimeUpdater from '../../../public/scripts/slideshow/time'
import OverlayUpdater from '../../../public/scripts/slideshow/overlay'
import { WeatherUpdater, LocalWeatherUpdater } from '../../../public/scripts/slideshow/weather'
import { CyclicManager } from '../../../public/scripts/slideshow/updater'

@suite
export class SlideshowIndexTests {
  CyclicManagerAddStub: sinon.SinonStub = sinon.stub()
  CyclicManagerStartStub: sinon.SinonStub = sinon.stub()
  WebSocketsConnectStub: sinon.SinonStub = sinon.stub()

  before(): void {
    this.CyclicManagerAddStub = sinon.stub(CyclicManager, 'Add')
    this.CyclicManagerStartStub = sinon.stub(CyclicManager, 'Start')
    this.WebSocketsConnectStub = sinon.stub(WebSockets, 'connect')
  }

  after(): void {
    this.WebSocketsConnectStub.restore()
    this.CyclicManagerStartStub.restore()
    this.CyclicManagerAddStub.restore()
  }

  @test
  async 'it should init slideshow'(): Promise<void> {
    await import('../../../public/scripts/slideshow/index')
    expect(
      this.CyclicManagerAddStub.calledWith(TimeUpdater, OverlayUpdater, WeatherUpdater, LocalWeatherUpdater),
    ).to.equal(true)
    expect(this.CyclicManagerStartStub.called).to.equal(true)
    expect(this.CyclicManagerStartStub.calledWith(100)).to.equal(true)
    expect(this.WebSocketsConnectStub.called).to.equal(true)
  }
}
