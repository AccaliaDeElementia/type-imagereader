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
type GamePadStatus = {
    A: boolean
    B: boolean
    X: boolean
    Y: boolean
    L: boolean
    R: boolean
    Left: boolean
    Right: boolean
    Up: boolean
    Down: boolean
}

class TestActions extends Actions {
  public static get lastStatus (): GamePadStatus {
    return Actions.lastStatus
  }
}

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
export class AppActionsReadGamepad extends BaseActionsTests {
  existingNavigator: Navigator = global.navigator
  testGamePad: {
    axes: number[],
    buttons: GamepadButton[]
  } = {
      axes: [],
      buttons: []
    }

  getTestGamepads: sinon.SinonStub = sinon.stub()
  actionGamepadListener: sinon.SinonStub = sinon.stub()
  documentHidden = false

  before () {
    super.before()
    this.existingNavigator = global.navigator
    global.navigator = this.dom.window.navigator
    this.getTestGamepads = sinon.stub()
    this.dom.window.navigator.getGamepads = this.getTestGamepads
    Object.defineProperty(this.dom.window.document, 'hidden', {
      configurable: true,
      get: () => this.documentHidden
    })
    this.getTestGamepads.returns([this.testGamePad])
    TestActions.lastStatus.Left = false
    TestActions.lastStatus.Right = false
    TestActions.lastStatus.Up = false
    TestActions.lastStatus.Down = false
    TestActions.lastStatus.A = false
    TestActions.lastStatus.B = false
    TestActions.lastStatus.X = false
    TestActions.lastStatus.Y = false
    TestActions.lastStatus.L = false
    TestActions.lastStatus.R = false
    this.actionGamepadListener = sinon.stub()
    PubSub.Subscribe('Action:Gamepad', this.actionGamepadListener)
  }

  after () {
    global.navigator = this.existingNavigator
    super.after()
  }

  @test
  'It should accept an null of gamepads' () {
    this.getTestGamepads.resetBehavior()
    this.getTestGamepads.returns(null)
    expect(Actions.ReadGamepad).to.not.throw()
  }

  @test
  'It should accept an empty list of gamepads' () {
    this.getTestGamepads.resetBehavior()
    this.getTestGamepads.returns([])
    expect(Actions.ReadGamepad).to.not.throw()
  }

  @test
  'It should accept a null gamepad' () {
    this.getTestGamepads.resetBehavior()
    this.getTestGamepads.returns([null])
    expect(Actions.ReadGamepad).to.not.throw()
  }

