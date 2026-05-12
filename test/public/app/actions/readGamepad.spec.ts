'use sanity'

import Sinon from 'sinon'

import { Actions, Imports, Internals } from '#public/scripts/app/actions.js'

import { resetPubSub } from '#testutils/pubsub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

const sandbox = Sinon.createSandbox()

describe('public/app/actions readGamepad()', () => {
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
  let publishStub = sandbox.stub()
  let documentHidden = false

  let gamepadsReadStub = sandbox.stub()

  beforeEach(() => {
    mountDom(dom)
    resetPubSub()
    sandbox.stub(Internals, 'buildActions')
    Actions.gamepads.reset()
    GamepadResetSpy = sandbox.stub(Actions.gamepads, 'reset')
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
    gamepadsReadStub = sandbox.stub(Actions.gamepads, 'read').returns(false)
    publishStub = sandbox.stub(Imports, 'publish')
  })
  afterEach(() => {
    sandbox.restore()
    Actions.gamepads.reset()
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
        Internals.readGamepad()
      }).not.toThrow()
    })
  })
  it('should accept a valid gamepad', () => {
    Internals.readGamepad()
    expect(publishStub.called).toBe(false)
  })
  it('should not read when hidden', () => {
    documentHidden = true
    Internals.readGamepad()
    expect(gamepadsReadStub.called).toBe(false)
  })
  it('should not reset when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(GamepadResetSpy.called).toBe(false)
  })
  it('should not publish when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(publishStub.called).toBe(false)
  })
  it('should use the GamepadButtons to read the gamepads', () => {
    Internals.readGamepad()
    expect(gamepadsReadStub.called).toBe(true)
  })
  it('should pass the gamepad to GamepadButtons.read', () => {
    Internals.readGamepad()
    expect(gamepadsReadStub.calledWithExactly(testGamePad)).toBe(true)
  })
  it('should not reset the GamepadButtons when read detects no buttons having no history', () => {
    Internals.readGamepad()
    expect(GamepadResetSpy.called).toBe(false)
  })
  it('should reset the GamepadButtons when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Internals.readGamepad()
    expect(GamepadResetSpy.called).toBe(true)
  })
  it('should publish when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(publishStub.called).toBe(true)
  })
  it('should publish concatenated button names when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(publishStub.calledWithExactly('Action:Gamepad:AQZ')).toBe(true)
  })
  it('should not publish publish any buttons when read detects no buttons with no history', () => {
    Internals.readGamepad()
    expect(publishStub.called).toBe(false)
  })
})
