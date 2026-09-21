'use sanity'

import { GamepadButtons } from '#public/scripts/app/actions.js'

import { cast } from '#testutils/typeGuards.js'

interface TestGamepadButton {
  pressed: boolean
  value: number
  touched: boolean
}

interface TestGamepad {
  axes: Array<number | undefined>
  buttons: TestGamepadButton[]
}

interface ReadOutcome {
  result: boolean
  pressingNow: boolean
  pressedButtons: string[]
}

const PRE_EXISTING_BUTTON = 'Q'
const ABSENT_BUTTON_INDEX = 777
const TEST_BUTTON_INDEX = 7
const AXIS_X = 0
const AXIS_Y = 1

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

  const setButtonPressed = (index: number, pressed: boolean): void => {
    const button = testGamePad.buttons[index]
    if (button === undefined) {
      throw new Error(`test fixture has no gamepad button at index ${index}`)
    }
    button.pressed = pressed
  }

  const readOutcome = (): ReadOutcome => {
    const result = buttons.read(gamePad)
    return { result, pressingNow: buttons.pressingNow, pressedButtons: buttons.pressedButtons }
  }

  describe('reset()', () => {
    it('should clear both pressedButtons and pressingNow on reset', () => {
      buttons.pressedButtons.push(PRE_EXISTING_BUTTON)
      buttons.pressingNow = true
      buttons.reset()
      expect({ pressedButtons: buttons.pressedButtons, pressingNow: buttons.pressingNow }).toEqual({
        pressedButtons: [],
        pressingNow: false,
      })
    })
  })

  describe('isPressed()', () => {
    it('should return false when requested button is not pressed', () => {
      setButtonPressed(TEST_BUTTON_INDEX, false)
      expect(GamepadButtons.isPressed(gamePad, TEST_BUTTON_INDEX)).toBe(false)
    })
    it('should return false when requested button is not extant', () => {
      expect({
        extant: testGamePad.buttons[ABSENT_BUTTON_INDEX] !== undefined,
        pressed: GamepadButtons.isPressed(gamePad, ABSENT_BUTTON_INDEX),
      }).toEqual({ extant: false, pressed: false })
    })

    it('should return true when requested button is pressed', () => {
      setButtonPressed(TEST_BUTTON_INDEX, true)
      expect(GamepadButtons.isPressed(gamePad, TEST_BUTTON_INDEX)).toBe(true)
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
    interface ReadScenario {
      scenario: string
      pressed: boolean
      alreadyTracked: (button: string) => string[]
      expectedTracked: (button: string) => string[]
    }
    const readScenarios: ReadScenario[] = [
      {
        scenario: 'is pressed',
        pressed: true,
        alreadyTracked: () => [],
        expectedTracked: (button) => [button],
      },
      {
        scenario: 'is pressed while already tracked',
        pressed: true,
        alreadyTracked: (button) => [button],
        expectedTracked: (button) => [button],
      },
      {
        scenario: `is pressed alongside the pre-existing ${PRE_EXISTING_BUTTON}`,
        pressed: true,
        alreadyTracked: () => [PRE_EXISTING_BUTTON],
        expectedTracked: (button) => [PRE_EXISTING_BUTTON, button],
      },
      {
        scenario: 'is not pressed',
        pressed: false,
        alreadyTracked: () => [],
        expectedTracked: () => [],
      },
    ]
    validButtons.forEach(([button, index]: [string, number]): void => {
      readScenarios.forEach(({ scenario, pressed, alreadyTracked, expectedTracked }: ReadScenario): void => {
        const tracked = expectedTracked(button)
        it(`should report ${String(pressed)} and track ${JSON.stringify(tracked)} when ${button} ${scenario}`, () => {
          setButtonPressed(index, pressed)
          buttons.pressedButtons.push(...alreadyTracked(button))
          expect(readOutcome()).toEqual({ result: pressed, pressingNow: pressed, pressedButtons: tracked })
        })
      })
    })
  }

  const ReadAxisTests = (): void => {
    interface AxisDirection {
      direction: string
      index: number
      sign: number
    }
    const axisDirections: AxisDirection[] = [
      { direction: 'Left', index: AXIS_X, sign: -1 },
      { direction: 'Right', index: AXIS_X, sign: 1 },
      { direction: 'Up', index: AXIS_Y, sign: -1 },
      { direction: 'Down', index: AXIS_Y, sign: 1 },
    ]
    const axisMagnitudes: Array<[number | undefined, boolean]> = [
      [10, true],
      [1.5, true],
      [1, true],
      [0.66, true],
      [0.5000000000001, true],
      [0.5, false],
      [0.49999, false],
      [0.33, false],
      [0, false],
      [undefined, false],
    ]
    axisDirections.forEach(({ direction, index, sign }: AxisDirection): void => {
      axisMagnitudes.forEach(([magnitude, expected]: [number | undefined, boolean]): void => {
        const axes: Array<number | undefined> = [0, 0]
        axes[index] = magnitude === undefined ? undefined : sign * magnitude
        const tracked = expected ? [direction] : []
        const reading = String(axes[index])
        it(`should report ${String(expected)} and track ${JSON.stringify(tracked)} when the ${direction} axis reads ${reading}`, () => {
          testGamePad.axes = axes
          expect(readOutcome()).toEqual({ result: expected, pressingNow: expected, pressedButtons: tracked })
        })
      })
    })
  }
  describe('read()', () => {
    ReadButtonTests()
    ReadAxisTests()
  })
})