  @test
  async 'It should accept a valid gamepad' () {
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.called).to.equal(false)
  }

  @test
  'it should not flag Left for left activation of gamepad on hidden page' () {
    this.documentHidden = true
    this.testGamePad.axes = [-1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(false)
  }

  @test
  'it should flag Left for left activation of gamepad' () {
    this.testGamePad.axes = [-1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(true)
  }

  @test
  'it should not flag Left for tiny left activation of gamepad' () {
    this.testGamePad.axes = [-0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(false)
  }

  @test
  'it should not flag Left for moderate but not enough left activation of gamepad' () {
    this.testGamePad.axes = [-0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(false)
  }

  @test
  'it should flag Left for minimumleft activation of gamepad' () {
    this.testGamePad.axes = [-0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(true)
  }

  @test
  'it should flag Right for right activation of gamepad' () {
    this.testGamePad.axes = [1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(true)
  }

  @test
  'it should not flag Right for tiny right activation of gamepad' () {
    this.testGamePad.axes = [0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should not flag Right for moderate but not enough right activation of gamepad' () {
    this.testGamePad.axes = [0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should flag Right for minimum right activation of gamepad' () {
    this.testGamePad.axes = [0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(true)
  }

  @test
  'it should flag Down for down activation of gamepad' () {
    this.testGamePad.axes = [0, 1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(true)
  }

  @test
  'it should not flag Down for tiny down activation of gamepad' () {
    this.testGamePad.axes = [0, 0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(false)
  }

  @test
  'it should not flag Down for moderate but not enough down activation of gamepad' () {
    this.testGamePad.axes = [0, 0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(false)
  }

  @test
  'it should flag Down for minimum down activation of gamepad' () {
    this.testGamePad.axes = [0, 0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(true)
  }

  @test
  'it should flag Up for up activation of gamepad' () {
    this.testGamePad.axes = [0, -1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(true)
  }

  @test
  'it should not flag Up for tiny up activation of gamepad' () {
    this.testGamePad.axes = [0, -0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(false)
  }

  @test
  'it should not flag Up for moderate but not enough up activation of gamepad' () {
    this.testGamePad.axes = [0, -0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(false)
  }

  @test
  'it should flag Up for minimum up activation of gamepad' () {
    this.testGamePad.axes = [0, -0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(true)
  }

  @test
  'it should not flag button for button activation of gamepad on hidden page' () {
    this.documentHidden = true
    this.testGamePad.buttons[1] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.A).to.equal(false)
  }

  @test
  'it should flag A button for button activation of gamepad' () {
    this.testGamePad.buttons[1] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.A).to.equal(true)
  }

  @test
  'it should flag B button for button activation of gamepad' () {
    this.testGamePad.buttons[0] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.B).to.equal(true)
  }

  @test
  'it should flag X button for button activation of gamepad' () {
    this.testGamePad.buttons[3] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.X).to.equal(true)
  }

  @test
  'it should flag Y button for button activation of gamepad' () {
    this.testGamePad.buttons[2] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Y).to.equal(true)
  }

  @test
  'it should flag L button for button activation of gamepad' () {
    this.testGamePad.buttons[4] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.L).to.equal(true)
  }

  @test
  'it should flag R button for button activation of gamepad' () {
    this.testGamePad.buttons[5] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.R).to.equal(true)
  }

  @test
  'it should flag multiple buttons for multiple button activation of gamepad' () {
    this.testGamePad.buttons[5] = { pressed: true, value: 1, touched: true }
    this.testGamePad.buttons[2] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.R).to.equal(true)
    expect(TestActions.lastStatus.Y).to.equal(true)
  }

  @test
  'it should not send game pad action on null controller input when no flags set' () {
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
  }

  @test
  'it should clear Right flag on null controller input when no flags set' () {
    TestActions.lastStatus.Right = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should clear Left flag on null controller input when no flags set' () {
    TestActions.lastStatus.Left = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should clear Up flag on null controller input when no flags set' () {
    TestActions.lastStatus.Up = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Up).to.equal(false)
  }

  @test
  'it should clear Down flag on null controller input when no flags set' () {
    TestActions.lastStatus.Down = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Down).to.equal(false)
  }

  @test
  'it should clear A flag on null controller input when no flags set' () {
    TestActions.lastStatus.A = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.A).to.equal(false)
  }

  @test
  'it should clear B flag on null controller input when no flags set' () {
    TestActions.lastStatus.B = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.B).to.equal(false)
  }

  @test
  'it should clear X flag on null controller input when no flags set' () {
    TestActions.lastStatus.X = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.X).to.equal(false)
  }

  @test
  'it should clear Y flag on null controller input when no flags set' () {
    TestActions.lastStatus.Y = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Y).to.equal(false)
  }

  @test
  'it should clear L flag on null controller input when no flags set' () {
    TestActions.lastStatus.L = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.L).to.equal(false)
  }

  @test
  'it should clear R flag on null controller input when no flags set' () {
    TestActions.lastStatus.R = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.R).to.equal(false)
  }

  @test
  'it should send single button pad action on null controller input when one flag set' () {
    TestActions.lastStatus.Left = true
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(1)
    expect(this.actionGamepadListener.lastCall.args[0]).to.equal(undefined)
    expect(this.actionGamepadListener.lastCall.args[1]).to.equal('ACTION:GAMEPAD:LEFT')
    TestActions.lastStatus.Left = false
    TestActions.lastStatus.L = true
    this.actionGamepadListener.resetHistory()
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(1)
    expect(this.actionGamepadListener.lastCall.args[0]).to.equal(undefined)
    expect(this.actionGamepadListener.lastCall.args[1]).to.equal('ACTION:GAMEPAD:L')
  }

  @test
  'it should not send button pad action on null controller input when document hidden' () {
    this.documentHidden = true
    TestActions.lastStatus.Left = true
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
  }

  @test
  'it should send multiple button pad action on null controller input when many flag set' () {
    TestActions.lastStatus.Left = true
    TestActions.lastStatus.A = true
    this.actionGamepadListener.resetHistory()
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(1)
    expect(this.actionGamepadListener.lastCall.args[0]).to.equal(undefined)
    expect(this.actionGamepadListener.lastCall.args[1]).to.equal('ACTION:GAMEPAD:ALEFT')
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

  @test
  'it should register a window listener for gamepad connected' () {
    const spy = sinon.spy(this.dom.window, 'addEventListener')
    try {
      Actions.Init()
      expect(spy.calledWith('gamepadconnected')).to.equal(true)
    } finally {
      spy.restore()
    }
  }

  @test
  'it should add a named interval when adding a gamepad' () {
    const spy = sinon.spy(this.dom.window, 'addEventListener')
    try {
      Actions.Init()
      const fn = spy.firstCall.args[1] as Function
      assert(fn)
      fn()
      expect(PubSub.intervals.ReadGamepad).to.not.equal(undefined)
    } finally {
      spy.restore()
    }
  }

  @test
  'it should read gamepad when named interval fires' () {
    const spy = sinon.spy(this.dom.window, 'addEventListener')
    try {
      Actions.Init()
      const fn = spy.firstCall.args[1] as Function
      assert(fn)
      const readspy = sinon.stub(Actions, 'ReadGamepad')
      try {
        fn()
        PubSub.intervals.ReadGamepad?.method()
        expect(readspy.called).to.equal(true)
      } finally {
        readspy.restore()
      }
    } finally {
      spy.restore()
    }
  }
}
