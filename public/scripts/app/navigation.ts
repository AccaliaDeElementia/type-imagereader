'use sanity'

import { GetShowUnreadOnly as _GetShowUnreadOnly } from './pictures/unreadFilter.js'
import { GetJSON as _GetJSON, PostJSON as _PostJSON, acceptAnyResponse } from './net.js'
import { Publish, Subscribe } from './pubsub.js'
import { isListing, type Listing } from '#contracts/listing.js'
import { hasValue, hasValues, stringishHasValue } from '#utils/helpers.js'
import { Show as _Show } from './confirm.js'

export const Imports = {
  GetShowUnreadOnly: _GetShowUnreadOnly,
  Show: _Show,
  GetJSON: _GetJSON,
  PostJSON: _PostJSON,
}

const INITIAL_LOAD_TOKEN = 0
const TOKEN_STEP = 1

export const Navigation = {
  LocationAssign: undefined as undefined | ((url: string | URL) => void),
  current: ((): Listing => ({ path: '', name: '', parent: '' }))(),
  loadToken: INITIAL_LOAD_TOKEN,
}

function GetBaseUrl(): string {
  const [pathA, pathB] = window.location.pathname.split('/')
  return [
    window.location.protocol,
    '//',
    window.location.hostname,
    stringishHasValue(window.location.port) ? `:${window.location.port}` : '',
    [pathA, pathB].join('/'),
  ].join('')
}

function GetFolderPath(): string {
  const path = window.location.pathname.replace(/^\/[^\/]+/v, '')
  return stringishHasValue(path) ? path : '/'
}

export function IsMenuActive(): boolean {
  const mainMenu = document.querySelector('#mainMenu')
  return !(mainMenu?.classList.contains('hidden') ?? false)
}

function IsSuppressMenu(): boolean {
  return new URLSearchParams(window.location.search).has('noMenu')
}

async function NavigateTo(path: string | undefined, action: string): Promise<void> {
  if (!stringishHasValue(path)) {
    Publish('Loading:Error', `Action ${action} has no target`)
    return
  }
  Navigation.current = { path, name: '', parent: '' }
  await Internals.LoadData().catch(() => null)
}

async function LoadData(noHistory = false, suppressMenu = false): Promise<void> {
  Navigation.loadToken += TOKEN_STEP
  const token = Navigation.loadToken
  try {
    Publish('Loading:Show')
    const path = Navigation.current.path
    const data = await Imports.GetJSON<Listing>(`/api/listing${path}`, isListing)
    if (token !== Navigation.loadToken) return
    Navigation.current = data
    Navigation.current.noMenu = suppressMenu || Internals.IsSuppressMenu()
    for (const element of document.querySelectorAll('head title, a.navbar-brand')) {
      let name = Navigation.current.name
      if (!stringishHasValue(name)) {
        name = Navigation.current.path
      }
      element.innerHTML = name
    }
    if (!noHistory) {
      window.history.pushState({}, '', Internals.GetBaseUrl() + Navigation.current.path)
    }
    Publish('Loading:Hide')
    Publish('Navigate:Data', Navigation.current)
  } catch (err: unknown) {
    if (token !== Navigation.loadToken) return
    Publish('Loading:Error', err)
  }
}

export function Init(): void {
  Navigation.LocationAssign = window.location.assign.bind(window.location)
  Navigation.current.path = Internals.GetFolderPath()
  Internals.LoadData().catch(() => null)
  Subscribe('Navigate:Load', async (path) => {
    let suppressMenu = false
    if (typeof path === 'string') {
      Navigation.current = { path, name: '', parent: '' }
    } else if (isListing(path)) {
      Navigation.current = path
      suppressMenu = path.noMenu === true
    } else {
      return
    }
    await Internals.LoadData(false, suppressMenu).catch(() => null)
  })
  Subscribe('Navigate:Reload', async () => {
    await Internals.LoadData().catch(() => null)
  })
  window.addEventListener('popstate', () => {
    Navigation.current = {
      path: Internals.GetFolderPath(),
      name: '',
      parent: '',
    }
    Internals.LoadData(true).catch(() => null)
  })
  Subscribe('Navigate:Data', async (data: unknown) => {
    if (hasValue(data) && data !== '') {
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
    if (event.target === mainMenu && hasValues(Navigation.current.pictures)) {
      Publish('Menu:Hide')
    }
  })
  document.querySelector('.menuButton')?.addEventListener('click', () => {
    Publish('Menu:Show')
  })
  Subscribe('Action:Execute:PreviousFolder', async () => {
    const prev = Imports.GetShowUnreadOnly() ? Navigation.current.prevUnread : Navigation.current.prev
    await Internals.NavigateTo(prev?.path, 'PreviousFolder')
  })
  Subscribe('Action:Execute:NextFolder', async () => {
    const next = Imports.GetShowUnreadOnly() ? Navigation.current.nextUnread : Navigation.current.next
    await Internals.NavigateTo(next?.path, 'NextFolder')
  })
  Subscribe('Action:Execute:ParentFolder', async () => {
    await Internals.NavigateTo(Navigation.current.parent, 'ParentFolder')
  })
  Subscribe('Action:Execute:FirstUnfinished', async () => {
    const target = Navigation.current.children?.find((child) => child.seenCount < child.totalCount)
    await Internals.NavigateTo(target?.path, 'FirstUnfinished')
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
    if (!(await Imports.Show('Mark all images in this folder as seen?', 'Mark All Seen'))) return
    await Imports.PostJSON('/api/mark/read', { path: Navigation.current.path }, acceptAnyResponse)
      .then(
        async () => {
          await Internals.LoadData(true)
        },
        (err: unknown) => {
          Publish('Loading:Error', err)
        },
      )
      .catch(() => null)
  })
  Subscribe('Action:Execute:MarkAllUnseen', async () => {
    if (!(await Imports.Show('Mark all images in this folder as unseen?', 'Mark All Unseen'))) return
    await Imports.PostJSON('/api/mark/unread', { path: Navigation.current.path }, acceptAnyResponse)
      .then(
        async () => {
          await Internals.LoadData(true)
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
    if (hasValue(document.fullscreenElement)) {
      await document.exitFullscreen().catch((err: unknown) => {
        Publish('Loading:Error', err)
      })
    } else {
      await document.body.requestFullscreen({ navigationUI: 'hide' }).catch((err: unknown) => {
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
}

export const Internals = {
  GetBaseUrl,
  GetFolderPath,
  IsSuppressMenu,
  NavigateTo,
  LoadData,
}
