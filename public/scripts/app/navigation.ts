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
    Subscribe('Navigate:Load', async (path) => {
      if (typeof path === 'string') {
        Navigation.current = { path }
      } else if (isNoMenuPath(path)) {
        Navigation.current = path
      }
      await Navigation.LoadData().catch(() => null)
    })
    Subscribe('Navigate:Reload', async () => {
      await Navigation.LoadData().catch(() => null)
    })
    window.addEventListener('popstate', () => {
      Navigation.current = {
        path: Navigation.GetFolderPath(),
      }
      Navigation.LoadData(true).catch(() => null)
    })

    Subscribe('Navigate:Data', async (data: unknown) => {
      window.console.log(data)
      await Promise.resolve()
    })

    const mainMenu = document.querySelector('#mainMenu')
    Subscribe('Menu:Show', async () => {
      mainMenu?.classList.remove('hidden')
      await Promise.resolve()
    })
    Subscribe('Menu:Hide', async () => {
      mainMenu?.classList.add('hidden')
      await Promise.resolve()
    })
    mainMenu?.addEventListener('click', (event) => {
      if (event.target === mainMenu && Navigation.current.pictures != null && Navigation.current.pictures.length > 0) {
        Publish('Menu:Hide')
      }
    })

    document.querySelector('.menuButton')?.addEventListener('click', () => {
      Publish('Menu:Show')
    })

    Subscribe('Action:Execute:PreviousFolder', async () => {
      const prev = Pictures.GetShowUnreadOnly() ? Navigation.current.prevUnread : Navigation.current.prev
      Navigation.NavigateTo(prev?.path, 'PreviousFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Execute:NextFolder', async () => {
      const next = Pictures.GetShowUnreadOnly() ? Navigation.current.nextUnread : Navigation.current.next
      Navigation.NavigateTo(next?.path, 'NextFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Execute:ParentFolder', async () => {
      Navigation.NavigateTo(Navigation.current.parent, 'ParentFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Execute:FirstUnfinished', async () => {
      const target = Navigation.current.children?.find((child) => child.totalSeen < child.totalCount)
      Navigation.NavigateTo(target?.path, 'FirstUnfinished')
      await Promise.resolve()
    })
    Subscribe('Action:Execute:ShowMenu', async () => {
      Publish('Menu:Show')
      await Promise.resolve()
    })
    Subscribe('Action:Execute:HideMenu', async () => {
      Publish('Menu:Hide')
      await Promise.resolve()
    })
    Subscribe('Action:Execute:MarkAllSeen', async () => {
      await Net.PostJSON('/api/mark/read', { path: Navigation.current.path }, (_: unknown): _ is unknown => true)
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
    Subscribe('Action:Execute:MarkAllUnseen', async () => {
      await Net.PostJSON('/api/mark/unread', { path: Navigation.current.path }, (_: unknown): _ is unknown => true)
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
    Subscribe('Action:Execute:Slideshow', async () => {
      Navigation.LocationAssign?.call(window.location, `/slideshow${Navigation.current.path}`)
      await Promise.resolve()
    })
    Subscribe('Action:Execute:FullScreen', async () => {
      if (document.fullscreenElement == null) {
        document.body.requestFullscreen({ navigationUI: 'hide' }).catch((err: unknown) => {
          Publish('Loading:Error', err)
        })
      } else {
        document.exitFullscreen().catch((err: unknown) => {
          Publish('Loading:Error', err)
        })
      }
      await Promise.resolve()
    })

    Subscribe('Action:Keypress:<Ctrl>ArrowUp', async () => {
      Publish('Action:Execute:ParentFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Keypress:<Ctrl>ArrowDown', async () => {
      Publish('Action:Execute:FirstUnfinished')
      await Promise.resolve()
    })
    Subscribe('Action:Keypress:<Ctrl>ArrowLeft', async () => {
      Publish('Action:Execute:PreviousFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Keypress:<Ctrl>ArrowRight', async () => {
      Publish('Action:Execute:NextFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Gamepad:Down', async () => {
      Publish('Action:Execute:PreviousFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Gamepad:Up', async () => {
      Publish('Action:Execute:NextFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Gamepad:Y', async () => {
      Publish('Action:Execute:ParentFolder')
      await Promise.resolve()
    })
    Subscribe('Action:Gamepad:A', async () => {
      Publish('Action:Execute:FirstUnfinished')
      await Promise.resolve()
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
