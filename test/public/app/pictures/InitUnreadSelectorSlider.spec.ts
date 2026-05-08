'use sanity'

import { expect } from 'chai'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { UnreadFilter } from '#public/scripts/app/pictures/unreadFilter.js'
import { render } from 'pug'
import Sinon from 'sinon'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

const markup = `html
  body
    div.selectUnreadAll
      div#slider4test
      `
describe('public/app/pictures function SetShowUnreadOnly()', () => {
  let dom = new JSDOM('<html></html>')
  let getShowUnreadOnlySpy = sandbox.stub()
  let setShowUnreadOnlySpy = sandbox.stub()
  let updateUnreadSelectorSliderSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    getShowUnreadOnlySpy = sandbox.stub(UnreadFilter, 'GetShowUnreadOnly').returns(false)
    setShowUnreadOnlySpy = sandbox.stub(UnreadFilter, 'SetShowUnreadOnly')
    updateUnreadSelectorSliderSpy = sandbox.stub(UnreadFilter, 'UpdateUnreadSelectorSlider')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should update current status on init', () => {
    UnreadFilter.InitUnreadSelectorSlider()
    expect(updateUnreadSelectorSliderSpy.callCount).to.equal(1)
  })
  it('should update slider on click event from child element', () => {
    UnreadFilter.InitUnreadSelectorSlider()
    updateUnreadSelectorSliderSpy.resetHistory()
    const element = dom.window.document.querySelector('#slider4test')
    assert(element !== null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateUnreadSelectorSliderSpy.callCount).to.equal(1)
  })
  it('should update slider on click event from slider element', () => {
    UnreadFilter.InitUnreadSelectorSlider()
    updateUnreadSelectorSliderSpy.resetHistory()
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    const evt = new dom.window.MouseEvent('click', { bubbles: true })
    element.dispatchEvent(evt)
    expect(updateUnreadSelectorSliderSpy.callCount).to.equal(1)
  })
  it('should call SetShowUnreadOnly once when currently set', () => {
    UnreadFilter.InitUnreadSelectorSlider()
    getShowUnreadOnlySpy.returns(true)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.callCount).to.deep.equal(1)
  })
  it('should call SetShowUnreadOnly with false when currently set', () => {
    UnreadFilter.InitUnreadSelectorSlider()
    getShowUnreadOnlySpy.returns(true)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.firstCall.args).to.deep.equal([false])
  })
  it('should call SetShowUnreadOnly once when currently unset', () => {
    UnreadFilter.InitUnreadSelectorSlider()
    getShowUnreadOnlySpy.returns(false)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.callCount).to.deep.equal(1)
  })
  it('should call SetShowUnreadOnly with true when currently unset', () => {
    UnreadFilter.InitUnreadSelectorSlider()
    getShowUnreadOnlySpy.returns(false)
    const element = dom.window.document.querySelector('.selectUnreadAll')
    assert(element !== null)
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(setShowUnreadOnlySpy.firstCall.args).to.deep.equal([true])
  })
})
