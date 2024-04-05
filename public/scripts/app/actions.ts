'use sanity'

import { Subscribe, Publish, AddInterval } from './pubsub'

interface NavigateData {
  children?: number[]
  pictures?: number[]
}

interface ButtonDefinition {
  name: string
  image: string
}

interface ButtonGroups {
  target: string
  buttons: ButtonDefinition[][]
}

export class Actions {
  static setInnerTextMaybe (node: HTMLElement | null, text: string): void {
    if (node) {
      node.innerText = text
    }
  }

  static createButtons (buttons: ButtonDefinition[]): HTMLElement {
    const result = document.createElement('div')
    result.classList.add('actions')
    for (const { name, image } of buttons) {
      const template = document.querySelector<HTMLTemplateElement>('#ActionCard')
      const button = template?.content.cloneNode(true).firstChild as HTMLElement
      if (!button) continue
      this.setInnerTextMaybe(button.querySelector('i'), image)
      this.setInnerTextMaybe(button.querySelector('h5'), name)
      button.addEventListener('click', event => {
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
            image: 'fast_rewind'
          }, {
            name: 'Previous Unseen',
            image: 'chevron_left'
          }, {
            name: 'Fullscreen',
            image: 'fullscreen'
          }, {
            name: 'Next Unseen',
            image: 'chevron_right'
          }, {
            name: 'Next Image',
            image: 'fast_forward'
          }
        ], [
          {
            name: 'Previous Folder',
            image: 'first_page'
          }, {
            name: 'View Full Size',
            image: 'open_in_new'
          }, {
            name: 'Parent Folder',
            image: 'folder'
          }, {
            name: 'Bookmark',
            image: 'bookmarks'
          }, {
            name: 'Next Folder',
            image: 'last_page'
          }
        ]
      ]
    }, {
      target: '#tabFolders',
      buttons: [
        [
          {
            name: 'Previous Folder',
            image: 'first_page'
          }, {
            name: 'Mark All Seen',
            image: 'check_box'
          }, {
            name: 'Fullscreen',
            image: 'fullscreen'
          }, {
            name: 'Parent Folder',
            image: 'folder'
          }, {
            name: 'Slideshow',
            image: 'slideshow'
          }, {
            name: 'Mark All Unseen',
            image: 'check_box_outline_blank'
          }, {
            name: 'Next Folder',
            image: 'last_page'
          }
        ]
      ]
    }, {
      target: '#tabActions',
      buttons: [
        [
          {
            name: 'First',
            image: 'skip_previous'
          }, {
            name: 'Previous Image',
            image: 'fast_rewind'
          }, {
            name: 'Fullscreen',
            image: 'fullscreen'
          }, {
            name: 'Next Image',
            image: 'fast_forward'
          }, {
            name: 'Last',
            image: 'skip_next'
          }
        ], [
          {
            name: 'Previous Folder',
            image: 'first_page'
          }, {
            name: 'Previous Unseen',
            image: 'chevron_left'
          }, {
            name: 'View Full Size',
            image: 'open_in_new'
          }, {
            name: 'Next Unseen',
            image: 'chevron_right'
          }, {
            name: 'Next Folder',
            image: 'last_page'
          }
        ], [
          {
            name: 'Mark All Seen',
            image: 'check_box'
          }, {
            name: 'Parent Folder',
            image: 'folder'
          }, {
            name: 'Bookmark',
            image: 'bookmarks'
          }, {
            name: 'Slideshow',
            image: 'slideshow'
          }, {
            name: 'Mark All Unseen',
            image: 'check_box_outline_blank'
          }
        ]
      ]
    }
  ]

  public static BuildActions (): void {
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

  protected static lastStatus = {
    A: false,
    B: false,
    X: false,
    Y: false,
    L: false,
    R: false,
    Left: false,
    Right: false,
    Up: false,
    Down: false
  }

  public static ReadGamepad (): void {
    if (document.hidden) return
    for (const pad of navigator.getGamepads() || []) {
      if (!pad) continue
      const Xaxis = pad.axes[0] || 0
      const Yaxis = pad.axes[1] || 0
      const status = {
        A: pad.buttons[1]?.pressed || false,
        B: pad.buttons[0]?.pressed || false,
        X: pad.buttons[3]?.pressed || false,
        Y: pad.buttons[2]?.pressed || false,
        L: pad.buttons[4]?.pressed || false,
        R: pad.buttons[5]?.pressed || false,
        Left: Xaxis < -0.5,
        Right: Xaxis > 0.5,
        Up: Yaxis < -0.5,
        Down: Yaxis > 0.5
      }
      const pressing = Object.values(status).reduce((a, b) => a || b, false)
      const pressed = Object.values(this.lastStatus).reduce((a, b) => a || b, false)
      if (pressing) {
        this.lastStatus.A ||= status.A
        this.lastStatus.B ||= status.B
        this.lastStatus.X ||= status.X
        this.lastStatus.Y ||= status.Y
        this.lastStatus.L ||= status.L
        this.lastStatus.R ||= status.R
        this.lastStatus.Left ||= status.Left
        this.lastStatus.Right ||= status.Right
        this.lastStatus.Up ||= status.Up
        this.lastStatus.Down ||= status.Down
      } else if (pressed) {
        const buttons = Object.entries(this.lastStatus).filter(([_, val]) => val).map(([key, _]) => key).join('')
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

  public static Init () {
    this.BuildActions()

    Subscribe('Navigate:Data', (data: NavigateData) => {
      if (!data.children?.length && !data.pictures?.length) {
        Publish('Tab:Select', 'Actions')
      }
    })

    document.addEventListener('keyup', event => {
      const key = (event.ctrlKey ? '<CTRL>' : '') +
        (event.altKey ? '<ALT>' : '') +
        (event.shiftKey ? '<SHIFT>' : '') +
        event.key.toUpperCase()
      Publish(`Action:Keypress:${key}`, key)
    })
    window.addEventListener('gamepadconnected', () => AddInterval('ReadGamepad', () => this.ReadGamepad(), 20))
  }
}
