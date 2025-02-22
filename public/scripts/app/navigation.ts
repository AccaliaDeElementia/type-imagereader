'use sanity'

import { Pictures } from './pictures'
import { Net } from './net'
import { Publish, Subscribe } from './pubsub'

export interface ChildFolder {
  name: string
  path: string
  totalCount: number
  totalSeen: number
}

export interface Data {
  path: string
  noMenu?: boolean
  name?: string
  parent?: string
  next?: Data
  nextUnread?: Data
  prev?: Data
  prevUnread?: Data
  pictures?: object[]
  children?: ChildFolder[]
}

interface NoMenuPath {
  path: string
  noMenu: boolean
}

export class Navigation {
  public static get BaseUrl (): string {
    return [
      window.location.protocol,
      '//',
      window.location.hostname,
      window.location.port.length > 0 ? `:${window.location.port}` : '',
      window.location.pathname.split('/').slice(0, 2).join('/')
    ].join('')
  }

  public static get FolderPath (): string {
    const path = window.location.pathname.replace(/^\/[^/]+/, '')
    return path != null && path.length > 0 ? path : '/'
  }

  public static LocationAssign?: (url: string | URL) => void

  public static get IsMenuActive (): boolean {
    const mainMenu = document.querySelector('#mainMenu')
    return !(mainMenu?.classList.contains('hidden') ?? false)
  }

  public static get IsSuppressMenu (): boolean {
    return new URLSearchParams(window.location.search).has('noMenu')
  }

  protected static current: Data = {
    path: ''
  }

  public static NavigateTo (path: string | undefined, action: string): void {
    if (path == null || path.length < 1) {
      Publish('Loading:Error', `Action ${action} has no target`)
      return
    }
    this.current = { path }
    this.LoadData().catch(() => {})
  }

  public static Init (): void {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.LocationAssign = window.location.assign
    this.current.path = this.FolderPath
    this.LoadData().catch(() => {})
    Subscribe('Navigate:Load', (path: string | NoMenuPath): void => {
      if (typeof path === 'string') {
        this.current = { path }
      } else {
        this.current = path
      }
      this.LoadData().catch(() => {})
    })
    Subscribe('Navigate:Reload', () => { this.LoadData().catch(() => {}) })
    window.addEventListener('popstate', () => {
      this.current = {
        path: this.FolderPath
      }
      this.LoadData(true).catch(() => {})
    })

    Subscribe('Navigate:Data', (data: any): void => { window.console.log(data) })

    const mainMenu = document.querySelector('#mainMenu')
    Subscribe('Menu:Show', () => mainMenu?.classList.remove('hidden'))
    Subscribe('Menu:Hide', () => mainMenu?.classList.add('hidden'))
    mainMenu?.addEventListener('click', (event) => {
      if (event.target === mainMenu && this.current.pictures != null && this.current.pictures.length > 0) {
        Publish('Menu:Hide')
      }
    })

    document.querySelector('.menuButton')?.addEventListener('click', () => {
      Publish('Menu:Show')
    })

    Subscribe('Action:Execute:PreviousFolder', () => {
      const prev = Pictures.ShowUnreadOnly ? this.current.prevUnread : this.current.prev
      this.NavigateTo(prev?.path, 'PreviousFolder')
    })
    Subscribe('Action:Execute:NextFolder', () => {
      const next = Pictures.ShowUnreadOnly ? this.current.nextUnread : this.current.next
      this.NavigateTo(next?.path, 'NextFolder')
    })
    Subscribe('Action:Execute:ParentFolder', () => { this.NavigateTo(this.current.parent, 'ParentFolder') })
    Subscribe('Action:Execute:FirstUnfinished', () => {
      const target = this.current.children?.filter(child => child.totalSeen < child.totalCount)[0]
      this.NavigateTo(target?.path, 'FirstUnfinished')
    })
    Subscribe('Action:Execute:ShowMenu', () => { Publish('Menu:Show') })
    Subscribe('Action:Execute:HideMenu', () => { Publish('Menu:Hide') })
    Subscribe('Action:Execute:MarkAllSeen', () => {
      Net.PostJSON('/api/mark/read', { path: this.current.path })
        .then(async () => { await this.LoadData(true) }, err => { Publish('Loading:Error', err) })
        .catch(() => {})
    })
    Subscribe('Action:Execute:MarkAllUnseen', () => {
      Net.PostJSON('/api/mark/unread', { path: this.current.path })
        .then(async () => { await this.LoadData(true) }, err => { Publish('Loading:Error', err) })
        .catch(() => {})
    })
    Subscribe('Action:Execute:Slideshow', () => {
      Navigation.LocationAssign?.call(window.location, `/slideshow${this.current.path}`)
    })
    Subscribe('Action:Execute:FullScreen', () => {
      if (document.fullscreenElement == null) {
        document.body.requestFullscreen({ navigationUI: 'hide' })
          .catch(err => { Publish('Loading:Error', err) })
      } else {
        document.exitFullscreen().catch(err => { Publish('Loading:Error', err) })
      }
    })

    Subscribe('Action:Keypress:<Ctrl>ArrowUp', () => { Publish('Action:Execute:ParentFolder') })
    Subscribe('Action:Keypress:<Ctrl>ArrowDown', () => { Publish('Action:Execute:FirstUnfinished') })
    Subscribe('Action:Keypress:<Ctrl>ArrowLeft', () => { Publish('Action:Execute:PreviousFolder') })
    Subscribe('Action:Keypress:<Ctrl>ArrowRight', () => { Publish('Action:Execute:NextFolder') })
    Subscribe('Action:Gamepad:Down', () => { Publish('Action:Execute:PreviousFolder') })
    Subscribe('Action:Gamepad:Up', () => { Publish('Action:Execute:NextFolder') })
    Subscribe('Action:Gamepad:Y', () => { Publish('Action:Execute:ParentFolder') })
    Subscribe('Action:Gamepad:A', () => { Publish('Action:Execute:FirstUnfinished') })
  }

  public static async LoadData (noHistory: boolean = false): Promise<void> {
    try {
      Publish('Loading:Show')
      this.current = await Net.GetJSON<Data>(`/api/listing${this.current.path}`)
      this.current.noMenu = this.IsSuppressMenu
      for (const element of document.querySelectorAll('head title, a.navbar-brand')) {
        let name = this.current.name
        if (name == null || name.length < 1) {
          name = this.current.path
        }
        element.innerHTML = name
      }
      if (!noHistory) {
        window.history.pushState({}, '', this.BaseUrl + this.current.path)
      }
      Publish('Loading:Hide')
      Publish('Navigate:Data', this.current)
    } catch (err) {
      Publish('Loading:Error', err)
    }
  }
}
