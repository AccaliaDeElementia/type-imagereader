'use sanity'

import { GetJSON, PostJSON } from './net'
import { Publish, Subscribe } from './pubsub'

const baseUrl = [
  window.location.protocol,
  '//',
  window.location.host,
  window.location.port.length ? `:${window.location.port}` : '',
  window.location.pathname.split('/').slice(0, 2).join('/')
].join('')

interface Data {
  path: string
  noMenu?: boolean
  name?: string
  parent?: string,
  next?: Data
  prev?: Data
}

interface NoMenuPath {
  path: string
  noMenu: boolean
}

const getPathFromLocation = (): string =>
  window.location.pathname.replace(/^\/[^/]+/, '') || '/'

let current: Data = {
  path: getPathFromLocation()
}

const loadData = async (noHistory: boolean = false): Promise<void> => {
  try {
    Publish('Loading:Show')
    const noMenu = current.noMenu
    current = await GetJSON<Data>(`/api/listing${current.path}`)
    current.noMenu = noMenu
    for (const element of document.querySelectorAll('head title, a.navbar-brand')) {
      element.innerHTML = current.name || current.path
    }
    if (!noHistory) {
      window.history.pushState({}, '', baseUrl + current.path)
    }
    Publish('Loading:Hide')
    Publish('Navigate:Data', current)
  } catch (err) {
    Publish('Loading:Error')
  }
}
loadData(true)
Subscribe('Navigate:Load', (path: string | NoMenuPath): void => {
  if (typeof path === 'string' || path instanceof String) {
    current = { path: path as string }
  } else {
    current = path 
  }
  loadData()
})
window.addEventListener('popstate', () => {
  current = {
    path: getPathFromLocation()
  }
  loadData(true)
})

Subscribe('Navigate:Data', (data: any):void => console.log(data))

const mainMenu = document.querySelector('#mainMenu')
Subscribe('Menu:Show', () => mainMenu?.classList.remove('hidden'))
Subscribe('Menu:Hide', () => mainMenu?.classList.add('hidden'))
mainMenu?.addEventListener('click', (event) => {
  if (event.target === mainMenu) {
    Publish('Menu:Hide')
  }
})
document.querySelector('.menuButton')?.addEventListener('click', () => {
  Publish('Menu:Show')
})

const doNavigate = (path: string|undefined, action: string) => {
  if (!path) {
    Publish('Loading:Error', `Action ${action} has no target`)
    return
  }
  current = { path }
  loadData()
}
Subscribe('Action:Execute:PreviousFolder', () => doNavigate(current?.prev?.path, 'PreviousFolder'))
Subscribe('Action:Execute:NextFolder', () => doNavigate(current?.next?.path, 'NextFolder'))
Subscribe('Action:Execute:ParentFolder', () => doNavigate(current?.parent, 'ParentFolder'))
Subscribe('Action:Execute:ShowMenu', () => Publish('Menu:Show'))
Subscribe('Action:Execute:HideMenu', () => Publish('Menu:Hide'))
Subscribe('Action:Execute:MarkAllSeen', () =>
  PostJSON('/api/mark/read', { path: current.path }).finally(() => loadData(true)))
Subscribe('Action:Execute:MarkAllUnseen', () =>
  PostJSON('/api/mark/unread', { path: current.path }).finally(() => loadData(true)))
Subscribe('Action:Execute:Slideshow', () => {
  window.location.pathname = `/slideshow${current.path}`
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
