'use sanity'

import {
  subscribe as _subscribe,
  publish as _publish,
  addInterval as _addInterval,
  removeInterval as _removeInterval,
} from './pubsub.js'
import { cloneNode } from './utils.js'
import { isHTMLElement } from '#contracts/markup.js'

import { isListing } from '#contracts/listing.js'
import { hasValue, hasValues } from '#utils/helpers.js'

export const Imports = {
  subscribe: _subscribe,
  publish: _publish,
  addInterval: _addInterval,
  removeInterval: _removeInterval,
}

interface ButtonDefinition {
  name: string
  image: string
}

interface ButtonGroups {
  target: string
  buttons: ButtonDefinition[][]
}

// Position-based indices per the Gamepad API standard mapping:
// https://www.w3.org/TR/gamepad/#remapping
// South/East/West/North refer to physical face-button positions, not the
// vendor-specific labels printed on the controller (Xbox A/B/X/Y, PlayStation
// Cross/Circle/Square/Triangle, Switch B/A/Y/X). Using compass directions
// keeps the mapping vendor-neutral.
const BUTTON_SOUTH = 0
const BUTTON_EAST = 1
const BUTTON_WEST = 3
const BUTTON_NORTH = 2
const BUTTON_L = 4
const BUTTON_R = 5
const BUTTON_LEFT = 14
const BUTTON_RIGHT = 15
const BUTTON_UP = 12
const BUTTON_DOWN = 13
const AXIS_X = 0
const AXIS_Y = 1
const AXIS_CENTERED = 0
const AXIS_ACTIVATION_THRESHOLD = 0.5
const POLLING_INTERVAL = 20
const ZERO_REMAINING_PADS = 0

export class GamepadButtons {
  public buttons: Record<string, number> = {
    South: BUTTON_SOUTH,
    East: BUTTON_EAST,
    West: BUTTON_WEST,
    North: BUTTON_NORTH,
    L: BUTTON_L,
    R: BUTTON_R,
    Left: BUTTON_LEFT,
    Right: BUTTON_RIGHT,
    Up: BUTTON_UP,
    Down: BUTTON_DOWN,
  }

  public pressingNow = false
  public pressedButtons: string[] = []

  public reset(): void {
    this.pressedButtons = []
    this.pressingNow = false
  }

  public static isPressed(pad: Gamepad, button: number): boolean {
    return pad.buttons[button]?.pressed ?? false
  }

  private setButton(btn: string, pressed: boolean): boolean {
    if (pressed && this.pressedButtons.find((v) => v === btn) === undefined) {
      this.pressedButtons.push(btn)
    }
    return pressed
  }

  private readThumbAxis(pad: Gamepad): boolean {
    const Xaxis = pad.axes[AXIS_X] ?? AXIS_CENTERED
    const Yaxis = pad.axes[AXIS_Y] ?? AXIS_CENTERED
    const directions: Array<[string, boolean]> = [
      ['Left', Xaxis < -AXIS_ACTIVATION_THRESHOLD],
      ['Right', Xaxis > AXIS_ACTIVATION_THRESHOLD],
      ['Up', Yaxis < -AXIS_ACTIVATION_THRESHOLD],
      ['Down', Yaxis > AXIS_ACTIVATION_THRESHOLD],
    ]
    let result = false
    for (const [direction, pressed] of directions) {
      result ||= this.setButton(direction, pressed)
    }
    return result
  }

  public read(pad: Gamepad): boolean {
    let result = false
    for (const [name, id] of Object.entries(this.buttons)) {
      result ||= this.setButton(name, GamepadButtons.isPressed(pad, id))
    }
    result ||= this.readThumbAxis(pad)
    this.pressingNow = result
    return result
  }
}

