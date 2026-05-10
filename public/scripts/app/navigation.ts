'use sanity'

import { getShowUnreadOnly as _getShowUnreadOnly } from './pictures/unreadFilter.js'
import { getJSON as _getJSON, postJSON as _postJSON, acceptAnyResponse } from './net.js'
import { publish, subscribe } from './pubsub.js'
import { isListing, type Listing } from '#contracts/listing.js'
import { hasValue, hasValues, stringishHasValue } from '#utils/helpers.js'
import { show as _show } from './confirm.js'

export const Imports = {
  getShowUnreadOnly: _getShowUnreadOnly,
  show: _show,
  getJSON: _getJSON,
  postJSON: _postJSON,
}

const INITIAL_LOAD_TOKEN = 0
const TOKEN_STEP = 1

export const Navigation = {
  locationAssign: undefined as undefined | ((url: string | URL) => void),
  current: ((): Listing => ({ path: '', name: '', parent: '' }))(),
  loadToken: INITIAL_LOAD_TOKEN,
}

function getBaseUrl(): string {
  const [pathA, pathB] = window.location.pathname.split('/')
  return [
    window.location.protocol,
    '//',
    window.location.hostname,
    stringishHasValue(window.location.port) ? `:${window.location.port}` : '',
    [pathA, pathB].join('/'),
  ].join('')
}

function getFolderPath(): string {
  const path = window.location.pathname.replace(/^\/[^\/]+/v, '')
  return stringishHasValue(path) ? path : '/'
}

export function isMenuActive(): boolean {
  const mainMenu = document.querySelector('#mainMenu')
  return !(mainMenu?.classList.contains('hidden') ?? false)
}

function isSuppressMenu(): boolean {
  return new URLSearchParams(window.location.search).has('noMenu')
}

async function navigateTo(path: string | undefined, action: string): Promise<void> {
  if (!stringishHasValue(path)) {
    publish('Loading:Error', `Action ${action} has no target`)
    return
  }
  Navigation.current = { path, name: '', parent: '' }
  await Internals.loadData().catch(() => null)
}

async function loadData(noHistory = false, suppressMenu = false): Promise<void> {
  Navigation.loadToken += TOKEN_STEP
  const token = Navigation.loadToken
  try {
    publish('Loading:show')
    const { path } = Navigation.current
    const data = await Imports.getJSON<Listing>(`/api/listing${path}`, isListing)
    if (token !== Navigation.loadToken) return
    Navigation.current = data
    Navigation.current.noMenu = suppressMenu || Internals.isSuppressMenu()
    for (const element of document.querySelectorAll('head title, a.navbar-brand')) {
      let { name } = Navigation.current
      if (!stringishHasValue(name)) {
        name = Navigation.current.path
      }
      element.innerHTML = name
    }
    if (!noHistory) {
      window.history.pushState({}, '', Internals.getBaseUrl() + Navigation.current.path)
    }
    publish('Loading:Hide')
    publish('Navigate:Data', Navigation.current)
  } catch (err: unknown) {
    if (token !== Navigation.loadToken) return
    publish('Loading:Error', err)
  }
}

