import { expect } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import { GamepadButtons } from '../../../../public/scripts/app/actions'

import { Cast } from '../../../testutils/TypeGuards'
import assert from 'assert'

interface TestGamepadButton {
  pressed: boolean
  value: number
  touched: boolean
}
describe('public/app/actions class GamepadButtons', () => {
  let testGamePad: {
    axes: Array<number | undefined>
    buttons: TestGamepadButton[]
  } = {
    axes: [],
    buttons: [],
  }
  let gamePad = Cast<Gamepad>(testGamePad)
  let buttons: GamepadButtons = new GamepadButtons()
  beforeEach(() => {
    buttons = new GamepadButtons()
    testGamePad = {
      axes: [0, 0],
      buttons: Array<TestGamepadButton>(20)
        .fill({ pressed: false, value: -9999, touched: false })
        .map(() => ({ pressed: false, value: 0, touched: false })),
    }
    gamePad = Cast<Gamepad>(testGamePad)
  })

  afterEach(() => {
    buttons.Reset()
  })

  describe('Reset()', () => {
    it('should clear pressedButtons on reset', () => {
      buttons.pressedButtons.push('Q')
      buttons.Reset()
      expect(buttons.pressedButtons).to.deep.equal([])
    })

    it('should not set pressingNow with no buttons or axis defined', () => {
      buttons.Read(gamePad)
      expect(buttons.pressingNow).to.equal(false)
    })
  })

  describe('IsPressed()', () => {
    it('should return false when requested button is not pressed', () => {
      assert(testGamePad.buttons[7] != null)
      testGamePad.buttons[7].pressed = false
      expect(GamepadButtons.IsPressed(gamePad, 7)).to.equal(false)
    })
    it('should return false when requested button is not extant', () => {
      assert(testGamePad.buttons[777] == null)
      expect(GamepadButtons.IsPressed(gamePad, 777)).to.equal(false)
    })

    it('should return true when requested button is pressed', () => {
      assert(testGamePad.buttons[7] != null)
      testGamePad.buttons[7].pressed = true
      expect(GamepadButtons.IsPressed(gamePad, 7)).to.equal(true)
    })
  })

  describe('Read()', () => {
    const validButtons: Array<[string, number]> = [
      ['A', 0],
      ['B', 1],
      ['X', 3],
      ['Y', 2],
      ['L', 4],
      ['R', 5],
      ['Left', 14],
      ['Right', 15],
      ['Up', 12],
      ['Down', 13],
    ]
    validButtons.forEach(([btn, id]) => {
      it(`should register button press when ${btn} is pressed`, () => {
        assert(testGamePad.buttons[id] != null)
        testGamePad.buttons[id].pressed = true
        const pressed = buttons.Read(gamePad)
        expect(pressed).to.equal(true)
        expect(buttons.pressingNow).to.equal(true)
        expect(buttons.pressedButtons).to.deep.equal([btn])
      })

      it(`should not duplicate button press when ${btn} is pressed`, () => {
        assert(testGamePad.buttons[id] != null)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push(btn)
        const pressed = buttons.Read(gamePad)
        expect(pressed).to.equal(true)
        expect(buttons.pressingNow).to.equal(true)
        expect(buttons.pressedButtons).to.deep.equal([btn])
      })

      it(`should not remove non pressed buttons when ${btn} is pressed`, () => {
        assert(testGamePad.buttons[id] != null)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push('Q')
        const pressed = buttons.Read(gamePad)
        expect(pressed).to.equal(true)
        expect(buttons.pressingNow).to.equal(true)
        expect(buttons.pressedButtons).to.deep.equal(['Q', btn])
      })

      it(`should not register button press when ${btn} is not`, () => {
        assert(testGamePad.buttons[id] != null)
        testGamePad.buttons[id].pressed = false
        const pressed = buttons.Read(gamePad)
        expect(pressed).to.equal(false)
        expect(buttons.pressingNow).to.equal(false)
        expect(buttons.pressedButtons).to.deep.equal([])
      })

      it(`should not duplicate button press when ${btn} is pressed`, () => {
        assert(testGamePad.buttons[id] != null)
        testGamePad.buttons[id].pressed = true
        buttons.pressedButtons.push(btn)
        const pressed = buttons.Read(gamePad)
        expect(pressed).to.equal(true)
        expect(buttons.pressingNow).to.equal(true)
        expect(buttons.pressedButtons).to.deep.equal([btn])
      })
    })
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
    validAxis.forEach(([axis, values, expected]) => {
      const pressed = expected ? [axis] : []
      it(`Should ${expected ? 'set' : 'not set'} ${axis} when axis is ${JSON.stringify(values)}`, () => {
        testGamePad.axes = values
        const result = buttons.Read(gamePad)
        expect(result).to.equal(expected)
        expect(buttons.pressingNow).to.equal(expected)
        expect(buttons.pressedButtons).to.deep.equal(pressed)
      })
    })
  })
})
