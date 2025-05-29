'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'
import * as sinon from 'sinon'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Actions } from '../../../../public/scripts/app/actions'

import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'

describe('public/app/actions function ReadGamepad()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  const dom: JSDOM = new JSDOM('', {})
  let BuildActionsSpy: sinon.SinonStub = sinon.stub()
  let GamepadResetSpy: sinon.SinonStub = sinon.stub()

  let existingNavigator: Navigator = global.navigator
  const testGamePad: {
    axes: number[]
    buttons: GamepadButton[]
  } = {
    axes: [],
    buttons: [],
  }

  let getTestGamepads: sinon.SinonStub = sinon.stub()
  let actionGamepadListener: sinon.SinonStub = sinon.stub()
  let documentHidden = false

  let gamepadsReadStub: sinon.SinonStub = sinon.stub()

  beforeEach(() => {
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.intervals = {}
    BuildActionsSpy = sinon.stub(Actions, 'BuildActions')
    Actions.gamepads.Reset()
    GamepadResetSpy = sinon.stub(Actions.gamepads, 'Reset')
    documentHidden = false
    existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    getTestGamepads = sinon.stub()
    dom.window.navigator.getGamepads = getTestGamepads
    Object.defineProperty(dom.window.document, 'hidden', {
      configurable: true,
      get: () => documentHidden,
    })
    getTestGamepads.returns([testGamePad])
    gamepadsReadStub = sinon.stub(Actions.gamepads, 'Read').returns(false)
    actionGamepadListener = sinon.stub().resolves()
    PubSub.Subscribe('Action:Gamepad', actionGamepadListener)
  })
  afterEach(() => {
    gamepadsReadStub.restore()
    Actions.gamepads.Reset()
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => existingNavigator,
    })
    GamepadResetSpy.restore()
    BuildActionsSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })

  it('should accept an null of gamepads', () => {
    getTestGamepads.resetBehavior()
    getTestGamepads.returns(null)
    expect(() => {
      Actions.ReadGamepad()
    }).to.not.throw()
  })

  it('should accept an empty list of gamepads', () => {
    getTestGamepads.resetBehavior()
    getTestGamepads.returns([])
    expect(() => {
      Actions.ReadGamepad()
    }).to.not.throw()
  })

  it('should accept a null gamepad', () => {
    getTestGamepads.resetBehavior()
    getTestGamepads.returns([null])
    expect(() => {
      Actions.ReadGamepad()
    }).to.not.throw()
  })

  it('should accept a valid gamepad', () => {
    Actions.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(false)
  })

  it('should not read when hidden', () => {
    documentHidden = true
    Actions.ReadGamepad()
    expect(gamepadsReadStub.called).to.equal(false)
  })

  it('should not reset when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Actions.ReadGamepad()
    expect(GamepadResetSpy.called).to.equal(false)
  })

  it('should not publish when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Actions.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(false)
  })

  it('should use the GamepadButtons to read the gamepads', () => {
    Actions.ReadGamepad()
    expect(gamepadsReadStub.called).to.equal(true)
    expect(gamepadsReadStub.calledWithExactly(testGamePad)).to.equal(true)
  })

  it('should not reset the GamepadButtons when read detects no buttons having no history', () => {
    Actions.ReadGamepad()
    expect(GamepadResetSpy.called).to.equal(false)
  })

  it('should reset the GamepadButtons when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.ReadGamepad()
    expect(GamepadResetSpy.called).to.equal(true)
  })

  it('should publish all buttons when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Actions.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(true)
    expect(actionGamepadListener.calledWithExactly(undefined, 'ACTION:GAMEPAD:AQZ')).to.equal(true)
  })

  it('should not publish publish any buttons when read detects no buttons with no history', () => {
    Actions.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(false)
  })
})