const ActionGroups: ButtonGroups[] = [
  {
    target: '#tabImages',
    buttons: [
      [
        {
          name: 'Previous Image',
          image: 'fast_rewind',
        },
        {
          name: 'Previous Unseen',
          image: 'chevron_left',
        },
        {
          name: 'Fullscreen',
          image: 'fullscreen',
        },
        {
          name: 'Next Unseen',
          image: 'chevron_right',
        },
        {
          name: 'Next Image',
          image: 'fast_forward',
        },
      ],
      [
        {
          name: 'Previous Folder',
          image: 'first_page',
        },
        {
          name: 'View Full Size',
          image: 'open_in_new',
        },
        {
          name: 'Parent Folder',
          image: 'folder',
        },
        {
          name: 'Bookmark',
          image: 'bookmarks',
        },
        {
          name: 'Next Folder',
          image: 'last_page',
        },
      ],
    ],
  },
  {
    target: '#tabFolders',
    buttons: [
      [
        {
          name: 'Previous Folder',
          image: 'first_page',
        },
        {
          name: 'Mark All Seen',
          image: 'check_box',
        },
        {
          name: 'Fullscreen',
          image: 'fullscreen',
        },
        {
          name: 'Parent Folder',
          image: 'folder',
        },
        {
          name: 'Slideshow',
          image: 'slideshow',
        },
        {
          name: 'Mark All Unseen',
          image: 'check_box_outline_blank',
        },
        {
          name: 'Next Folder',
          image: 'last_page',
        },
      ],
    ],
  },
  {
    target: '#tabActions',
    buttons: [
      [
        {
          name: 'First',
          image: 'skip_previous',
        },
        {
          name: 'Previous Image',
          image: 'fast_rewind',
        },
        {
          name: 'Fullscreen',
          image: 'fullscreen',
        },
        {
          name: 'Next Image',
          image: 'fast_forward',
        },
        {
          name: 'Last',
          image: 'skip_next',
        },
      ],
      [
        {
          name: 'Previous Folder',
          image: 'first_page',
        },
        {
          name: 'Previous Unseen',
          image: 'chevron_left',
        },
        {
          name: 'View Full Size',
          image: 'open_in_new',
        },
        {
          name: 'Next Unseen',
          image: 'chevron_right',
        },
        {
          name: 'Next Folder',
          image: 'last_page',
        },
      ],
      [
        {
          name: 'Mark All Seen',
          image: 'check_box',
        },
        {
          name: 'Parent Folder',
          image: 'folder',
        },
        {
          name: 'Bookmark',
          image: 'bookmarks',
        },
        {
          name: 'Slideshow',
          image: 'slideshow',
        },
        {
          name: 'Mark All Unseen',
          image: 'check_box_outline_blank',
        },
      ],
    ],
  },
]

export const Actions = {
  ActionGroups,
  gamepads: new GamepadButtons(),
}

function setInnerTextMaybe(elem: HTMLElement, selector: string, text: string): void {
  const node = elem.querySelector<HTMLElement>(selector)
  if (!hasValue(node)) return
  node.innerText = text
}

function createButtons(buttons: ButtonDefinition[]): HTMLElement {
  const result = document.createElement('div')
  result.classList.add('actions')
  for (const { name, image } of buttons) {
    const template = document.querySelector<HTMLTemplateElement>('#ActionCard')
    const button = cloneNode(template, isHTMLElement)
    if (button === undefined) continue
    Internals.setInnerTextMaybe(button, 'i', image)
    Internals.setInnerTextMaybe(button, 'h5', name)
    button.addEventListener('click', (event) => {
      Imports.publish(`Action:Execute:${name.replace(/\s+/gv, '')}`)
      event.preventDefault()
    })
    result.appendChild(button)
  }
  return result
}

function buildActions(): void {
  for (const group of Actions.ActionGroups) {
    const existing = document.querySelectorAll(`${group.target} .actions`)
    for (const elem of existing) {
      elem.remove()
    }
    for (const row of group.buttons) {
      const container = Internals.createButtons(row)
      document.querySelector(group.target)?.appendChild(container)
    }
  }
}

function readGamepad(): void {
  if (document.hidden) return
  const gamepads = navigator.getGamepads() as Array<Gamepad | null> | undefined
  if (gamepads === undefined || !hasValues(gamepads)) return
  for (const pad of gamepads) {
    if (pad === null) continue
    Actions.gamepads.read(pad)
  }
  if (!Actions.gamepads.pressingNow && hasValues(Actions.gamepads.pressedButtons)) {
    const buttons = Actions.gamepads.pressedButtons.join('')
    Actions.gamepads.reset()
    Imports.publish(`Action:Gamepad:${buttons}`)
  }
}

export function init(): void {
  Internals.buildActions()
  Actions.gamepads.reset()

  Imports.subscribe('Navigate:Data', async (data) => {
    if (isListing(data) && !hasValues(data.pictures) && !hasValues(data.children)) {
      Imports.publish('Tab:Select', 'Actions')
    }
    await Promise.resolve()
  })

  document.addEventListener('keyup', (event) => {
    const key =
      (event.ctrlKey ? '<CTRL>' : '') +
      (event.altKey ? '<ALT>' : '') +
      (event.shiftKey ? '<SHIFT>' : '') +
      event.key.toUpperCase()
    Imports.publish(`Action:Keypress:${key}`, key)
  })
  window.addEventListener('gamepadconnected', () => {
    Imports.addInterval(
      'readGamepad',
      () => {
        Internals.readGamepad()
      },
      POLLING_INTERVAL,
    )
  })
  window.addEventListener('gamepaddisconnected', () => {
    const remaining = navigator.getGamepads().filter((p) => p !== null)
    if (remaining.length === ZERO_REMAINING_PADS) {
      Imports.removeInterval('readGamepad')
    }
  })
}

export const Internals = {
  setInnerTextMaybe,
  createButtons,
  buildActions,
  readGamepad,
}
