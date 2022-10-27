'use sanity'

import { Publish, Subscribe } from './pubsub'
import { Net } from './net'

interface Bookmark {
  path: string
  folder: string
}
interface DataWithBookmarks {
  bookmarks: Bookmark[]
}

interface BookMarkFolders {
  [key: string]: HTMLElement
}

export class Bookmarks {
  protected static bookmarks: Bookmark[] = []

  protected static bookmarkCard: DocumentFragment | undefined = undefined
  protected static bookmarkFolder: DocumentFragment | undefined = undefined

  public static buildBookmarks (data: DataWithBookmarks): void {
    this.bookmarks = data.bookmarks

    const tab = document.querySelector('#tabBookmarks')
    if (!tab || !this.bookmarkCard || !this.bookmarkFolder) return

    const openPath = tab.querySelector('details[open]')?.getAttribute('data-folderPath')

    for (const existing of tab.querySelectorAll('details')) {
      existing.remove()
    }

    const folders: BookMarkFolders = {}
    for (const bookmark of this.bookmarks) {
      if (!folders[bookmark.folder]) {
        const element = (this.bookmarkFolder.cloneNode(true) as HTMLElement | null)?.firstElementChild as HTMLElement | null
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
      const card = (this.bookmarkCard.cloneNode(true) as HTMLElement | null)?.firstElementChild as HTMLElement | null
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
        Net.PostJSON('/api/navigate/latest', { path: bookmark.path })
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

  public static Init () {
    this.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    this.bookmarkFolder = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content

    Subscribe('Navigate:Data', this.buildBookmarks.bind(this))

    Subscribe('Bookmarks:Load', (): Promise<void> => Net.GetJSON<Bookmark[]>('/api/bookmarks')
      .then(bookmarks => this.buildBookmarks({ bookmarks })))

    Subscribe('Bookmarks:Add', (path: string): Promise<void> =>
      Net.PostJSON('/api/bookmarks/add', { path })
        .then(() => Publish('Bookmarks:Load')))

    Subscribe('Bookmarks:Remove', (path: string): Promise<void> =>
      Net.PostJSON('/api/bookmarks/remove', { path })
        .then(() => Publish('Bookmarks:Load')))
  }
}
