'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Subscribe } from '#public/scripts/app/pubsub.js'
import { Actions, Internals } from '#public/scripts/app/actions.js'

import { resetPubSub } from '#testutils/PubSub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'

const sandbox = Sinon.createSandbox()

describe('public/app/actions function ReadGamepad()', () => {
  const dom: JSDOM = new JSDOM('', {})
  let GamepadResetSpy = sandbox.stub()

  let existingNavigator: Navigator = global.navigator
  const testGamePad: {
    axes: number[]
    buttons: GamepadButton[]
  } = {
    axes: [],
    buttons: [],
  }

  let getTestGamepads = sandbox.stub()
  let actionGamepadListener = sandbox.stub()
  let documentHidden = false

  let gamepadsReadStub = sandbox.stub()

  beforeEach(() => {
    mountDom(dom)
    resetPubSub()
    sandbox.stub(Internals, 'BuildActions')
    Actions.gamepads.Reset()
    GamepadResetSpy = sandbox.stub(Actions.gamepads, 'Reset')
    documentHidden = false
    existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    getTestGamepads = sandbox.stub()
    dom.window.navigator.getGamepads = getTestGamepads
    Object.defineProperty(dom.window.document, 'hidden', {
      configurable: true,
      get: () => documentHidden,
    })
    getTestGamepads.returns([testGamePad])
    gamepadsReadStub = sandbox.stub(Actions.gamepads, 'Read').returns(false)
    actionGamepadListener = sandbox.stub().resolves()
    Subscribe('Action:Gamepad', actionGamepadListener)
  })
  afterEach(() => {
    sandbox.restore()
    Actions.gamepads.Reset()
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => existingNavigator,
    })
    unmountDom()
  })
  const acceptTests: Array<[string, unknown]> = [
    ['a null of gamepads', undefined],
    ['an empty list of gamepads', []],
    ['a null gamepad', [null]],
  ]
  acceptTests.forEach(([title, gamepads]) => {
    it(`should accept ${title}`, () => {
      getTestGamepads.resetBehavior()
      getTestGamepads.returns(gamepads)
      expect(() => {
        Internals.ReadGamepad()
      }).to.not.throw()
    })
  })
  it('should accept a valid gamepad', () => {
    Internals.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(false)
  })
  it('should not read when hidden', () => {
    documentHidden = true
    Internals.ReadGamepad()
    expect(gamepadsReadStub.called).to.equal(false)
  })
  it('should not reset when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.ReadGamepad()
    expect(GamepadResetSpy.called).to.equal(false)
  })
  it('should not publish when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(false)
  })
  it('should use the GamepadButtons to read the gamepads', () => {
    Internals.ReadGamepad()
    expect(gamepadsReadStub.called).to.equal(true)
  })
  it('should pass the gamepad to GamepadButtons.Read', () => {
    Internals.ReadGamepad()
    expect(gamepadsReadStub.calledWithExactly(testGamePad)).to.equal(true)
  })
  it('should not reset the GamepadButtons when read detects no buttons having no history', () => {
    Internals.ReadGamepad()
    expect(GamepadResetSpy.called).to.equal(false)
  })
  it('should reset the GamepadButtons when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Internals.ReadGamepad()
    expect(GamepadResetSpy.called).to.equal(true)
  })
  it('should publish when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(true)
  })
  it('should publish concatenated button names when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.ReadGamepad()
    expect(actionGamepadListener.calledWithExactly(undefined, 'ACTION:GAMEPAD:AQZ')).to.equal(true)
  })
  it('should not publish publish any buttons when read detects no buttons with no history', () => {
    Internals.ReadGamepad()
    expect(actionGamepadListener.called).to.equal(false)
  })
})
