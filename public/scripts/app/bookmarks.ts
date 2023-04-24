'use sanity'

import { Publish, Subscribe } from './pubsub'
import { Net } from './net'

export interface Bookmark {
  path: string
  folder: string
}
interface DataWithBookmarks {
  bookmarks: Bookmark[]
}

interface BookMarkFolder {
  name: string
  element: HTMLElement
}

export class Bookmarks {
  protected static bookmarks: Bookmark[] = []

  protected static bookmarkCard: DocumentFragment | undefined = undefined
  protected static bookmarkFolder: DocumentFragment | undefined = undefined
  protected static bookmarksTab: HTMLElement | null = null

  public static BookmarkFolders: BookMarkFolder[] = []

  public static GetFolder (openPath: string, bookmark: Bookmark): HTMLElement | null {
    let folder = this.BookmarkFolders.filter(e => e.name === bookmark.folder)[0]
    if (!folder) {
      const element = (Bookmarks.bookmarkFolder?.cloneNode(true) as HTMLElement | null)?.firstElementChild as HTMLElement | null
      if (!element) {
        return null
      }
      folder = {
        name: bookmark.folder,
        element
      }
      element.setAttribute('data-folderPath', bookmark.folder)
      const title = element.querySelector<HTMLElement>('.title')
      if (title) title.innerText = decodeURI(bookmark.folder)
      title?.addEventListener('click', () => {
        for (const otherFolder of this.BookmarkFolders) {
          otherFolder.element.removeAttribute('open')
        }
      })
      if (bookmark.folder === openPath) {
        element.setAttribute('open', '')
      }
      this.BookmarkFolders.push(folder)
    }
    return folder.element
  }

  public static BuildBookmark (bookmark: Bookmark): HTMLElement|null {
    const card = (Bookmarks.bookmarkCard?.cloneNode(true) as HTMLElement)?.firstElementChild as HTMLElement
    if (!card) {
      return null
    }

    const title = card.querySelector<HTMLElement>('.title')
    title?.replaceChildren(bookmark.path.replace(/.*\/([^/]+)$/, '$1'))

    card.style.backgroundImage = `url("/images/preview${bookmark.path}")`
    const button = card?.querySelector('button')
    button?.addEventListener('click', event => {
      Publish('Bookmarks:Remove', bookmark.path)
      event.stopPropagation()
    })
    card.addEventListener('click', event => {
      Net.PostJSON('/api/navigate/latest', {
        path: bookmark.path,
        modCount: -1
      })
        .then(() => Publish('Navigate:Load', {
          path: bookmark.folder,
          noMenu: true
        }))
      event.stopPropagation()
    })
    return card
  }

  public static buildBookmarks (data: DataWithBookmarks): void {
    this.bookmarks = data.bookmarks

    if (!this.bookmarksTab || !this.bookmarkCard || !this.bookmarkFolder) return

    const openPath = this.bookmarksTab.querySelector('details[open]')?.getAttribute('data-folderPath') || ''

    for (const existing of this.bookmarksTab.querySelectorAll('details')) {
      existing.remove()
    }

    this.BookmarkFolders = []
    for (const bookmark of this.bookmarks) {
      const folder = this.GetFolder(openPath, bookmark)
      if (!folder) {
        continue
      }
      const card = this.BuildBookmark(bookmark)
      if (!card) {
        continue
      }
      folder.appendChild(card)
    }
    this.BookmarkFolders.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0)
    for (const folder of this.BookmarkFolders) {
      this.bookmarksTab.appendChild(folder.element)
    }
  }

  public static Init () {
    this.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    this.bookmarkFolder = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    this.bookmarksTab = document.querySelector<HTMLElement>('#tabBookmarks')

    Subscribe('Navigate:Data', (data) => this.buildBookmarks(data))

    Subscribe('Bookmarks:Load', (): Promise<void> => Net.GetJSON<Bookmark[]>('/api/bookmarks')
      .then(bookmarks => this.buildBookmarks({ bookmarks })))

    Subscribe('Bookmarks:Add', (path: string): Promise<void> =>
      Net.PostJSON('/api/bookmarks/add', { path })
        .then(() => Publish('Bookmarks:Load'))
        .then(() => Publish('Loading:Success')))

    Subscribe('Bookmarks:Remove', (path: string): Promise<void> =>
      Net.PostJSON('/api/bookmarks/remove', { path })
        .then(() => Publish('Bookmarks:Load'))
        .then(() => Publish('Loading:Success')))
  }
}
