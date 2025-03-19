'use sanity'

import Sinon from 'sinon'
import Updater, { Functions } from '../../../../public/scripts/slideshow/overlay'
import { expect } from 'chai'
import { CyclicUpdater } from '../../../../public/scripts/slideshow/updater'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'
const markup = `
html
  body
    div.overlay
`

describe('public/slideshow/overlay CyclicUpdater()', () => {
  let fakeShowHide: Sinon.SinonStub | undefined = undefined
  let fakeCalculateOffset: Sinon.SinonStub | undefined = undefined
  let fakeGetOpacity: Sinon.SinonStub | undefined = undefined
  let dom = new JSDOM()
  const baseWindow = global.window
  const baseDocument = global.document
  beforeEach(() => {
    fakeShowHide = Sinon.stub(Functions, 'ShowHideKiosk')
    fakeCalculateOffset = Sinon.stub(Functions, 'CalculateOffset').returns(0)
    fakeGetOpacity = Sinon.stub(Functions, 'GetOpacity').returns(0)
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:29999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
  })
  afterEach(() => {
    global.window = baseWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => baseDocument,
    })
    fakeGetOpacity?.restore()
    fakeCalculateOffset?.restore()
    fakeShowHide?.restore()
  })
  it('should be a CyclicUpdater', () => {
    expect(Updater).to.be.an.instanceOf(CyclicUpdater)
  })
  it('should update every 1/10th of a second', () => {
    expect(Updater.period).to.equal(100)
  })
  it('should not call ShowHideKiosk when overlay missing', async () => {
    const overlay = dom.window.document.querySelector('.overlay')
    overlay?.remove()
    await Updater.updateFn()
    expect(fakeShowHide?.callCount).to.equal(0)
  })
  it('should call ShowHideKiosk to show/hide kiosk overlay', async () => {
    await Updater.updateFn()
    expect(fakeShowHide?.callCount).to.equal(1)
  })
  it('should pass overlay to ShowHideKiosk call', async () => {
    const overlay = dom.window.document.querySelector('.overlay')
    await Updater.updateFn()
    expect(fakeShowHide?.firstCall.args[0]).to.equal(overlay)
  })
  const kioskCases: Array<[string, boolean]> = [
    ['kiosk', true],
    ['kiosk=73', true],
    ['kiosk=false', true],
    ['kiosk-but-not-really', false],
    ['false-kiosk', false],
    ['potato=good&kiosk', true],
    ['17=kiosk', false],
    ['', false],
    ['kio=sk', false],
    ['kiosk&clock', true],
    ['kiosk=420blaze&footwear=no', true],
  ]
  kioskCases.forEach(([search, expected]) => {
    it(`${expected ? 'should' : 'should not'} enable kiosk mode for search '${search}'`, async () => {
      dom.reconfigure({ url: `http://not.a.kiosk.example.com:29999?${search}` })
      await Updater.updateFn()
      expect(fakeShowHide?.firstCall.args[1]).to.equal(expected)
    })
  })
  it('should call CalculateOffset to get timer offset', async () => {
    await Updater.updateFn()
    expect(fakeCalculateOffset?.callCount).to.equal(1)
  })
  it('should call GetOpacity to turn offset into opacity valie', async () => {
    await Updater.updateFn()
    expect(fakeGetOpacity?.callCount).to.equal(1)
  })
  it('should call GetOpacity with offset valueto turn offset into opacity valie', async () => {
    const value = Math.random()
    fakeCalculateOffset?.returns(value)
    await Updater.updateFn()
    expect(fakeGetOpacity?.firstCall.args).to.deep.equal([value])
  })
  it('should not set Opacity on the overlay element', async () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('.overlay')
    overlay?.style.setProperty('opacity', '1')
    fakeGetOpacity?.returns(0.5)
    await Updater.updateFn()
    expect(overlay?.style.getPropertyValue('opacity')).to.equal('0.5')
  })
})
