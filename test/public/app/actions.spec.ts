'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Actions } from '../../../public/scripts/app/actions'
import assert from 'assert'

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
class BaseActionsTests extends PubSub {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  constructor () {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('', {})
  }

  before (): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999'
    })
    this.existingWindow = global.window
    global.window = (this.dom.window as unknown) as Window & typeof globalThis
    this.existingDocument = global.document
    global.document = this.dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
  }

  after (): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

@suite
export class AppActionsSetInnertTextMaybeTests extends BaseActionsTests {
  @test
  'it should not explode for null node' () {
    Actions.setInnerTextMaybe(null, 'foobar')
    assert(true, 'The preceeding line should not error')
  }

  @test
  'it should set inner text for HTMLElement' () {
    const tag = this.dom.window.document.createElement('div')
    const expected = 'FOO BAR BAZ ' + Math.random()
    Actions.setInnerTextMaybe(tag, expected)
    expect(tag.innerText).to.equal(expected)
  }
}

@suite
export class AppActionsCreateButtons extends BaseActionsTests {
  @test
  'it should return div element' () {
    const result = Actions.createButtons([])
    expect(result).to.be.instanceOf(this.dom.window.HTMLDivElement)
  }

  @test
  'it should return div with css class `actions`' () {
    const result = Actions.createButtons([])
    expect(result.classList.contains('actions')).to.equal(true)
  }

  @test
  'it should ignore buttons for missing template' () {
    this.dom.window.document.querySelector('#ActionCard')?.remove()
    const result = Actions.createButtons([{
      name: 'name',
      image: 'icon'
    }])
    expect(result.children).to.have.length(0)
  }

  @test
  'it should create buttons for each element' () {
    const target = Math.ceil(Math.random() * 40) + 10
    const buttons = Array(target).fill(undefined).map((_, i) => {
      return {
        name: `button${i}`,
        image: `image${i}`
      }
    })
    const result = Actions.createButtons(buttons)
    expect(result.children).to.have.length(target)
  }

  @test
  'it should set icon for buttons' () {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Actions.createButtons([{
      name: 'name',
      image: expected
    }])
    const result = container.children[0]
    expect(result).to.be.instanceOf(this.dom.window.HTMLElement)
    const text = result?.querySelector('i')
    expect(text).to.be.instanceOf(this.dom.window.HTMLElement)
    expect(text?.innerText).to.equal(expected)
  }

  @test
  'it should set name for buttons' () {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Actions.createButtons([{
      name: expected,
      image: 'icon'
    }])
    const result = container.children[0]
    expect(result).to.be.instanceOf(this.dom.window.HTMLElement)
    const text = result?.querySelector('h5')
    expect(text).to.be.instanceOf(this.dom.window.HTMLElement)
    expect(text?.innerText).to.equal(expected)
  }

  @test
  'it should prevent default on click' () {
    const container = Actions.createButtons([{
      name: 'Button',
      image: 'icon'
    }])
    PubSub.subscribers['ACTION:EXECUTE:BUTTON'] = [() => 0]
    const button = container.children[0]
    const event = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub(event, 'preventDefault')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should publish Action:Execute event on click' () {
    const container = Actions.createButtons([{
      name: 'Button',
      image: 'icon'
    }])
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:BUTTON'] = [spy]
    const button = container.children[0]
    const event = new this.dom.window.MouseEvent('click')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should collapse spaces from button name when publishing Action:Execute' () {
    const container = Actions.createButtons([{
      name: 'This Is Not A Button',
      image: 'icon'
    }])
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:THISISNOTABUTTON'] = [spy]
    const button = container.children[0]
    const event = new this.dom.window.MouseEvent('click')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  }
}

