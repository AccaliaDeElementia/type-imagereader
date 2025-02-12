'use sanity'

import { Publish, Subscribe } from './pubsub'
import { Net } from './net'
import { CloneNode } from './utils'

export interface Bookmark {
  name: string
  path: string
  folder: string
}

interface BookmarkFolder {
  name: string
  path: string
  bookmarks: Bookmark[]
}


interface DataWithBookmarks {
  path: string
  bookmarks: BookmarkFolder[]
}

interface BookMarkFolder {
  name: string
  element: HTMLElement
}

export function isBookmarkFolderArray(obj: unknown): obj is BookmarkFolder[] {
  if (typeof obj !== 'object' || !(obj instanceof Array)) return false
  for (const folder of obj as unknown[]) {
    if (typeof folder !== 'object' || folder == null) return false
    if (!('name' in folder) || typeof folder.name !== 'string') return false
    if (!('path' in folder) || typeof folder.path !== 'string') return false
    if (!('bookmarks' in folder) || !(folder.bookmarks instanceof Array)) return false
    for(const bookmark of folder.bookmarks as unknown[]) {
      if (typeof bookmark !== 'object' || bookmark == null) return false
      if (!('name' in bookmark) || typeof bookmark.name !== 'string') return false
      if (!('path' in bookmark) || typeof bookmark.path !== 'string') return false
      if (!('folder' in bookmark) || typeof bookmark.folder !== 'string') return false
    }
  }
  return true
}

export class Bookmarks {
  protected static bookmarkCard: DocumentFragment | undefined = undefined
  protected static bookmarkFolder: DocumentFragment | undefined = undefined
  protected static bookmarksTab: HTMLElement | null = null

  public static BookmarkFolders: BookMarkFolder[] = []

  public static GetFolder (openPath: string, bookmarkFolder: BookmarkFolder): HTMLElement | null {
    let folder = this.BookmarkFolders.find(e => e.name === bookmarkFolder.path)
    if (folder == null) {
      const element = CloneNode(Bookmarks.bookmarkFolder)
      if (element == null) {
        return null
      }
      folder = {
        name: bookmarkFolder.name,
        element
      }
      element.setAttribute('data-folderPath', bookmarkFolder.path)
      const title = element.querySelector<HTMLElement>('.title')
      if (title != null) title.innerText = decodeURI(bookmarkFolder.name)
      title?.addEventListener('click', () => {
        for (const otherFolder of this.BookmarkFolders) {
          otherFolder.element.classList.add('closed')
        }
        element.classList.remove('closed')
      })
      if (bookmarkFolder.path === openPath) {
        element.classList.remove('closed')
      }
      this.BookmarkFolders.push(folder)
    }
    return folder.element
  }

  public static BuildBookmark (bookmark: Bookmark): HTMLElement | null {
    const card = CloneNode(Bookmarks.bookmarkCard)
    if (card == null) {
      return null
    }

    const title = card.querySelector<HTMLElement>('.title')
    title?.replaceChildren(bookmark.path.replace(/.*\/([^/]+)$/, '$1'))

    card.style.backgroundImage = `url("/images/preview${bookmark.path}-image.webp")`
    const button = card.querySelector('button')
    button?.addEventListener('click', event => {
      Publish('Bookmarks:Remove', bookmark.path)
      event.stopPropagation()
    })
    card.addEventListener('click', event => {
      Net.PostJSON('/api/navigate/latest', {
        path: bookmark.path,
        modCount: -1
      }, (_: unknown): _ is unknown => true)
        .then(() => {
          Publish('Navigate:Load', {
            path: bookmark.folder,
            noMenu: true
          })
        }, () => null)
      event.stopPropagation()
    })
    return card
  }

  public static buildBookmarks (data: DataWithBookmarks): void {
    if (this.bookmarksTab == null ||
      this.bookmarkCard == null ||
      this.bookmarkFolder == null) {
      return
    }

    const openPath = this.bookmarksTab.querySelector('.folder:not(.closed)')?.getAttribute('data-folderPath') ?? data.path

    for (const existing of this.bookmarksTab.querySelectorAll('div.folder')) {
      existing.remove()
    }

    this.BookmarkFolders = []
    // TODO: REbuild this to take advantage of the new structure instead of just massaging it into old style
    for (const folder of data.bookmarks) {
      const folderNode = this.GetFolder(openPath, folder)
      if (folderNode == null) {
        continue
      }
      for (const bookmark of folder.bookmarks) {
        const card = this.BuildBookmark(bookmark)
        if (card == null) {
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

  public static Init (): void {
    this.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    this.bookmarkFolder = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    this.bookmarksTab = document.querySelector<HTMLElement>('#tabBookmarks')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: redo with typesafe PubSub
    Subscribe('Navigate:Data', (data) => { this.buildBookmarks(data as DataWithBookmarks) })

    Subscribe('Bookmarks:Load', () => {
      Net.GetJSON<BookmarkFolder[]>('/api/bookmarks', isBookmarkFolderArray)
        .then(bookmarks => { this.buildBookmarks({ path: '', bookmarks }) })
        .catch(() => null)
    })

    Subscribe('Bookmarks:Add', (path: string) => {
      Net.PostJSON('/api/bookmarks/add', { path }, (_: unknown): _ is unknown => true)
        .then(() => { Publish('Bookmarks:Load') })
        .then(() => { Publish('Loading:Success') })
        .catch(() => null)
    })

    Subscribe('Bookmarks:Remove', (path: string) => {
      Net.PostJSON('/api/bookmarks/remove', { path }, (_: unknown): _ is unknown => true)
        .then(() => { Publish('Bookmarks:Load') })
        .then(() => { Publish('Loading:Success') })
        .catch(() => null)
    })
  }
}