export function init(): void {
  Navigation.locationAssign = window.location.assign.bind(window.location)
  Navigation.current.path = Internals.getFolderPath()
  Internals.loadData().catch(() => null)
  subscribe('Navigate:Load', async (path) => {
    let suppressMenu = false
    if (typeof path === 'string') {
      Navigation.current = { path, name: '', parent: '' }
    } else if (isListing(path)) {
      Navigation.current = path
      suppressMenu = path.noMenu === true
    } else {
      return
    }
    await Internals.loadData(false, suppressMenu).catch(() => null)
  })
  subscribe('Navigate:Reload', async () => {
    await Internals.loadData().catch(() => null)
  })
  window.addEventListener('popstate', () => {
    Navigation.current = {
      path: Internals.getFolderPath(),
      name: '',
      parent: '',
    }
    Internals.loadData(true).catch(() => null)
  })
  subscribe('Navigate:Data', async (data: unknown) => {
    if (hasValue(data) && data !== '') {
      window.console.log(data)
    }
    await Promise.resolve()
  })
  const mainMenu = document.querySelector('#mainMenu')
  subscribe('Menu:show', async () => {
    mainMenu?.classList.remove('hidden')
    await Promise.resolve()
  })
  subscribe('Menu:Hide', async () => {
    mainMenu?.classList.add('hidden')
    await Promise.resolve()
  })
  mainMenu?.addEventListener('click', (event) => {
    if (event.target === mainMenu && hasValues(Navigation.current.pictures)) {
      publish('Menu:Hide')
    }
  })
  document.querySelector('.menuButton')?.addEventListener('click', () => {
    publish('Menu:show')
  })
  subscribe('Action:Execute:PreviousFolder', async () => {
    const prev = Imports.getShowUnreadOnly() ? Navigation.current.prevUnread : Navigation.current.prev
    await Internals.navigateTo(prev?.path, 'PreviousFolder')
  })
  subscribe('Action:Execute:NextFolder', async () => {
    const next = Imports.getShowUnreadOnly() ? Navigation.current.nextUnread : Navigation.current.next
    await Internals.navigateTo(next?.path, 'NextFolder')
  })
  subscribe('Action:Execute:ParentFolder', async () => {
    await Internals.navigateTo(Navigation.current.parent, 'ParentFolder')
  })
  subscribe('Action:Execute:FirstUnfinished', async () => {
    const target = Navigation.current.children?.find((child) => child.seenCount < child.totalCount)
    await Internals.navigateTo(target?.path, 'FirstUnfinished')
  })
  subscribe('Action:Execute:ShowMenu', async () => {
    publish('Menu:show')
    await Promise.resolve()
  })
  subscribe('Action:Execute:HideMenu', async () => {
    publish('Menu:Hide')
    await Promise.resolve()
  })
  subscribe('Action:Execute:MarkAllSeen', async () => {
    if (!(await Imports.show('Mark all images in this folder as seen?', 'Mark All Seen'))) return
    await Imports.postJSON('/api/mark/read', { path: Navigation.current.path }, acceptAnyResponse)
      .then(
        async () => {
          await Internals.loadData(true)
        },
        (err: unknown) => {
          publish('Loading:Error', err)
        },
      )
      .catch(() => null)
  })
  subscribe('Action:Execute:MarkAllUnseen', async () => {
    if (!(await Imports.show('Mark all images in this folder as unseen?', 'Mark All Unseen'))) return
    await Imports.postJSON('/api/mark/unread', { path: Navigation.current.path }, acceptAnyResponse)
      .then(
        async () => {
          await Internals.loadData(true)
        },
        (err: unknown) => {
          publish('Loading:Error', err)
        },
      )
      .catch(() => null)
  })
  subscribe('Action:Execute:Slideshow', async () => {
    Navigation.locationAssign?.call(window.location, `/slideshow${Navigation.current.path}`)
    await Promise.resolve()
  })
  subscribe('Action:Execute:FullScreen', async () => {
    if (hasValue(document.fullscreenElement)) {
      await document.exitFullscreen().catch((err: unknown) => {
        publish('Loading:Error', err)
      })
    } else {
      await document.body.requestFullscreen({ navigationUI: 'hide' }).catch((err: unknown) => {
        publish('Loading:Error', err)
      })
    }
  })
  subscribe('Action:Keypress:<Ctrl>ArrowUp', async () => {
    publish('Action:Execute:ParentFolder')
    await Promise.resolve()
  })
  subscribe('Action:Keypress:<Ctrl>ArrowDown', async () => {
    publish('Action:Execute:FirstUnfinished')
    await Promise.resolve()
  })
  subscribe('Action:Keypress:<Ctrl>ArrowLeft', async () => {
    publish('Action:Execute:PreviousFolder')
    await Promise.resolve()
  })
  subscribe('Action:Keypress:<Ctrl>ArrowRight', async () => {
    publish('Action:Execute:NextFolder')
    await Promise.resolve()
  })
  subscribe('Action:Gamepad:Down', async () => {
    publish('Action:Execute:PreviousFolder')
    await Promise.resolve()
  })
  subscribe('Action:Gamepad:Up', async () => {
    publish('Action:Execute:NextFolder')
    await Promise.resolve()
  })
  subscribe('Action:Gamepad:Y', async () => {
    publish('Action:Execute:ParentFolder')
    await Promise.resolve()
  })
  subscribe('Action:Gamepad:A', async () => {
    publish('Action:Execute:FirstUnfinished')
    await Promise.resolve()
  })
}

export const Internals = {
  getBaseUrl,
  getFolderPath,
  isSuppressMenu,
  navigateTo,
  loadData,
}
