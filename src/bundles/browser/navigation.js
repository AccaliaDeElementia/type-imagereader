'use sanity'

/* global history */

const net = require('./net')
const pubsub = require('./pubsub')

let data = {
  path: window.location.pathname.replace(/^\/[^/]+/, '') || '/'
}
const base = [
  `${window.location.protocol}//`,
  window.location.host,
  window.location.port.length ? `:${window.location.port}` : '',
  window.location.pathname.split('/').slice(0, 2).join('/')
].join('')
const loadPath = async (path, _, noHistory = false) => {
  try {
    pubsub.publish('loading.show')
    data = await net.getListing(path)
    document.querySelector('head title').innerHTML = data.name || data.path
    document.querySelector('a.navbar-brand').innerHTML = data.name || data.path
    if (!noHistory) {
      history.pushState({}, undefined, `${base}${path}`)
    }
    pubsub.publish('navigate.data', data)
    pubsub.publish('loading.hide')
  } catch (err) {
    console.error(err)
  }
}

const reload = () => loadPath(data.path, undefined, true)
window.addEventListener('popstate', () => {
  data.path = window.location.pathname.replace(/^\/[^/]+/, '') || '/'
  reload()
})
reload()

const mainMenu = document.querySelector('#mainMenu')
pubsub.subscribe('menu.show', () => mainMenu.classList.remove('hidden'))
pubsub.subscribe('menu.hide', () => mainMenu.classList.add('hidden'))
document.querySelector('#mainMenu').addEventListener('click', event => {
  if (event.target === mainMenu) {
    pubsub.publish('menu.hide')
  }
})
document.querySelector('.menuButton').addEventListener('click', () => {
  pubsub.publish('menu.show')
})

pubsub.subscribe('navigate.load', loadPath)
pubsub.subscribe('navigate.data', data => console.log(data))

const doNavigate = (folder, action) => {
  const path = (folder || {}).path
  if (!path) {
    pubsub.publish('error', `Action ${action} has no target`)
    return
  }
  loadPath(path)
}
pubsub.subscribe('action.execute', 'PreviousFolder', () => doNavigate(data.prev, 'PreviousFolder'))
pubsub.subscribe('action.execute', 'NextFolder', () => doNavigate(data.next, 'NextFolder'))
pubsub.subscribe('action.execute', 'ParentFolder', () => doNavigate({ path: data.parent }, 'ParentFolder'))
pubsub.subscribe('action.execute', 'ShowMenu', () => pubsub.publish('menu.show'))
pubsub.subscribe('action.execute', 'HideMenu', () => pubsub.publish('menu.hide'))
pubsub.subscribe('action.execute', 'MarkAllSeen', () =>
  net.postJSON('/api/mark/read', { path: data.path }).finally(() => reload()))
pubsub.subscribe('action.execute', 'MarkAllUnseen', () =>
  net.postJSON('/api/mark/unread', { path: data.path }).finally(() => reload()))
pubsub.subscribe('action.execute', 'Slideshow', () => {
  window.location.pathname = `/slideshow${data.path}`
})

const doIfNoMenu = action => {
  return () => {
    if (mainMenu.classList.contains('hidden')) {
      pubsub.publish('action.execute', action)
    } else {
      pubsub.publish('action.execute', 'HideMenu')
    }
  }
}
pubsub.subscribe('action.keypress', '<Ctrl>ArrowUp', ()=> pubsub.publish('action.execute', 'ParentFolder'))
pubsub.subscribe('action.keypress', '<Ctrl>ArrowLeft', ()=> pubsub.publish('action.execute', 'PreviousFolder'))
pubsub.subscribe('action.keypress', '<Ctrl>ArrowRight', ()=> pubsub.publish('action.execute', 'NextFolder'))
