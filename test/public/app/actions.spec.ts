'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Actions, isNavigateData } from '../../../public/scripts/app/actions'
import assert from 'assert'
import { AssertVoidFn, ForceCastTo } from '../../testutils/TypeGuards'

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
interface GamePadStatus {
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

@suite
export class ActionsIsNavigateData {
  @test
  'it should accept empty object'(): void {
    const obj = {}
    expect(isNavigateData(obj)).to.equal(true)
  }

  @test
  'it should accept object with children array'(): void {
    const obj = {
      children: [1, 2, 3],
    }
    expect(isNavigateData(obj)).to.equal(true)
  }

  @test
  'it should accept undefined children array'(): void {
    const obj = {
      children: undefined,
    }
    expect(isNavigateData(obj)).to.equal(true)
  }

  @test
  'it should reject undefined children array'(): void {
    const obj = {
      children: null,
    }
    expect(isNavigateData(obj)).to.equal(false)
  }

  @test
  'it should accept object with pictures array'(): void {
    const obj = {
      pictures: ['1', 4, false],
    }
    expect(isNavigateData(obj)).to.equal(true)
  }

  @test
  'it should accept undefiend pictures array'(): void {
    const obj = {
      pictures: undefined,
    }
    expect(isNavigateData(obj)).to.equal(true)
  }

  @test
  'it should reject null pictures array'(): void {
    const obj = {
      pictures: null,
    }
    expect(isNavigateData(obj)).to.equal(false)
  }

  @test
  'it should reject null object'(): void {
    const obj = null
    expect(isNavigateData(obj)).to.equal(false)
  }

  @test
  'it should reject undefined'(): void {
    const obj = undefined
    expect(isNavigateData(obj)).to.equal(false)
  }

  @test
  'it should reject non object'(): void {
    const obj = 42
    expect(isNavigateData(obj)).to.equal(false)
  }
}

class TestActions extends Actions {
  public static get lastStatus(): GamePadStatus {
    return Actions.lastStatus
  }
}

class BaseActionsTests extends PubSub {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  constructor() {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('', {})
  }

  before(): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.existingWindow = global.window
    global.window = ForceCastTo<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    global.document = this.dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

@suite
export class AppActionsSetInnerTextMaybeTests extends BaseActionsTests {
  @test
  'it should not explode for null node'(): void {
    Actions.setInnerTextMaybe(null, 'foobar')
    assert(true, 'The preceeding line should not error')
  }

  @test
  'it should set inner text for HTMLElement'(): void {
    const tag = this.dom.window.document.createElement('div')
    const expected = 'FOO BAR BAZ ' + Math.random()
    Actions.setInnerTextMaybe(tag, expected)
    expect(tag.innerText).to.equal(expected)
  }
}

@suite
export class AppActionsCreateButtons extends BaseActionsTests {
  @test
  'it should return div element'(): void {
    const result = Actions.createButtons([])
    expect(result).to.be.instanceOf(this.dom.window.HTMLDivElement)
  }

  @test
  'it should return div with css class `actions`'(): void {
    const result = Actions.createButtons([])
    expect(result.classList.contains('actions')).to.equal(true)
  }

  @test
  'it should ignore buttons for missing template'(): void {
    this.dom.window.document.querySelector('#ActionCard')?.remove()
    const result = Actions.createButtons([
      {
        name: 'name',
        image: 'icon',
      },
    ])
    expect(result.children).to.have.length(0)
  }

  @test
  'it should create buttons for each element'(): void {
    const target = Math.ceil(Math.random() * 40) + 10
    const buttons = Array(target)
      .fill(undefined)
      .map((_, i) => ({
        name: `button${i}`,
        image: `image${i}`,
      }))
    const result = Actions.createButtons(buttons)
    expect(result.children).to.have.length(target)
  }

  @test
  'it should set icon for buttons'(): void {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Actions.createButtons([
      {
        name: 'name',
        image: expected,
      },
    ])
    const result = container.children[0]
    expect(result).to.be.instanceOf(this.dom.window.HTMLElement)
    const text = result?.querySelector('i')
    expect(text).to.be.instanceOf(this.dom.window.HTMLElement)
    expect(text?.innerText).to.equal(expected)
  }

  @test
  'it should set name for buttons'(): void {
    const expected = `RANDOM TEXT ${Math.random()}`
    const container = Actions.createButtons([
      {
        name: expected,
        image: 'icon',
      },
    ])
    const result = container.children[0]
    expect(result).to.be.instanceOf(this.dom.window.HTMLElement)
    const text = result?.querySelector('h5')
    expect(text).to.be.instanceOf(this.dom.window.HTMLElement)
    expect(text?.innerText).to.equal(expected)
  }

