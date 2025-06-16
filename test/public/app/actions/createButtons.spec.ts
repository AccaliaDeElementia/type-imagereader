'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'
import Sinon from 'sinon'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Actions } from '../../../../public/scripts/app/actions'

import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
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

describe('public/app/actions function createButtons()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.intervals = {}
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should return div element', () => {
    const result = Actions.createButtons([])
    expect(result).to.be.instanceOf(dom.window.HTMLDivElement)
  })
  it('should return div with css class `actions`', () => {
    const result = Actions.createButtons([])
    expect(result.classList.contains('actions')).to.equal(true)
  })
  it('should ignore buttons for missing template', () => {
    dom.window.document.querySelector('#ActionCard')?.remove()
    const result = Actions.createButtons([
      {
        name: 'name',
        image: 'icon',
      },
    ])
    expect(result.children).to.have.length(0)
  })
  it('should create buttons for each element', () => {
    const target = Math.ceil(Math.random() * 40) + 10
    const buttons = Array(target)
      .fill(undefined)
      .map((_, i) => ({
        name: `button${i}`,
        image: `image${i}`,
      }))
    const result = Actions.createButtons(buttons)
    expect(result.children).to.have.length(target)
  })
  it('should set icon for buttons', () => {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Actions.createButtons([
      {
        name: 'name',
        image: expected,
      },
    ])
    const result = container.children[0]
    expect(result).to.be.instanceOf(dom.window.HTMLElement)
    const text = result?.querySelector('i')
    expect(text).to.be.instanceOf(dom.window.HTMLElement)
    expect(text?.innerText).to.equal(expected)
  })
  it('should set name for buttons', () => {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Actions.createButtons([
      {
        name: expected,
        image: 'icon',
      },
    ])
    const result = container.children[0]
    expect(result).to.be.instanceOf(dom.window.HTMLElement)
    const text = result?.querySelector('h5')
    expect(text).to.be.instanceOf(dom.window.HTMLElement)
    expect(text?.innerText).to.equal(expected)
  })
  it('should prevent default on click', () => {
    const container = Actions.createButtons([
      {
        name: 'Button',
        image: 'icon',
      },
    ])
    PubSub.subscribers['ACTION:EXECUTE:BUTTON'] = [
      async () => {
        await Promise.resolve()
      },
    ]
    const button = container.children[0]
    const event = new dom.window.MouseEvent('click')
    const spy = Sinon.stub(event, 'preventDefault')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  })
  it('it should publish Action:Execute event on click', () => {
    const container = Actions.createButtons([
      {
        name: 'Button',
        image: 'icon',
      },
    ])
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:BUTTON'] = [spy]
    const button = container.children[0]
    const event = new dom.window.MouseEvent('click')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  })
  it('should collapse spaces from button name when publishing Action:Execute', () => {
    const container = Actions.createButtons([
      {
        name: 'This Is Not A Button',
        image: 'icon',
      },
    ])
    const spy = Sinon.stub().resolves()
    PubSub.subscribers['ACTION:EXECUTE:THISISNOTABUTTON'] = [spy]
    const button = container.children[0]
    const event = new dom.window.MouseEvent('click')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  })
})
