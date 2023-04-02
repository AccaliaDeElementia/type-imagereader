'use sanity'

import { Net } from './net'
import { Publish, Subscribe } from './pubsub'

export interface Data {
  path: string
  noMenu?: boolean
  name?: string
  parent?: string
  next?: Data
  prev?: Data
  pictures?: object[]
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
      window.location.port.length ? `:${window.location.port}` : '',
      window.location.pathname.split('/').slice(0, 2).join('/')
    ].join('')
  }

  public static get FolderPath () : string {
    return window.location.pathname.replace(/^\/[^/]+/, '') || '/'
  }

  public static get IsMenuActive (): boolean {
    const mainMenu = document.querySelector('#mainMenu')
    return !mainMenu?.classList.contains('hidden')
  }

  public static get IsSuppressMenu (): boolean {
    return new URLSearchParams(window.location.search).has('noMenu')
  }

  protected static current: Data = {
    path: ''
  }

  public static NavigateTo (path: string|undefined, action: string):void {
    if (!path) {
      Publish('Loading:Error', `Action ${action} has no target`)
      return
    }
    this.current = { path }
    this.LoadData()
  }

  public static Init () {
    this.current.path = this.FolderPath
    this.LoadData()
    Subscribe('Navigate:Load', (path: string | NoMenuPath): void => {
      if (typeof path === 'string') {
        this.current = { path: path as string }
      } else {
        this.current = path
      }
      this.LoadData()
    })
    Subscribe('Navigate:Reload', () => this.LoadData())
    window.addEventListener('popstate', () => {
      this.current = {
        path: this.FolderPath
      }
      this.LoadData(true)
    })

    Subscribe('Navigate:Data', (data: any):void => window.console.log(data))

    const mainMenu = document.querySelector('#mainMenu')
    Subscribe('Menu:Show', () => mainMenu?.classList.remove('hidden'))
    Subscribe('Menu:Hide', () => mainMenu?.classList.add('hidden'))
    mainMenu?.addEventListener('click', (event) => {
      if (event.target === mainMenu && this.current.pictures && this.current.pictures.length > 0) {
        Publish('Menu:Hide')
      }
    })

    document.querySelector('.menuButton')?.addEventListener('click', () => {
      Publish('Menu:Show')
    })

    Subscribe('Action:Execute:PreviousFolder', () => this.NavigateTo(this.current.prev?.path, 'PreviousFolder'))
    Subscribe('Action:Execute:NextFolder', () => this.NavigateTo(this.current.next?.path, 'NextFolder'))
    Subscribe('Action:Execute:ParentFolder', () => this.NavigateTo(this.current.parent, 'ParentFolder'))
    Subscribe('Action:Execute:ShowMenu', () => Publish('Menu:Show'))
    Subscribe('Action:Execute:HideMenu', () => Publish('Menu:Hide'))
    Subscribe('Action:Execute:MarkAllSeen', () =>
      Net.PostJSON('/api/mark/read', { path: this.current.path })
        .finally(() => this.LoadData(true)))
    Subscribe('Action:Execute:MarkAllUnseen', () =>
      Net.PostJSON('/api/mark/unread', { path: this.current.path })
        .finally(() => this.LoadData(true)))
    Subscribe('Action:Execute:Slideshow', () => {
      window.location.assign(`/slideshow${this.current.path}`)
    })
    Subscribe('Action:Execute:FullScreen', () => {
      if (!document.fullscreenElement) {
        document.body.requestFullscreen({ navigationUI: 'hide' })
          .catch(err => Publish('Loading:Error', err))
      } else {
        document.exitFullscreen().catch(err => Publish('Loading:Error', err))
      }
    })

    Subscribe('Action:Keypress:<Ctrl>ArrowUp', () => Publish('Action:Execute:ParentFolder'))
    Subscribe('Action:Keypress:<Ctrl>ArrowLeft', () => Publish('Action:Execute:PreviousFolder'))
    Subscribe('Action:Keypress:<Ctrl>ArrowRight', () => Publish('Action:Execute:NextFolder'))
  }

  public static async LoadData (noHistory: boolean = false): Promise<void> {
    try {
      Publish('Loading:Show')
      this.current = await Net.GetJSON<Data>(`/api/listing${this.current.path}`)
      this.current.noMenu = this.IsSuppressMenu
      for (const element of document.querySelectorAll('head title, a.navbar-brand')) {
        element.innerHTML = this.current.name || this.current.path
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