@suite
export class AppActionsBuildActions extends BaseActionsTests {
  @test
  'it should return build actions for each tab' () {
    Actions.BuildActions()
    for (const { target, buttons } of Actions.ActionGroups) {
      const result = this.dom.window.document.querySelectorAll(target + ' .actions')
      expect(result).to.have.length(buttons.length, `${target} should have ${buttons.length} rows`)
      for (let i = 0; i < buttons.length; i++) {
        expect(result[i]).to.be.instanceOf(this.dom.window.HTMLDivElement, `${target} row ${i} should have expected type`)
        expect(result[i]?.children).to.have.length(buttons[i]?.length || -1, `${target} row ${i} should have ${buttons[i]?.length} buttons`)
      }
    }
  }

  @test
  'it should be idempotent' () {
    Actions.BuildActions()
    Actions.BuildActions()
    for (const { target, buttons } of Actions.ActionGroups) {
      const result = this.dom.window.document.querySelectorAll(target + ' .actions')
      expect(result).to.have.length(buttons.length, `${target} should have ${buttons.length} rows`)
      for (let i = 0; i < buttons.length; i++) {
        expect(result[i]).to.be.instanceOf(this.dom.window.HTMLDivElement, `${target} row ${i} should have expected type`)
        expect(result[i]?.children).to.have.length(buttons[i]?.length || -1, `${target} row ${i} should have ${buttons[i]?.length} buttons`)
      }
    }
  }
}

@suite
export class AppActionsInitTests extends BaseActionsTests {
  BuildActionsSpy: sinon.SinonStub = sinon.stub()

  before () {
    super.before()
    this.BuildActionsSpy = sinon.stub(Actions, 'BuildActions')
  }

  after () {
    this.BuildActionsSpy.restore()
    super.after()
  }

  @test
  'it should build actions on init' () {
    Actions.Init()
    expect(this.BuildActionsSpy.called).to.equal(true)
  }

  @test
  'it should subscribe to Navigate:Data' () {
    Actions.Init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  }

  @test
  'it should Tab:Select self on Navigate:Data with no folders nor pictures' () {
    Actions.Init()
    const testCases = [
      [undefined, undefined],
      [[], undefined],
      [undefined, []]
    ]

    const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(handler, 'Navigate:Data handler must be defined')

    const spy = sinon.stub()
    PubSub.subscribers['TAB:SELECT'] = [spy]
    for (const [children, pictures] of testCases) {
      spy.reset()
      handler({
        children,
        pictures
      })
      expect(spy.called).to.equal(true, `Children ${children}, Pictures ${pictures} should call Tab:Select`)
    }
  }

  @test
  'it should not Tab:Select self on Navigate:Data with folders or pictures' () {
    Actions.Init()
    const testCases = [
      [[1], undefined],
      [[1], []],
      [undefined, [1]],
      [[], [1]]
    ]

    const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(handler, 'Navigate:Data handler must be defined')

    const spy = sinon.stub()
    PubSub.subscribers['TAB:SELECT'] = [spy]
    for (const [children, pictures] of testCases) {
      spy.reset()
      handler({
        children,
        pictures
      })
      expect(spy.called).to.equal(false, `Children ${children}, Pictures ${pictures} should not call Tab:Select`)
    }
  }

  @test
  'it should create keyup listener that publishes keypress' () {
    Actions.Init()

    const spy = sinon.stub()
    PubSub.subscribers['ACTION:KEYPRESS'] = [spy]

    const testCases:[boolean, boolean, boolean, string, string][] = [
      [false, false, false, 'a', 'A'],
      [false, false, true, 'b', '<SHIFT>B'],
      [false, true, false, 'c', '<ALT>C'],
      [false, true, true, 'd', '<ALT><SHIFT>D'],
      [true, false, false, 'e', '<CTRL>E'],
      [true, false, true, 'f', '<CTRL><SHIFT>F'],
      [true, true, false, 'g', '<CTRL><ALT>G'],
      [true, true, true, 'h', '<CTRL><ALT><SHIFT>H']
    ]
    for (const [ctrlKey, altKey, shiftKey, key, result] of testCases) {
      const event = new this.dom.window.KeyboardEvent('keyup', {
        altKey,
        ctrlKey,
        shiftKey,
        key
      })
      this.dom.window.document.dispatchEvent(event)

      expect(spy.calledWith(result)).to.equal(true)
    }
  }
}
