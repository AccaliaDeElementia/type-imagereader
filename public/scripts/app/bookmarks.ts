'use sanity'

import { Publish, Subscribe } from './pubsub'
import { GetJSON, PostJSON } from './net'

interface Bookmark{
  path: string
  folder: string
}
interface DataWithBookmarks {
  bookmarks: Bookmark[]
}

interface BookMarkFolders {
  [key: string]: HTMLElement
}

let bookmarks: Bookmark[] = []

const bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
const bookmarkFolder = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content

const buildBookmarks = (data: DataWithBookmarks):void => {
  bookmarks = data.bookmarks

  const tab = document.querySelector('#tabBookmarks')
  if (!tab || !bookmarkCard || !bookmarkFolder) return

  const openPath = tab.querySelector('details[open]')?.getAttribute('data-folderPath')

  for (const existing of tab.querySelectorAll('details')) {
    existing.remove()
  }

  const folders: BookMarkFolders = {}
  for (const bookmark of bookmarks) {
    if (!folders[bookmark.folder]) {
      const element = (bookmarkFolder.cloneNode(true) as HTMLElement|null)?.firstElementChild as HTMLElement|null
      element?.setAttribute('data-folderPath', bookmark.folder)
      const title = element?.querySelector<HTMLElement>('.title')
      if (title) title.innerText = decodeURI(bookmark.folder)
      title?.addEventListener('click', evt => {
        evt.preventDefault()
        for (const elem of tab.querySelectorAll('details')) {
          elem.removeAttribute('open')
        }
        element?.setAttribute('open', '')
      })
      if (bookmark.folder === openPath) {
        element?.setAttribute('open', '')
      }
      if (element) {
        folders[bookmark.folder] = element
      }
    }
    const name = bookmark.path.replace(/.*\/([^/]+)$/, '$1')
    const card = (bookmarkCard.cloneNode(true) as HTMLElement|null)?.firstElementChild as HTMLElement|null
    if (!card) continue
    const title = card.querySelector<HTMLElement>('.title')
    if (title) title.innerText = name

    card.style.backgroundImage = `url("/images/preview${bookmark.path}")`
    const button = card?.querySelector('button')
    button?.addEventListener('click', event => {
      Publish('Bookmarks:Remove', bookmark.path)
      event.stopPropagation()
    })
    card.addEventListener('click', event => {
      PostJSON('/api/navigate/latest', { path: bookmark.path })
        .then(() => Publish('Navigate:Load', {
          path: bookmark.folder,
          noMenu: true
        }))
      event.stopPropagation()
    })

    folders[bookmark.folder]?.lastElementChild?.appendChild(card as Node)
  }
  for (const key of Object.keys(folders).sort()) {
    tab.appendChild(folders[key] as Node)
  }
}

Subscribe('Navigate:Data', buildBookmarks)

Subscribe('Bookmarks:Load', ():Promise<void> => GetJSON<Bookmark[]>('/api/bookmarks')
  .then(bookmarks => buildBookmarks({ bookmarks })))

Subscribe('Bookmarks:Add', (path: string): Promise<void> =>
  PostJSON('/api/bookmarks/add', { path })
    .then(() => Publish('Bookmarks:Load')))

Subscribe('Bookmarks:Remove', (path: string): Promise<void> =>
  PostJSON('/api/bookmarks/remove', { path })
    .then(() => Publish('Bookmarks:Load')))