  @test
  'it should prevent default on click'(): void {
    const container = Actions.createButtons([
      {
        name: 'Button',
        image: 'icon',
      },
    ])
    PubSub.subscribers['ACTION:EXECUTE:BUTTON'] = [() => 0]
    const button = container.children[0]
    const event = new this.dom.window.MouseEvent('click')
    const spy = sinon.stub(event, 'preventDefault')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should publish Action:Execute event on click'(): void {
    const container = Actions.createButtons([
      {
        name: 'Button',
        image: 'icon',
      },
    ])
    const spy = sinon.stub()
    PubSub.subscribers['ACTION:EXECUTE:BUTTON'] = [spy]
    const button = container.children[0]
    const event = new this.dom.window.MouseEvent('click')
    button?.dispatchEvent(event)
    expect(spy.called).to.equal(true)
  }

  @test
  'it should collapse spaces from button name when publishing Action:Execute'(): void {
    const container = Actions.createButtons([
      {
        name: 'This Is Not A Button',
        image: 'icon',
      },
    ])
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
  'it should return build actions for each tab'(): void {
    Actions.BuildActions()
    for (const { target, buttons } of Actions.ActionGroups) {
      const result = this.dom.window.document.querySelectorAll(target + ' .actions')
      expect(result).to.have.length(buttons.length, `${target} should have ${buttons.length} rows`)
      for (let i = 0; i < buttons.length; i++) {
        expect(result[i]).to.be.instanceOf(
          this.dom.window.HTMLDivElement,
          `${target} row ${i} should have expected type`,
        )
        expect(result[i]?.children).to.have.length(
          buttons[i]?.length ?? -1,
          `${target} row ${i} should have ${buttons[i]?.length} buttons`,
        )
      }
    }
  }

  @test
  'it should be idempotent'(): void {
    Actions.BuildActions()
    Actions.BuildActions()
    for (const { target, buttons } of Actions.ActionGroups) {
      const result = this.dom.window.document.querySelectorAll(target + ' .actions')
      expect(result).to.have.length(buttons.length, `${target} should have ${buttons.length} rows`)
      for (let i = 0; i < buttons.length; i++) {
        expect(result[i]).to.be.instanceOf(
          this.dom.window.HTMLDivElement,
          `${target} row ${i} should have expected type`,
        )
        expect(result[i]?.children).to.have.length(
          buttons[i]?.length ?? -1,
          `${target} row ${i} should have ${buttons[i]?.length} buttons`,
        )
      }
    }
  }
}

@suite
export class AppActionsReadGamepad extends BaseActionsTests {
  existingNavigator: Navigator = global.navigator
  testGamePad: {
    axes: number[]
    buttons: GamepadButton[]
  } = {
    axes: [],
    buttons: [],
  }

  getTestGamepads: sinon.SinonStub = sinon.stub()
  actionGamepadListener: sinon.SinonStub = sinon.stub()
  documentHidden = false

  before(): void {
    super.before()
    this.existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => this.dom.window.navigator,
    })
    this.getTestGamepads = sinon.stub()
    this.dom.window.navigator.getGamepads = this.getTestGamepads
    Object.defineProperty(this.dom.window.document, 'hidden', {
      configurable: true,
      get: () => this.documentHidden,
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

  after(): void {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => this.existingNavigator,
    })
    super.after()
  }

  @test
  'It should accept an null of gamepads'(): void {
    this.getTestGamepads.resetBehavior()
    this.getTestGamepads.returns(null)
    expect(() => {
      Actions.ReadGamepad()
    }).to.not.throw()
  }

  @test
  'It should accept an empty list of gamepads'(): void {
    this.getTestGamepads.resetBehavior()
    this.getTestGamepads.returns([])
    expect(() => {
      Actions.ReadGamepad()
    }).to.not.throw()
  }

  @test
  'It should accept a null gamepad'(): void {
    this.getTestGamepads.resetBehavior()
    this.getTestGamepads.returns([null])
    expect(() => {
      Actions.ReadGamepad()
    }).to.not.throw()
  }

  @test
  'It should accept a valid gamepad'(): void {
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.called).to.equal(false)
  }

