'use sanity'

import { Pictures } from './pictures'
import { Net } from './net'
import { Publish, Subscribe } from './pubsub'
import { isListing, type Listing } from '../../../contracts/listing'

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
  current: ((): Listing => ({ path: '', name: '', parent: '' }))(),
  NavigateTo: (path: string | undefined, action: string): void => {
    if (path == null || path.length < 1) {
      Publish('Loading:Error', `Action ${action} has no target`)
      return
    }
    Navigation.current = { path, name: '', parent: '' }
    Navigation.LoadData().catch(() => null)
  },
  Init: (): void => {
    Navigation.LocationAssign = window.location.assign.bind(window.location)
    Navigation.current.path = Navigation.GetFolderPath()
    Navigation.LoadData().catch(() => null)
    Subscribe('Navigate:Load', async (path) => {
      if (typeof path === 'string') {
        Navigation.current = { path, name: '', parent: '' }
      } else if (isListing(path)) {
        Navigation.current = path
      } else {
        return
      }
      await Navigation.LoadData().catch(() => null)
    })
    Subscribe('Navigate:Reload', async () => {
      await Navigation.LoadData().catch(() => null)
    })
    window.addEventListener('popstate', () => {
      Navigation.current = {
        path: Navigation.GetFolderPath(),
        name: '',
        parent: '',
      }
      Navigation.LoadData(true).catch(() => null)
    })
    Subscribe('Navigate:Data', async (data: unknown) => {
      if (data != null && data !== '') {
        window.console.log(data)
      }
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
        await document.body.requestFullscreen({ navigationUI: 'hide' }).catch((err: unknown) => {
          Publish('Loading:Error', err)
        })
      } else {
        await document.exitFullscreen().catch((err: unknown) => {
          Publish('Loading:Error', err)
        })
      }
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
      Navigation.current = await Net.GetJSON<Listing>(`/api/listing${Navigation.current.path}`, isListing)
      Navigation.current.noMenu = Navigation.IsSuppressMenu()
      for (const element of document.querySelectorAll('head title, a.navbar-brand')) {
        let name = Navigation.current.name
        if (name.length < 1) {
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
