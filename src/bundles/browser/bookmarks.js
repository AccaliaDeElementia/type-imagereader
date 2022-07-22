'use strict'

const net = require('./net')
const pubsub = require('./pubsub')

let bookmarks = []

const doBookmarks = data => {
  bookmarks = data.bookmarks
  const cardTemplate = document.querySelector('#BookmarkCard').content

  const folder = document.querySelector('#BookmarkFolder').content

  const openPath = (document.querySelector('#tabBookmarks details[open]') || {}).__folderPath || data.path
  console.log(openPath)

  for (const existing of document.querySelectorAll('#tabBookmarks > *')) {
    existing.parentElement.removeChild(existing)
  }

  const tab = document.querySelector('#tabBookmarks')
  const folders = {}
  bookmarks.forEach(mark => {
    if (!folders[mark.folder]) {
      const element = folder.cloneNode(true).firstElementChild
      element.__folderPath = mark.folder
      const title = element.querySelector('.title')

      title.innerText = decodeURI(mark.folder)
      title.addEventListener('click', evt => {
        evt.preventDefault()
        for (const elem of tab.querySelectorAll('details')) {
          elem.removeAttribute('open')
        }
        element.setAttribute('open', '')
      })

      if (mark.folder === openPath) {
        element.setAttribute('open', '')
      }
      folders[mark.folder] = element
    }
    const name = mark.path.replace(/^.*\/([^/]+)$/, '$1')
    const card = cardTemplate.cloneNode(true).firstElementChild
    card.querySelector('.title').innerText = name

    card.style.backgroundImage = `url("/images/preview${mark.path}")`

    const btn = card.querySelector('button')
    btn.addEventListener('click', () => {
      pubsub.publish('bookmarks.remove', mark.path)
    })

    card.addEventListener('click', evt => {
      if (evt.target === btn) return
      net.postJSON('/api/navigate/latest', { path: mark.path })
        .then(() => pubsub.publish('navigate.load', mark.folder))
      return false
    })

    folders[mark.folder].lastElementChild.appendChild(card)
  })
  const keys = Object.keys(folders)
  keys.sort()
  for (const key of keys) {
    tab.appendChild(folders[key])
  }
}
pubsub.subscribe('navigate.data', doBookmarks)

const refreshBookmarks = () => net.getJSON('/api/bookmarks').then(bookmarks =>  doBookmarks({ bookmarks }))

pubsub.subscribe('bookmarks.load', refreshBookmarks)
pubsub.subscribe('bookmarks.add', path => net.postJSON('/api/bookmarks/add', { path }).then(refreshBookmarks))
pubsub.subscribe('bookmarks.remove', path => net.postJSON('/api/bookmarks/remove', { path }).then(refreshBookmarks))
