'use sanity'

import Sinon from 'sinon'

import { Imports, Internals } from '#public/scripts/app/actions.js'

import { resetPubSub } from '#testutils/pubsub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

const sandbox = Sinon.createSandbox()
const markup = `
html
  body
    div#tabImages
    div#tabFolders
    div#tabActions
    template#ActionCard
      div.card.action-button
        div.card-top
          i.material-icons question_mark
        div.card-body
          h5 placeholder
`

describe('public/app/actions createButtons()', () => {
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should return div element', () => {
    const result = Internals.createButtons([])
    expect(result).toBeInstanceOf(dom.window.HTMLDivElement)
  })
  it('should return div with css class `actions`', () => {
    const result = Internals.createButtons([])
    expect(result.classList.contains('actions')).toBe(true)
  })
  it('should ignore buttons for missing template', () => {
    dom.window.document.querySelector('#ActionCard')?.remove()
    const result = Internals.createButtons([
      {
        name: 'name',
        image: 'icon',
      },
    ])
    expect(result.children).toHaveLength(0)
  })
  it('should create buttons for each element', () => {
    const target = Math.ceil(Math.random() * 40) + 10
    const buttons = Array(target)
      .fill(undefined)
      .map((_, i) => ({
        name: `button${i}`,
        image: `image${i}`,
      }))
    const result = Internals.createButtons(buttons)
    expect(result.children).toHaveLength(target)
  })
  it('should create an HTMLElement for each button card', () => {
    const container = Internals.createButtons([{ name: 'name', image: 'icon' }])
    const [result] = container.children
    expect(result).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should create an HTMLElement for the icon element', () => {
    const container = Internals.createButtons([{ name: 'name', image: 'icon' }])
    const [result] = container.children
    expect(result?.querySelector('i')).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should set icon text for buttons', () => {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Internals.createButtons([{ name: 'name', image: expected }])
    const [result] = container.children
    expect(result?.querySelector('i')?.innerText).toBe(expected)
  })
  it('should create an HTMLElement for the name element', () => {
    const container = Internals.createButtons([{ name: 'name', image: 'icon' }])
    const [result] = container.children
    expect(result?.querySelector('h5')).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should set name text for buttons', () => {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Internals.createButtons([{ name: expected, image: 'icon' }])
    const [result] = container.children
    expect(result?.querySelector('h5')?.innerText).toBe(expected)
  })
  it('should prevent default on click', () => {
    const container = Internals.createButtons([
      {
        name: 'Button',
        image: 'icon',
      },
    ])
    sandbox.stub(Imports, 'publish')
    const [button] = container.children
    const event = new dom.window.MouseEvent('click')
    const spy = sandbox.stub(event, 'preventDefault')
    button?.dispatchEvent(event)
    expect(spy.called).toBe(true)
  })
  it('it should publish Action:Execute event on click', () => {
    const container = Internals.createButtons([
      {
        name: 'Button',
        image: 'icon',
      },
    ])
    const publishStub = sandbox.stub(Imports, 'publish')
    const [button] = container.children
    const event = new dom.window.MouseEvent('click')
    button?.dispatchEvent(event)
    expect(publishStub.calledWith('Action:Execute:Button')).toBe(true)
  })
  it('should collapse spaces from button name when publishing Action:Execute', () => {
    const container = Internals.createButtons([
      {
        name: 'This Is Not A Button',
        image: 'icon',
      },
    ])
    const publishStub = sandbox.stub(Imports, 'publish')
    const [button] = container.children
    const event = new dom.window.MouseEvent('click')
    button?.dispatchEvent(event)
    expect(publishStub.calledWith('Action:Execute:ThisIsNotAButton')).toBe(true)
  })
})
