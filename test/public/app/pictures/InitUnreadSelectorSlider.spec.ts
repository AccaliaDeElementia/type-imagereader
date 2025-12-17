'use sanity'

import { expect } from 'chai'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { Cast } from '../../../testutils/TypeGuards'
import { render } from 'pug'
import Sinon from 'sinon'
import assert from 'assert'

const markup = `html
  body
    div.selectUnreadAll
      div#slider4test
      `
describe('public/app/pictures function SetShowUnreadOnly()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>')
  let getShowUnreadOnlySpy = Sinon.stub()
  let setShowUnreadOnlySpy = Sinon.stub()
  let updateUnreadSelectorSliderSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    getShowUnreadOnlySpy = Sinon.stub(Pictures, 'GetShowUnreadOnly').returns(false)
    setShowUnreadOnlySpy = Sinon.stub(Pictures, 'SetShowUnreadOnly')
    updateUnreadSelectorSliderSpy = Sinon.stub(Pictures, 'UpdateUnreadSelectorSlider')
  })
  afterEach(() => {
    updateUnreadSelectorSliderSpy.restore()
    setShowUnreadOnlySpy.restore()
    getShowUnreadOnlySpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should update current status on init', () => {
    Pictures.InitUnreadSelectorSlider()
    expect(updateUnreadSelectorSliderSpy.callCount).to.equal(1)
  })
  it('should update slider on click event from child element', () => {
    Pictures.InitUnreadSelectorSlider()
    updateUnreadSelectorSliderSpy.resetHistory()
    const element = dom.window.document.querySelector('#slider4test')
    assert(element != null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateUnreadSelectorSliderSpy.callCount).to.equal(1)
  })
  it('should update slider on click event from slider element', () => {
    Pictures.InitUnreadSelectorSlider()
    updateUnreadSelectorSliderSpy.resetHistory()
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element != null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateUnreadSelectorSliderSpy.callCount).to.equal(1)
  })
  it('should unset showUnreadOnly when currently set', () => {
    Pictures.InitUnreadSelectorSlider()
    getShowUnreadOnlySpy.returns(true)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element != null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(setShowUnreadOnlySpy.callCount).to.deep.equal(1)
    expect(setShowUnreadOnlySpy.firstCall.args).to.deep.equal([false])
  })
  it('should set showUnreadOnly when currently unset', () => {
    Pictures.InitUnreadSelectorSlider()
    getShowUnreadOnlySpy.returns(false)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element != null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(setShowUnreadOnlySpy.callCount).to.deep.equal(1)
    expect(setShowUnreadOnlySpy.firstCall.args).to.deep.equal([true])
  })
})
