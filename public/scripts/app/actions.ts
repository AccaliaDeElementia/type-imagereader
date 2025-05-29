'use sanity'

import { Subscribe, Publish, AddInterval } from './pubsub'
import { CloneNode, isHTMLElement } from './utils'

import { isListing } from '../../../contracts/listing'

interface ButtonDefinition {
  name: string
  image: string
}

interface ButtonGroups {
  target: string
  buttons: ButtonDefinition[][]
}

export class GamepadButtons {
  public Buttons: Record<string, number> = {
    A: 0,
    B: 1,
    X: 3,
    Y: 2,
    L: 4,
    R: 5,
    Left: 14,
    Right: 15,
    Up: 12,
    Down: 13,
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
    if (pressed && this.pressedButtons.find((v) => v === btn) == null) {
      this.pressedButtons.push(btn)
    }
    return pressed
  }

  private ReadThumbAxis(pad: Gamepad): boolean {
    const Xaxis = pad.axes[0] ?? 0
    const Yaxis = pad.axes[1] ?? 0
    const directions: Array<[string, boolean]> = [
      ['Left', Xaxis < -0.5],
      ['Right', Xaxis > 0.5],
      ['Up', Yaxis < -0.5],
      ['Down', Yaxis > 0.5],
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
  setInnerTextMaybe: (node: HTMLElement | null, text: string): void => {
    if (node != null) {
      node.innerText = text
    }
  },
  createButtons: (buttons: ButtonDefinition[]): HTMLElement => {
    const result = document.createElement('div')
    result.classList.add('actions')
    for (const { name, image } of buttons) {
      const template = document.querySelector<HTMLTemplateElement>('#ActionCard')
      const button = CloneNode(template, isHTMLElement)
      if (button == null) continue
      Actions.setInnerTextMaybe(button.querySelector('i'), image)
      Actions.setInnerTextMaybe(button.querySelector('h5'), name)
      button.addEventListener('click', (event) => {
        Publish(`Action:Execute:${name.replace(/\s+/g, '')}`)
        event.preventDefault()
        return false
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
    if (gamepads == null || gamepads.length < 1) return
    for (const pad of gamepads) {
      if (pad == null) continue
      Actions.gamepads.Read(pad)
    }
    if (!Actions.gamepads.pressingNow && Actions.gamepads.pressedButtons.length > 0) {
      const buttons = Actions.gamepads.pressedButtons.join('')
      Actions.gamepads.Reset()
      Publish(`Action:Gamepad:${buttons}`)
    }
  },
  Init: (): void => {
    Actions.BuildActions()
    Actions.gamepads.Reset()

    Subscribe('Navigate:Data', async (data) => {
      if (
        isListing(data) &&
        (data.pictures == null || data.pictures.length < 1) &&
        (data.children == null || data.children.length < 1)
      ) {
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
        20,
      )
    })
  },
}
