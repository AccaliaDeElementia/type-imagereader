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
  next?: Data | null
  nextUnread?: Data | null
  prev?: Data | null
  prevUnread?: Data | null
  pictures?: object[]
  children?: ChildFolder[]
}

function hasPicturesArray(obj: object): boolean {
  if ('pictures' in obj) {
    if (!(obj.pictures instanceof Array)) return false
    for (const pic of obj.pictures as unknown[]) {
      if (typeof pic !== 'object' || pic == null) return false
    }
  }
  return true
}

function isFolder(folder: unknown): boolean {
  if (typeof folder !== 'object' || folder == null) return false
  if (!('name' in folder) || typeof folder.name !== 'string') return false
  if (!('path' in folder) || typeof folder.path !== 'string') return false
  if (!('totalCount' in folder) || typeof folder.totalCount !== 'number') return false
  return 'totalSeen' in folder && typeof folder.totalSeen === 'number'
}

function hasChildrenArray(obj: object): boolean {
  if ('children' in obj) {
    if (!(obj.children instanceof Array)) return false
    for (const folder of obj.children as unknown[]) {
      if (!isFolder(folder)) return false
    }
  }
  return true
}

function hasSiblingData(obj: object): boolean {
  if ('next' in obj && !isNullOrData(obj.next)) return false
  if ('nextUnread' in obj && !isNullOrData(obj.nextUnread)) return false
  if ('prev' in obj && !isNullOrData(obj.prev)) return false
  if ('prevUnread' in obj && !isNullOrData(obj.prevUnread)) return false
  return true
}

function isNullOrData(obj: unknown): boolean {
  return obj == null || isData(obj)
}

function isUndefinedOrboolean(obj: unknown): boolean {
  return typeof obj === 'boolean' || obj === undefined
}

function isUndefinedOrString(obj: unknown): boolean {
  return typeof obj === 'string' || obj === undefined
}

function hasValidName(obj: object): boolean {
  if ('name' in obj && !isUndefinedOrString(obj.name)) return false
  if ('parent' in obj && !isUndefinedOrString(obj.parent)) return false
  return true
}

export function isData(obj: unknown): obj is Data {
  if (typeof obj !== 'object' || obj == null) return false
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  if ('noMenu' in obj && !isUndefinedOrboolean(obj.noMenu)) return false
  return hasValidName(obj) && hasSiblingData(obj) && hasPicturesArray(obj) && hasChildrenArray(obj)
}

interface NoMenuPath {
  path: string
  noMenu: boolean
}

export function isNoMenuPath(obj: unknown): obj is NoMenuPath {
  if (obj == null || typeof obj !== 'object') return false
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  if (!('noMenu' in obj) || typeof obj.noMenu !== 'boolean') return false
  return true
}

