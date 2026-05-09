'use sanity'

import Updater, { Internals } from '#public/scripts/slideshow/time.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import { expect } from 'chai'
import Sinon from 'sinon'
import { CyclicUpdater } from '#public/scripts/slideshow/updater.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.time
      div.date
`

describe('public/slideshow/time Updater()', () => {
  let fakeFormatTime: Sinon.SinonStub | undefined = undefined
  let fakeFormatDate: Sinon.SinonStub | undefined = undefined
  let dom = new JSDOM(render(markup))
  const now = new Date(2000, 3, 1, 0, 0, 0, 0)
  beforeEach(() => {
    fakeFormatTime = sandbox.stub(Internals, 'FormatTime').returns('')
    fakeFormatDate = sandbox.stub(Internals, 'FormatDate').returns('')
    sandbox.useFakeTimers({ now })
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:29999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should expose a CyclicUpdater', () => {
    expect(Updater).to.be.an.instanceOf(CyclicUpdater)
  })
  it('should have a period of 100ms', () => {
    expect(Updater.period).to.equal(100)
  })
  it('should format time for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatTime?.callCount).to.equal(1)
  })
  it('should format now as time for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatTime?.firstCall.args).to.deep.equal([now])
  })
  it('should place formated data into .time', async () => {
    fakeFormatTime?.returns('I am time')
    await Updater.updateFn()
    const elem = dom.window.document.querySelector<HTMLElement>('.time')
    expect(elem?.innerHTML).to.equal('I am time')
  })
  it('should tolerate a missing .time target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.time')
    elem?.remove()
    await Updater.updateFn()
    assert(true, 'should pass without throwing')
  })
  it('should not format time for missing target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.time')
    elem?.remove()
    await Updater.updateFn()
    expect(fakeFormatTime?.callCount).to.equal(0)
  })
  it('should format date for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatDate?.callCount).to.equal(1)
  })
  it('should format now as date for display', async () => {
    await Updater.updateFn()
    expect(fakeFormatDate?.firstCall.args).to.deep.equal([now])
  })
  it('should place formated data into .date', async () => {
    fakeFormatDate?.returns('I am date')
    await Updater.updateFn()
    const elem = dom.window.document.querySelector<HTMLElement>('.date')
    expect(elem?.innerHTML).to.equal('I am date')
  })
  it('should tolerate a missing .date target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.date')
    elem?.remove()
    await Updater.updateFn()
    assert(true, 'should pass without throwing')
  })
  it('should not format date for missing target node', async () => {
    const elem = dom.window.document.querySelector<HTMLElement>('.date')
    elem?.remove()
    await Updater.updateFn()
    expect(fakeFormatDate?.callCount).to.equal(0)
  })
})
