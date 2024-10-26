'use sanity'

import { Publish, Subscribe } from './pubsub'
import { Net } from './net'

export interface Bookmark {
  name: string
  path: string
  folder: string
}

interface BookmarkFolder {
  name: string,
  path: string,
  bookmarks: Bookmark[]
}

interface DataWithBookmarks {
  path: string,
  bookmarks: BookmarkFolder[]
}

interface BookMarkFolder {
  name: string
  element: HTMLElement
}

export class Bookmarks {
  protected static bookmarkCard: DocumentFragment | undefined = undefined
  protected static bookmarkFolder: DocumentFragment | undefined = undefined
  protected static bookmarksTab: HTMLElement | null = null

  public static BookmarkFolders: BookMarkFolder[] = []

  public static GetFolder (openPath: string, bookmarkFolder: BookmarkFolder): HTMLElement | null {
    let folder = this.BookmarkFolders.filter(e => e.name === bookmarkFolder.path)[0]
    if (!folder) {
      const element = (Bookmarks.bookmarkFolder?.cloneNode(true) as HTMLElement | null)?.firstElementChild as HTMLElement | null
      if (!element) {
        return null
      }
      folder = {
        name: bookmarkFolder.name,
        element
      }
      element.setAttribute('data-folderPath', bookmarkFolder.path)
      const title = element.querySelector<HTMLElement>('.title')
      if (title) title.innerText = decodeURI(bookmarkFolder.name)
      title?.addEventListener('click', (e) => {
        for (const otherFolder of this.BookmarkFolders) {
          otherFolder.element.classList.add('closed')
        }
        (e.target as HTMLElement).parentElement?.classList.remove('closed')
      })
      if (bookmarkFolder.path === openPath) {
        element.classList.remove('closed')
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

    card.style.backgroundImage = `url("/images/preview${bookmark.path}-image.webp")`
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
        }), () => {})
      event.stopPropagation()
    })
    return card
  }

  public static buildBookmarks (data: DataWithBookmarks): void {
    if (!this.bookmarksTab || !this.bookmarkCard || !this.bookmarkFolder) return

    const openPath = this.bookmarksTab.querySelector('.folder:not(.closed)')?.getAttribute('data-folderPath') || data.path

    for (const existing of this.bookmarksTab.querySelectorAll('div.folder')) {
      existing.remove()
    }

    this.BookmarkFolders = []
    // TODO: REbuild this to take advantage of the new structure instead of just massaging it into old style
    for (const folder of data.bookmarks) {
      const folderNode = this.GetFolder(openPath, folder)
      if (!folderNode) {
        continue
      }
      for (const bookmark of folder.bookmarks) {
        const card = this.BuildBookmark(bookmark)
        if (!card) {
          continue
        }
        folderNode.appendChild(card)
      }
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

    Subscribe('Bookmarks:Load', (): Promise<void> => Net.GetJSON<BookmarkFolder[]>('/api/bookmarks')
      .then(bookmarks => this.buildBookmarks({ path: '', bookmarks })))

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