export const Navigation = {
  GetBaseUrl: (): string =>
    [
      window.location.protocol,
      '//',
      window.location.hostname,
      window.location.port.length > 0 ? `:${window.location.port}` : '',
      window.location.pathname.split('/').slice(0, 2).join('/'),
    ].join(''),
  GetFolderPath: (): string => {
    const path = window.location.pathname.replace(/^\/[^/]+/, '')
    return path.length > 0 ? path : '/'
  },
  LocationAssign: ((): undefined | ((url: string | URL) => void) => undefined)(),
  IsMenuActive: (): boolean => {
    const mainMenu = document.querySelector('#mainMenu')
    return !(mainMenu?.classList.contains('hidden') ?? false)
  },
  IsSuppressMenu: (): boolean => new URLSearchParams(window.location.search).has('noMenu'),
  current: ((): Data => ({ path: '' }))(),
  NavigateTo: (path: string | undefined, action: string): void => {
    if (path == null || path.length < 1) {
      Publish('Loading:Error', `Action ${action} has no target`)
      return
    }
    Navigation.current = { path }
    Navigation.LoadData().catch(() => null)
  },
  Init: (): void => {
    Navigation.LocationAssign = window.location.assign.bind(window.location)
    Navigation.current.path = Navigation.GetFolderPath()
    Navigation.LoadData().catch(() => null)
    Subscribe('Navigate:Load', (path): void => {
      if (typeof path === 'string') {
        Navigation.current = { path }
      } else if (isNoMenuPath(path)) {
        Navigation.current = path
      }
      Navigation.LoadData().catch(() => null)
    })
    Subscribe('Navigate:Reload', () => {
      Navigation.LoadData().catch(() => null)
    })
    window.addEventListener('popstate', () => {
      Navigation.current = {
        path: Navigation.GetFolderPath(),
      }
      Navigation.LoadData(true).catch(() => null)
    })

    Subscribe('Navigate:Data', (data: unknown): void => {
      window.console.log(data)
    })

    const mainMenu = document.querySelector('#mainMenu')
    Subscribe('Menu:Show', () => mainMenu?.classList.remove('hidden'))
    Subscribe('Menu:Hide', () => mainMenu?.classList.add('hidden'))
    mainMenu?.addEventListener('click', (event) => {
      if (event.target === mainMenu && Navigation.current.pictures != null && Navigation.current.pictures.length > 0) {
        Publish('Menu:Hide')
      }
    })

    document.querySelector('.menuButton')?.addEventListener('click', () => {
      Publish('Menu:Show')
    })

    Subscribe('Action:Execute:PreviousFolder', () => {
      const prev = Pictures.GetShowUnreadOnly() ? Navigation.current.prevUnread : Navigation.current.prev
      Navigation.NavigateTo(prev?.path, 'PreviousFolder')
    })
    Subscribe('Action:Execute:NextFolder', () => {
      const next = Pictures.GetShowUnreadOnly() ? Navigation.current.nextUnread : Navigation.current.next
      Navigation.NavigateTo(next?.path, 'NextFolder')
    })
    Subscribe('Action:Execute:ParentFolder', () => {
      Navigation.NavigateTo(Navigation.current.parent, 'ParentFolder')
    })
    Subscribe('Action:Execute:FirstUnfinished', () => {
      const target = Navigation.current.children?.find((child) => child.totalSeen < child.totalCount)
      Navigation.NavigateTo(target?.path, 'FirstUnfinished')
    })
    Subscribe('Action:Execute:ShowMenu', () => {
      Publish('Menu:Show')
    })
    Subscribe('Action:Execute:HideMenu', () => {
      Publish('Menu:Hide')
    })
    Subscribe('Action:Execute:MarkAllSeen', () => {
      Net.PostJSON('/api/mark/read', { path: Navigation.current.path }, (_: unknown): _ is unknown => true)
        .then(
          async () => {
            await Navigation.LoadData(true)
          },
          (err: unknown) => {
            Publish('Loading:Error', err)
          },
        )
        .catch(() => null)
    })
    Subscribe('Action:Execute:MarkAllUnseen', () => {
      Net.PostJSON('/api/mark/unread', { path: Navigation.current.path }, (_: unknown): _ is unknown => true)
        .then(
          async () => {
            await Navigation.LoadData(true)
          },
          (err: unknown) => {
            Publish('Loading:Error', err)
          },
        )
        .catch(() => null)
    })
    Subscribe('Action:Execute:Slideshow', () => {
      Navigation.LocationAssign?.call(window.location, `/slideshow${Navigation.current.path}`)
    })
    Subscribe('Action:Execute:FullScreen', () => {
      if (document.fullscreenElement == null) {
        document.body.requestFullscreen({ navigationUI: 'hide' }).catch((err: unknown) => {
          Publish('Loading:Error', err)
        })
      } else {
        document.exitFullscreen().catch((err: unknown) => {
          Publish('Loading:Error', err)
        })
      }
    })

    Subscribe('Action:Keypress:<Ctrl>ArrowUp', () => {
      Publish('Action:Execute:ParentFolder')
    })
    Subscribe('Action:Keypress:<Ctrl>ArrowDown', () => {
      Publish('Action:Execute:FirstUnfinished')
    })
    Subscribe('Action:Keypress:<Ctrl>ArrowLeft', () => {
      Publish('Action:Execute:PreviousFolder')
    })
    Subscribe('Action:Keypress:<Ctrl>ArrowRight', () => {
      Publish('Action:Execute:NextFolder')
    })
    Subscribe('Action:Gamepad:Down', () => {
      Publish('Action:Execute:PreviousFolder')
    })
    Subscribe('Action:Gamepad:Up', () => {
      Publish('Action:Execute:NextFolder')
    })
    Subscribe('Action:Gamepad:Y', () => {
      Publish('Action:Execute:ParentFolder')
    })
    Subscribe('Action:Gamepad:A', () => {
      Publish('Action:Execute:FirstUnfinished')
    })
  },
  LoadData: async (noHistory = false): Promise<void> => {
    try {
      Publish('Loading:Show')
      Navigation.current = await Net.GetJSON<Data>(`/api/listing${Navigation.current.path}`, isData)
      Navigation.current.noMenu = Navigation.IsSuppressMenu()
      for (const element of document.querySelectorAll('head title, a.navbar-brand')) {
        let name = Navigation.current.name
        if (name == null || name.length < 1) {
          name = Navigation.current.path
        }
        element.innerHTML = name
      }
      if (!noHistory) {
        window.history.pushState({}, '', Navigation.GetBaseUrl() + Navigation.current.path)
      }
      Publish('Loading:Hide')
      Publish('Navigate:Data', Navigation.current)
    } catch (err) {
      Publish('Loading:Error', err)
    }
  },
}