  @test
  'it should not flag Left for left activation of gamepad on hidden page'(): void {
    this.documentHidden = true
    this.testGamePad.axes = [-1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(false)
  }

  @test
  'it should flag Left for left activation of gamepad'(): void {
    this.testGamePad.axes = [-1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(true)
  }

  @test
  'it should flag Left for left activation of d-pad'(): void {
    this.testGamePad.buttons = ForceCastTo<GamepadButton[]>(Array(20).fill({ pressed: false }))
    this.testGamePad.buttons[14] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(true)
  }

  @test
  'it should not flag Left for tiny left activation of gamepad'(): void {
    this.testGamePad.axes = [-0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(false)
  }

  @test
  'it should not flag Left for moderate but not enough left activation of gamepad'(): void {
    this.testGamePad.axes = [-0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(false)
  }

  @test
  'it should flag Left for minimumleft activation of gamepad'(): void {
    this.testGamePad.axes = [-0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Left).to.equal(true)
  }

  @test
  'it should flag Right for right activation of gamepad'(): void {
    this.testGamePad.axes = [1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(true)
  }

  @test
  'it should flag Right for right activation of d-pad'(): void {
    this.testGamePad.buttons = ForceCastTo<GamepadButton[]>(Array(20).fill({ pressed: false }))
    this.testGamePad.buttons[15] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(true)
  }

  @test
  'it should not flag Right for tiny right activation of gamepad'(): void {
    this.testGamePad.axes = [0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should not flag Right for moderate but not enough right activation of gamepad'(): void {
    this.testGamePad.axes = [0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should flag Right for minimum right activation of gamepad'(): void {
    this.testGamePad.axes = [0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Right).to.equal(true)
  }

  @test
  'it should flag Down for down activation of gamepad'(): void {
    this.testGamePad.axes = [0, 1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(true)
  }

  @test
  'it should flag Down for down activation of d-pad'(): void {
    this.testGamePad.buttons = ForceCastTo<GamepadButton[]>(Array(20).fill({ pressed: false }))
    this.testGamePad.buttons[13] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(true)
  }

  @test
  'it should not flag Down for tiny down activation of gamepad'(): void {
    this.testGamePad.axes = [0, 0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(false)
  }

  @test
  'it should not flag Down for moderate but not enough down activation of gamepad'(): void {
    this.testGamePad.axes = [0, 0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(false)
  }

  @test
  'it should flag Down for minimum down activation of gamepad'(): void {
    this.testGamePad.axes = [0, 0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Down).to.equal(true)
  }

  @test
  'it should flag Up for up activation of gamepad'(): void {
    this.testGamePad.axes = [0, -1]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(true)
  }

  @test
  'it should flag Up for up activation of d-pad'(): void {
    this.testGamePad.buttons = ForceCastTo<GamepadButton[]>(Array(20).fill({ pressed: false }))
    this.testGamePad.buttons[12] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(true)
  }

  @test
  'it should not flag Up for tiny up activation of gamepad'(): void {
    this.testGamePad.axes = [0, -0.0001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(false)
  }

  @test
  'it should not flag Up for moderate but not enough up activation of gamepad'(): void {
    this.testGamePad.axes = [0, -0.4999]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(false)
  }

  @test
  'it should flag Up for minimum up activation of gamepad'(): void {
    this.testGamePad.axes = [0, -0.500000001]
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Up).to.equal(true)
  }

  @test
  'it should not flag button for button activation of gamepad on hidden page'(): void {
    this.documentHidden = true
    this.testGamePad.buttons[1] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.A).to.equal(false)
  }

  @test
  'it should flag A button for button activation of gamepad'(): void {
    this.testGamePad.buttons[0] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.A).to.equal(true)
  }

  @test
  'it should flag B button for button activation of gamepad'(): void {
    this.testGamePad.buttons[1] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.B).to.equal(true)
  }

  @test
  'it should flag X button for button activation of gamepad'(): void {
    this.testGamePad.buttons[3] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.X).to.equal(true)
  }

  @test
  'it should flag Y button for button activation of gamepad'(): void {
    this.testGamePad.buttons[2] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.Y).to.equal(true)
  }

  @test
  'it should flag L button for button activation of gamepad'(): void {
    this.testGamePad.buttons[4] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.L).to.equal(true)
  }

  @test
  'it should flag R button for button activation of gamepad'(): void {
    this.testGamePad.buttons[5] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.R).to.equal(true)
  }

  @test
  'it should flag multiple buttons for multiple button activation of gamepad'(): void {
    this.testGamePad.buttons[5] = { pressed: true, value: 1, touched: true }
    this.testGamePad.buttons[2] = { pressed: true, value: 1, touched: true }
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
    expect(TestActions.lastStatus.R).to.equal(true)
    expect(TestActions.lastStatus.Y).to.equal(true)
  }

  @test
  'it should not send game pad action on null controller input when no flags set'(): void {
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
  }

  @test
  'it should clear Right flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.Right = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should clear Left flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.Left = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Right).to.equal(false)
  }

  @test
  'it should clear Up flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.Up = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Up).to.equal(false)
  }

  @test
  'it should clear Down flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.Down = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Down).to.equal(false)
  }

  @test
  'it should clear A flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.A = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.A).to.equal(false)
  }

