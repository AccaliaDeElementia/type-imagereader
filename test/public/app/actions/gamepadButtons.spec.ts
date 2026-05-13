'use sanity'

import { GamepadButtons } from '#public/scripts/app/actions.js'

import { cast } from '#testutils/typeGuards.js'
import assert from 'node:assert'

interface TestGamepadButton {
  pressed: boolean
  value: number
  touched: boolean
}

interface TestGamepad {
  axes: Array<number | undefined>
  buttons: TestGamepadButton[]
}

describe('public/app/actions GamepadButtons', () => {
  let testGamePad: TestGamepad = {
    axes: [],
    buttons: [],
  }
  let gamePad = cast<Gamepad>(testGamePad)
  let buttons: GamepadButtons = new GamepadButtons()
  beforeEach(() => {
    buttons = new GamepadButtons()
    testGamePad = {
      axes: [0, 0],
      buttons: Array<TestGamepadButton>(20)
        .fill({ pressed: false, value: -9999, touched: false })
        .map(() => ({ pressed: false, value: 0, touched: false })),
    }
    gamePad = cast<Gamepad>(testGamePad)
  })

  afterEach(() => {
    buttons.reset()
  })

  describe('reset()', () => {
    it('should clear pressedButtons on reset', () => {
      buttons.pressedButtons.push('Q')
      buttons.reset()
      expect(buttons.pressedButtons).toEqual([])
    })

    it('should not set pressingNow with no buttons or axis defined', () => {
      buttons.read(gamePad)
      expect(buttons.pressingNow).toBe(false)
    })
  })

  describe('isPressed()', () => {
    it('should return false when requested button is not pressed', () => {
      assert(testGamePad.buttons[7] !== undefined)
      testGamePad.buttons[7].pressed = false
      expect(GamepadButtons.isPressed(gamePad, 7)).toBe(false)
    })
    it('should return false when requested button is not extant', () => {
      assert(testGamePad.buttons[777] === undefined)
      expect(GamepadButtons.isPressed(gamePad, 777)).toBe(false)
    })

    it('should return true when requested button is pressed', () => {
      assert(testGamePad.buttons[7] !== undefined)
      testGamePad.buttons[7].pressed = true
      expect(GamepadButtons.isPressed(gamePad, 7)).toBe(true)
    })
  })

  const ReadButtonTests = (): void => {
    const validButtons: Array<[string, number]> = [
      ['South', 0],
      ['East', 1],
      ['West', 3],
      ['North', 2],
      ['L', 4],
      ['R', 5],
      ['Left', 14],
      ['Right', 15],
      ['Up', 12],
      ['Down', 13],
    ]
    validButtons.forEach(([btn, id]: [string, number]): void => {
      it(`should return true when ${btn} is pressed`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        expect(buttons.read(gamePad)).toBe(true)
      })
      it(`should set pressingNow when ${btn} is pressed`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.read(gamePad)
        expect(buttons.pressingNow).toBe(true)
      })
      it(`should add ${btn} to pressedButtons when ${btn} is pressed`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.read(gamePad)
        expect(buttons.pressedButtons).toEqual([btn])
      })

      it(`should return true when ${btn} is already tracked and pressed again`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push(btn)
        expect(buttons.read(gamePad)).toBe(true)
      })
      it(`should set pressingNow when ${btn} is already tracked and pressed again`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push(btn)
        buttons.read(gamePad)
        expect(buttons.pressingNow).toBe(true)
      })
      it(`should not duplicate ${btn} in pressedButtons when already tracked`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push(btn)
        buttons.read(gamePad)
        expect(buttons.pressedButtons).toEqual([btn])
      })

      it(`should return true when ${btn} is pressed alongside pre-existing button`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push('Q')
        expect(buttons.read(gamePad)).toBe(true)
      })
      it(`should set pressingNow when ${btn} is pressed alongside pre-existing button`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push('Q')
        buttons.read(gamePad)
        expect(buttons.pressingNow).toBe(true)
      })
      it(`should keep pre-existing button and add ${btn} to pressedButtons`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push('Q')
        buttons.read(gamePad)
        expect(buttons.pressedButtons).toEqual(['Q', btn])
      })

      it(`should return false when ${btn} is not pressed`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = false
        expect(buttons.read(gamePad)).toBe(false)
      })
      it(`should not set pressingNow when ${btn} is not pressed`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = false
        buttons.read(gamePad)
        expect(buttons.pressingNow).toBe(false)
      })
      it(`should leave pressedButtons empty when ${btn} is not pressed`, () => {
        assert(testGamePad.buttons[id] !== undefined)
        testGamePad.buttons[id].pressed = false
        buttons.read(gamePad)
        expect(buttons.pressedButtons).toEqual([])
      })
    })
  }

  const ReadAxisTests = (): void => {
    const validAxis: Array<[string, Array<number | undefined>, boolean]> = [
      ['Left', [-10, 0], true],
      ['Left', [-1.5, 0], true],
      ['Left', [-1, 0], true],
      ['Left', [-0.66, 0], true],
      ['Left', [-0.5000000000001, 0], true],
      ['Left', [-0.5, 0], false],
      ['Left', [-0.49999, 0], false],
      ['Left', [-0.33, 0], false],
      ['Left', [-0, 0], false],
      ['Left', [undefined, 0], false],
      ['Right', [10, 0], true],
      ['Right', [1.5, 0], true],
      ['Right', [1, 0], true],
      ['Right', [0.66, 0], true],
      ['Right', [0.5000000000001, 0], true],
      ['Right', [0.5, 0], false],
      ['Right', [0.49999, 0], false],
      ['Right', [0.33, 0], false],
      ['Right', [0, 0], false],
      ['Right', [undefined, 0], false],
      ['Up', [0, -10], true],
      ['Up', [0, -1.5], true],
      ['Up', [0, -1], true],
      ['Up', [0, -0.66], true],
      ['Up', [0, -0.5000000000001], true],
      ['Up', [0, -0.5], false],
      ['Up', [0, -0.49099], false],
      ['Up', [0, -0.33], false],
      ['Up', [0, undefined], false],
      ['Down', [0, 10], true],
      ['Down', [0, 1.5], true],
      ['Down', [0, 1], true],
      ['Down', [0, 0.66], true],
      ['Down', [0, 0.5000000000001], true],
      ['Down', [0, 0.5], false],
      ['Down', [0, 0.49999], false],
      ['Down', [0, 0.33], false],
      ['Down', [0, 0], false],
      ['Down', [0, undefined], false],
    ]
    validAxis.forEach(([axis, values, expected]: [string, Array<number | undefined>, boolean]): void => {
      const pressed = expected ? [axis] : []
      it(`should return ${String(expected)} for ${axis} axis ${JSON.stringify(values)}`, () => {
        testGamePad.axes = values
        expect(buttons.read(gamePad)).toBe(expected)
      })
      it(`should set pressingNow to ${String(expected)} for ${axis} axis ${JSON.stringify(values)}`, () => {
        testGamePad.axes = values
        buttons.read(gamePad)
        expect(buttons.pressingNow).toBe(expected)
      })
      it(`should set pressedButtons to ${JSON.stringify(pressed)} for ${axis} axis ${JSON.stringify(values)}`, () => {
        testGamePad.axes = values
        buttons.read(gamePad)
        expect(buttons.pressedButtons).toEqual(pressed)
      })
    })
  }
  describe('read()', () => {
    ReadButtonTests()
    ReadAxisTests()
  })
})
