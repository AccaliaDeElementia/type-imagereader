'use sanity'

import { Actions, Imports, Internals } from '#public/scripts/app/actions.js'

import { resetPubSub } from '#testutils/pubsub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import type { MockInstance } from 'vitest'

describe('public/app/actions readGamepad()', () => {
  const dom: JSDOM = new JSDOM('', {})
  let GamepadResetSpy: MockInstance = vi.fn()

  let existingNavigator: Navigator = global.navigator
  const testGamePad: {
    axes: number[]
    buttons: GamepadButton[]
  } = {
    axes: [],
    buttons: [],
  }

  let getTestGamepads = vi.fn()
  let publishStub: MockInstance = vi.fn()
  let documentHidden = false

  let gamepadsReadStub: MockInstance = vi.fn()

  beforeEach(() => {
    mountDom(dom)
    resetPubSub()
    vi.spyOn(Internals, 'buildActions').mockImplementation((..._args: unknown[]) => undefined)
    Actions.gamepads.reset()
    GamepadResetSpy = vi.spyOn(Actions.gamepads, 'reset').mockImplementation((..._args: unknown[]) => undefined)
    documentHidden = false
    existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    getTestGamepads = vi.fn()
    dom.window.navigator.getGamepads = getTestGamepads
    Object.defineProperty(dom.window.document, 'hidden', {
      configurable: true,
      get: () => documentHidden,
    })
    getTestGamepads.mockReturnValue([testGamePad])
    gamepadsReadStub = vi.spyOn(Actions.gamepads, 'read').mockReturnValue(false)
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
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
      getTestGamepads.mockReturnValue(gamepads)
      expect(() => {
        Internals.readGamepad()
      }).not.toThrow()
    })
  })
  it('should accept a valid gamepad', () => {
    Internals.readGamepad()
    expect(publishStub.mock.calls.length > 0).toBe(false)
  })
  it('should not read when hidden', () => {
    documentHidden = true
    Internals.readGamepad()
    expect(gamepadsReadStub.mock.calls.length > 0).toBe(false)
  })
  it('should not reset when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(GamepadResetSpy.mock.calls.length > 0).toBe(false)
  })
  it('should not publish when hidden', () => {
    documentHidden = true
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(publishStub.mock.calls.length > 0).toBe(false)
  })
  it('should use the GamepadButtons to read the gamepads', () => {
    Internals.readGamepad()
    expect(gamepadsReadStub.mock.calls.length > 0).toBe(true)
  })
  it('should pass the gamepad to GamepadButtons.read', () => {
    Internals.readGamepad()
    expect(gamepadsReadStub).toHaveBeenCalledWith(testGamePad)
  })
  it('should not reset the GamepadButtons when read detects no buttons having no history', () => {
    Internals.readGamepad()
    expect(GamepadResetSpy.mock.calls.length > 0).toBe(false)
  })
  it('should reset the GamepadButtons when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Internals.readGamepad()
    expect(GamepadResetSpy.mock.calls.length > 0).toBe(true)
  })
  it('should publish when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(publishStub.mock.calls.length > 0).toBe(true)
  })
  it('should publish concatenated button names when read detects no buttons', () => {
    Actions.gamepads.pressedButtons.push('A')
    Actions.gamepads.pressedButtons.push('Q')
    Actions.gamepads.pressedButtons.push('Z')
    Internals.readGamepad()
    expect(publishStub).toHaveBeenCalledWith('Action:Gamepad:AQZ')
  })
  it('should not publish publish any buttons when read detects no buttons with no history', () => {
    Internals.readGamepad()
    expect(publishStub.mock.calls.length > 0).toBe(false)
  })
})
