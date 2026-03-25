'use sanity'

import { Subscribe, Publish, AddInterval } from './pubsub'
import { CloneNode, isHTMLElement } from './utils'

import { isListing } from '#contracts/listing'
import { HasValue, HasValues } from '#utils/helpers'

interface ButtonDefinition {
  name: string
  image: string
}

interface ButtonGroups {
  target: string
  buttons: ButtonDefinition[][]
}

const BUTTON_A = 0
const BUTTON_B = 1
const BUTTON_X = 3
const BUTTON_Y = 2
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

export class GamepadButtons {
  public Buttons: Record<string, number> = {
    A: BUTTON_A,
    B: BUTTON_B,
    X: BUTTON_X,
    Y: BUTTON_Y,
    L: BUTTON_L,
    R: BUTTON_R,
    Left: BUTTON_LEFT,
    Right: BUTTON_RIGHT,
    Up: BUTTON_UP,
    Down: BUTTON_DOWN,
  }

  public pressingNow = false
  public pressedButtons: string[] = []

  public Reset(): void {
    this.pressedButtons = []
    this.pressingNow = false
  }

  public static IsPressed(pad: Gamepad, button: number): boolean {
    return pad.buttons[button]?.pressed ?? false
  }

  private SetButton(btn: string, pressed: boolean): boolean {
    if (pressed && this.pressedButtons.find((v) => v === btn) === undefined) {
      this.pressedButtons.push(btn)
    }
    return pressed
  }

  private ReadThumbAxis(pad: Gamepad): boolean {
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
      result ||= this.SetButton(direction, pressed)
    }
    return result
  }

  public Read(pad: Gamepad): boolean {
    let result = false
    for (const [name, id] of Object.entries(this.Buttons)) {
      result ||= this.SetButton(name, GamepadButtons.IsPressed(pad, id))
    }
    result ||= this.ReadThumbAxis(pad)
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
  setInnerTextMaybe: (elem: HTMLElement, selector: string, text: string): void => {
    const node = elem.querySelector<HTMLElement>(selector)
    if (!HasValue(node)) return
    node.innerText = text
  },
  createButtons: (buttons: ButtonDefinition[]): HTMLElement => {
    const result = document.createElement('div')
    result.classList.add('actions')
    for (const { name, image } of buttons) {
      const template = document.querySelector<HTMLTemplateElement>('#ActionCard')
      const button = CloneNode(template, isHTMLElement)
      if (button === undefined) continue
      Actions.setInnerTextMaybe(button, 'i', image)
      Actions.setInnerTextMaybe(button, 'h5', name)
      button.addEventListener('click', (event) => {
        Publish(`Action:Execute:${name.replace(/\s+/gv, '')}`)
        event.preventDefault()
      })
      result.appendChild(button)
    }
    return result
  },
  ActionGroups,
  BuildActions: (): void => {
    for (const group of Actions.ActionGroups) {
      const existing = document.querySelectorAll(`${group.target} .actions`)
      for (const elem of existing) {
        elem.remove()
      }
      for (const row of group.buttons) {
        const container = Actions.createButtons(row)
        document.querySelector(group.target)?.appendChild(container)
      }
    }
  },
  gamepads: ((): GamepadButtons => new GamepadButtons())(),
  ReadGamepad: (): void => {
    if (document.hidden) return
    const gamepads = navigator.getGamepads() as Array<Gamepad | null> | undefined
    if (gamepads === undefined || !HasValues(gamepads)) return
    for (const pad of gamepads) {
      if (pad === null) continue
      Actions.gamepads.Read(pad)
    }
    if (!Actions.gamepads.pressingNow && HasValues(Actions.gamepads.pressedButtons)) {
      const buttons = Actions.gamepads.pressedButtons.join('')
      Actions.gamepads.Reset()
      Publish(`Action:Gamepad:${buttons}`)
    }
  },
  Init: (): void => {
    Actions.BuildActions()
    Actions.gamepads.Reset()

    Subscribe('Navigate:Data', async (data) => {
      if (isListing(data) && !HasValues(data.pictures) && !HasValues(data.children)) {
        Publish('Tab:Select', 'Actions')
      }
      await Promise.resolve()
    })

    document.addEventListener('keyup', (event) => {
      const key =
        (event.ctrlKey ? '<CTRL>' : '') +
        (event.altKey ? '<ALT>' : '') +
        (event.shiftKey ? '<SHIFT>' : '') +
        event.key.toUpperCase()
      Publish(`Action:Keypress:${key}`, key)
    })
    window.addEventListener('gamepadconnected', () => {
      AddInterval(
        'ReadGamepad',
        () => {
          Actions.ReadGamepad()
        },
        POLLING_INTERVAL,
      )
    })
  },
}