  @test
  'it should clear B flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.B = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.B).to.equal(false)
  }

  @test
  'it should clear X flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.X = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.X).to.equal(false)
  }

  @test
  'it should clear Y flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.Y = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.Y).to.equal(false)
  }

  @test
  'it should clear L flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.L = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.L).to.equal(false)
  }

  @test
  'it should clear R flag on null controller input when no flags set'(): void {
    TestActions.lastStatus.R = true
    Actions.ReadGamepad()
    expect(TestActions.lastStatus.R).to.equal(false)
  }

  @test
  'it should send single button pad action on null controller input when one flag set'(): void {
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
  'it should not send button pad action on null controller input when document hidden'(): void {
    this.documentHidden = true
    TestActions.lastStatus.Left = true
    Actions.ReadGamepad()
    expect(this.actionGamepadListener.callCount).to.equal(0)
  }

  @test
  'it should send multiple button pad action on null controller input when many flag set'(): void {
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

  before(): void {
    super.before()
    this.BuildActionsSpy = sinon.stub(Actions, 'BuildActions')
  }

  after(): void {
    this.BuildActionsSpy.restore()
    super.after()
  }

  @test
  'it should build actions on init'(): void {
    Actions.Init()
    expect(this.BuildActionsSpy.called).to.equal(true)
  }

  @test
  'it should subscribe to Navigate:Data'(): void {
    Actions.Init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  }

  @test
  'it should Tab:Select self on Navigate:Data with no folders nor pictures'(): void {
    Actions.Init()
    const testCases: Array<[string[] | undefined, string[] | undefined]> = [
      [undefined, undefined],
      [[], undefined],
      [undefined, []],
    ]

    const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(handler !== undefined, 'Navigate:Data handler must be defined')

    const spy = sinon.stub()
    PubSub.subscribers['TAB:SELECT'] = [spy]
    for (const [children, pictures] of testCases) {
      spy.reset()
      handler({
        children,
        pictures,
      })
      expect(spy.called).to.equal(true)
    }
  }

  @test
  'it should not Tab:Select self on Navigate:Data with folders or pictures'(): void {
    Actions.Init()
    const testCases = [
      [[1], undefined],
      [[1], []],
      [undefined, [1]],
      [[], [1]],
    ]

    const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(handler !== undefined, 'Navigate:Data handler must be defined')

    const spy = sinon.stub()
    PubSub.subscribers['TAB:SELECT'] = [spy]
    for (const [children, pictures] of testCases) {
      spy.reset()
      handler({
        children,
        pictures,
      })
      expect(spy.called).to.equal(false)
    }
  }

  @test
  'it should create keyup listener that publishes keypress'(): void {
    Actions.Init()

    const spy = sinon.stub()
    PubSub.subscribers['ACTION:KEYPRESS'] = [spy]

    const testCases: Array<[boolean, boolean, boolean, string, string]> = [
      [false, false, false, 'a', 'A'],
      [false, false, true, 'b', '<SHIFT>B'],
      [false, true, false, 'c', '<ALT>C'],
      [false, true, true, 'd', '<ALT><SHIFT>D'],
      [true, false, false, 'e', '<CTRL>E'],
      [true, false, true, 'f', '<CTRL><SHIFT>F'],
      [true, true, false, 'g', '<CTRL><ALT>G'],
      [true, true, true, 'h', '<CTRL><ALT><SHIFT>H'],
    ]
    for (const [ctrlKey, altKey, shiftKey, key, result] of testCases) {
      const event = new this.dom.window.KeyboardEvent('keyup', {
        altKey,
        ctrlKey,
        shiftKey,
        key,
      })
      this.dom.window.document.dispatchEvent(event)

      expect(spy.calledWith(result)).to.equal(true)
    }
  }

  @test
  'it should register a window listener for gamepad connected'(): void {
    const spy = sinon.spy(this.dom.window, 'addEventListener')
    try {
      Actions.Init()
      expect(spy.calledWith('gamepadconnected')).to.equal(true)
    } finally {
      spy.restore()
    }
  }

  @test
  'it should add a named interval when adding a gamepad'(): void {
    const spy = sinon.spy(this.dom.window, 'addEventListener')
    try {
      Actions.Init()
      const fn = AssertVoidFn(spy.firstCall.args[1])
      fn()
      expect(PubSub.intervals.ReadGamepad).to.not.equal(undefined)
    } finally {
      spy.restore()
    }
  }

  @test
  'it should read gamepad when named interval fires'(): void {
    const spy = sinon.spy(this.dom.window, 'addEventListener')
    try {
      Actions.Init()
      const fn = AssertVoidFn(spy.firstCall.args[1])
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
