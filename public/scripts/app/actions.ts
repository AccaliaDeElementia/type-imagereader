'use sanity'

import { Subscribe, Publish, AddInterval } from './pubsub'
import { CloneNode, isHTMLElement } from './utils'

interface NavigateData {
  children?: unknown[]
  pictures?: unknown[]
}

export function isNavigateData(obj: unknown): obj is NavigateData {
  if (obj == null || typeof obj !== 'object') return false
  if ('children' in obj && !(obj.children instanceof Array || obj.children === undefined)) return false
  if ('pictures' in obj && !(obj.pictures instanceof Array || obj.pictures === undefined)) return false
  return true
}

interface ButtonDefinition {
  name: string
  image: string
}

interface ButtonGroups {
  target: string
  buttons: ButtonDefinition[][]
}
interface GamepadStatus {
  A: boolean
  B: boolean
  X: boolean
  Y: boolean
  L: boolean
  R: boolean
  Left: boolean
  Right: boolean
  Up: boolean
  Down: boolean
}

function EitherOr(a: boolean, b: boolean): boolean {
  return a || b
}
export class Actions {
  static setInnerTextMaybe(node: HTMLElement | null, text: string): void {
    if (node != null) {
      node.innerText = text
    }
  }

  static createButtons(buttons: ButtonDefinition[]): HTMLElement {
    const result = document.createElement('div')
    result.classList.add('actions')
    for (const { name, image } of buttons) {
      const template = document.querySelector<HTMLTemplateElement>('#ActionCard')
      const button = CloneNode(template, isHTMLElement)
      if (button == null) continue
      this.setInnerTextMaybe(button.querySelector('i'), image)
      this.setInnerTextMaybe(button.querySelector('h5'), name)
      button.addEventListener('click', (event) => {
        Publish(`Action:Execute:${name.replace(/\s+/g, '')}`)
        event.preventDefault()
        return false
      })
      result.appendChild(button)
    }
    return result
  }

  public static ActionGroups: ButtonGroups[] = [
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

  public static BuildActions(): void {
    for (const group of this.ActionGroups) {
      const existing = document.querySelectorAll(`${group.target} .actions`)
      for (const elem of existing) {
        elem.remove()
      }
      for (const row of group.buttons) {
        const container = this.createButtons(row)
        document.querySelector(group.target)?.appendChild(container)
      }
    }
  }

  protected static lastStatus: GamepadStatus = {
    A: false,
    B: false,
    X: false,
    Y: false,
    L: false,
    R: false,
    Left: false,
    Right: false,
    Up: false,
    Down: false,
  }

  public static ReadGamepadButton(pad: Gamepad, button: number): boolean {
    return pad.buttons[button]?.pressed ?? false
  }

  public static GetGamepadStatus(pad: Gamepad): GamepadStatus {
    const Xaxis = pad.axes[0] ?? 0
    const Yaxis = pad.axes[1] ?? 0
    return {
      A: this.ReadGamepadButton(pad, 0),
      B: this.ReadGamepadButton(pad, 1),
      X: this.ReadGamepadButton(pad, 3),
      Y: this.ReadGamepadButton(pad, 2),
      L: this.ReadGamepadButton(pad, 4),
      R: this.ReadGamepadButton(pad, 5),
      Left: Xaxis < -0.5 || this.ReadGamepadButton(pad, 14),
      Right: Xaxis > 0.5 || this.ReadGamepadButton(pad, 15),
      Up: Yaxis < -0.5 || this.ReadGamepadButton(pad, 12),
      Down: Yaxis > 0.5 || this.ReadGamepadButton(pad, 13),
    }
  }

  public static FoldStatus(status: GamepadStatus): void {
    this.lastStatus.A = EitherOr(this.lastStatus.A, status.A)
    this.lastStatus.B = EitherOr(this.lastStatus.B, status.B)
    this.lastStatus.Y = EitherOr(this.lastStatus.Y, status.Y)
    this.lastStatus.X = EitherOr(this.lastStatus.X, status.X)
    this.lastStatus.L = EitherOr(this.lastStatus.L, status.L)
    this.lastStatus.R = EitherOr(this.lastStatus.R, status.R)

    this.lastStatus.Left = EitherOr(this.lastStatus.Left, status.Left)
    this.lastStatus.Right = EitherOr(this.lastStatus.Right, status.Right)
    this.lastStatus.Up = EitherOr(this.lastStatus.Up, status.Up)
    this.lastStatus.Down = EitherOr(this.lastStatus.Down, status.Down)
  }

  public static ReadGamepad(): void {
    if (document.hidden) return
    const gamepads = navigator.getGamepads() as Array<Gamepad | null> | undefined
    if (gamepads == null || gamepads.length < 1) return
    for (const pad of gamepads) {
      if (pad == null) continue
      const status = this.GetGamepadStatus(pad)
      const pressing = Object.values(status)
        .map((v) => v === true)
        .reduce((a, b) => a || b, false)
      const pressed = Object.values(this.lastStatus)
        .map((v) => v === true)
        .reduce((a, b) => a || b, false)
      if (pressing) {
        this.FoldStatus(status)
      } else if (pressed) {
        const buttons = Object.entries(this.lastStatus)
          .filter(([_, val]) => val === true)
          .map(([key, _]) => key)
          .join('')
        this.lastStatus.A = false
        this.lastStatus.B = false
        this.lastStatus.X = false
        this.lastStatus.Y = false
        this.lastStatus.L = false
        this.lastStatus.R = false
        this.lastStatus.Left = false
        this.lastStatus.Right = false
        this.lastStatus.Up = false
        this.lastStatus.Down = false
        Publish(`Action:Gamepad:${buttons}`)
      }
    }
  }

  public static Init(): void {
    this.BuildActions()

    Subscribe('Navigate:Data', (data) => {
      if (
        isNavigateData(data) &&
        (data.pictures == null || data.pictures.length < 1) &&
        (data.children == null || data.children.length < 1)
      ) {
        Publish('Tab:Select', 'Actions')
      }
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
          this.ReadGamepad()
        },
        20,
      )
    })
  }
}
