'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { WeatherUpdater } from '../../../public/scripts/slideshow/weather'
import OverlayUpdater from '../../../public/scripts/slideshow/overlay'

const markup = `
html
  body
    div.overlay.hide
    div.pixel.top-left.hide
    div.pixel.top-right.hide
    div.pixel.bottom-left.hide
    div.pixel.bottom-right.hide
`

const maxOpacity = 0.85

@suite()
export class SlideshowWeatherTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  fetchStub: sinon.SinonStub
  fetchData: any
  clock: sinon.SinonFakeTimers | undefined
  constructor () {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('')
    this.fetchStub = sinon.stub()
  }

  async before (): Promise<void> {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999'
    })
    this.existingWindow = global.window
    global.window = (this.dom.window as unknown) as Window & typeof globalThis
    this.existingDocument = global.document
    global.document = this.dom.window.document

    this.fetchStub = sinon.stub(global, 'fetch')
    this.fetchStub.resolves({
      json: async () => await Promise.resolve(this.fetchData)
    })

    this.fetchData = {
      sunrise: -Infinity,
      sunset: Infinity
    }
    await WeatherUpdater.updateFn()
    this.fetchData = {}
  }

  async after (): Promise<void> {
    global.window = this.existingWindow
    global.document = this.existingDocument

    this.fetchStub.restore()

    this.clock?.restore()
    this.clock = undefined
  }

  @test
  async 'overlay does not open in non kiosk mode' (): Promise<void> {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    await WeatherUpdater.updateFn()
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999'
    })
    // Test begins
    await OverlayUpdater.updateFn()
    expect(this.dom.window.document.querySelector('.overlay')?.classList.contains('hide')).to.equal(true)
    expect(this.dom.window.document.querySelector('.pixel.top-left')?.classList.contains('hide')).to.equal(true)
    expect(this.dom.window.document.querySelector('.pixel.top-right')?.classList.contains('hide')).to.equal(true)
    expect(this.dom.window.document.querySelector('.pixel.bottom-left')?.classList.contains('hide')).to.equal(true)
    expect(this.dom.window.document.querySelector('.pixel.bottom-right')?.classList.contains('hide')).to.equal(true)
  }

  @test
  async 'overlay opens in kiosk mode' (): Promise<void> {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    await WeatherUpdater.updateFn()
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999?kiosk'
    })
    // Test begins
    await OverlayUpdater.updateFn()
    expect(this.dom.window.document.querySelector('.overlay')?.classList.contains('hide')).to.equal(false)
    expect(this.dom.window.document.querySelector('.pixel.top-left')?.classList.contains('hide')).to.equal(false)
    expect(this.dom.window.document.querySelector('.pixel.top-right')?.classList.contains('hide')).to.equal(false)
    expect(this.dom.window.document.querySelector('.pixel.bottom-left')?.classList.contains('hide')).to.equal(false)
    expect(this.dom.window.document.querySelector('.pixel.bottom-right')?.classList.contains('hide')).to.equal(false)
  }

  @test
  async 'overlay Shows "fully opaque" well before sunrise' (): Promise<void> {
    const now = new Date('1999-12-31T01:00:00.000')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    await WeatherUpdater.updateFn()
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999?kiosk'
    })
    // Test begins
    await OverlayUpdater.updateFn()
    const overlay = this.dom.window.document.querySelector('.overlay') as unknown as HTMLElement
    expect(overlay.style.getPropertyValue('opacity')).to.equal(`${maxOpacity}`)
  }

  @test
  async 'overlay fades out before sunrise' (): Promise<void> {
    const now = new Date('1999-12-31T05:45:00.000')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    await WeatherUpdater.updateFn()
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999?kiosk'
    })
    // Test begins
    await OverlayUpdater.updateFn()
    const overlay = this.dom.window.document.querySelector('.overlay') as unknown as HTMLElement
    expect(overlay.style.getPropertyValue('opacity')).to.equal(`${maxOpacity}`)
    for (let i = 1; i <= 30; i++) {
      const offset = (30 - i) / 30
      this.clock.tick(60 * 1000)
      await OverlayUpdater.updateFn()
      expect(overlay.style.getPropertyValue('opacity')).to.equal(`${maxOpacity * offset}`)
    }
  }

  @test
  async 'overlay is tranparent during the day' (): Promise<void> {
    const now = new Date('1999-12-31T10:00:00.000')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    await WeatherUpdater.updateFn()
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999?kiosk'
    })
    // Test begins
    await OverlayUpdater.updateFn()
    const overlay = this.dom.window.document.querySelector('.overlay') as unknown as HTMLElement
    expect(overlay.style.getPropertyValue('opacity')).to.equal('0')
  }

  @test
  async 'overlay fades in after sunset' (): Promise<void> {
    const now = new Date('1999-12-31T21:00:00.000')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    await WeatherUpdater.updateFn()
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999?kiosk'
    })
    // Test begins
    await OverlayUpdater.updateFn()
    const overlay = this.dom.window.document.querySelector('.overlay') as unknown as HTMLElement
    expect(overlay.style.getPropertyValue('opacity')).to.equal('0')
    for (let i = 1; i <= 30; i++) {
      const offset = i / 30
      this.clock.tick(60 * 1000)
      await OverlayUpdater.updateFn()
      expect(overlay.style.getPropertyValue('opacity')).to.equal(`${maxOpacity * offset}`)
    }
  }

  @test
  async 'overlay Shows "fully opaque" well after sunset' (): Promise<void> {
    const now = new Date('1999-12-31T22:00:00.000')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    await WeatherUpdater.updateFn()
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999?kiosk'
    })
    // Test begins
    await OverlayUpdater.updateFn()
    const overlay = this.dom.window.document.querySelector('.overlay') as unknown as HTMLElement
    expect(overlay.style.getPropertyValue('opacity')).to.equal(`${maxOpacity}`)
  }
}
