'use sanity'

import { Publish, Subscribe } from './pubsub'
import { Net } from './net'
import { CloneNode, isHTMLElement } from './utils'

export interface DataBookmark {
  name: string
  path: string
  folder: string
}

interface DataBookmarkFolder {
  name: string
  path: string
  bookmarks: DataBookmark[]
}

interface DataWithBookmarks {
  path: string
  bookmarks: DataBookmarkFolder[]
}

interface BookmarkFolder {
  name: string
  element: HTMLElement
}

export function isDataBookmark(obj: unknown): obj is DataBookmark {
  if (typeof obj !== 'object' || obj == null) return false
  if (!('name' in obj) || typeof obj.name !== 'string') return false
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  if (!('folder' in obj) || typeof obj.folder !== 'string') return false
  return true
}

function hasValidBookmarks(obj: object): boolean {
  if (!('bookmarks' in obj) || !(obj.bookmarks instanceof Array)) return false
  for (const bookmark of obj.bookmarks as unknown[]) {
    if (!isDataBookmark(bookmark)) return false
  }
  return true
}

export function isDataBookmarkFolder(obj: unknown): obj is DataBookmarkFolder[] {
  if (typeof obj !== 'object' || obj == null) return false
  if (!('name' in obj) || typeof obj.name !== 'string') return false
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  return hasValidBookmarks(obj)
}

export function isDataWithBookmarks(obj: unknown): obj is DataWithBookmarks {
  if (typeof obj !== 'object' || obj == null) return false
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  if (!('bookmarks' in obj) || !(obj.bookmarks instanceof Array)) return false
  for (const bookmark of obj.bookmarks as unknown[]) {
    if (!isDataBookmarkFolder(bookmark)) return false
  }
  return true
}

export function isDataBookmarkFolderArray(obj: unknown): obj is DataBookmarkFolder[] {
  if (typeof obj !== 'object' || !(obj instanceof Array)) return false
  for (const folder of obj as unknown[]) {
    if (!isDataBookmarkFolder(folder)) return false
  }
  return true
}

export class Bookmarks {
  protected static bookmarkCard: DocumentFragment | undefined = undefined
  protected static bookmarkFolder: DocumentFragment | undefined = undefined
  protected static bookmarksTab: HTMLElement | null = null

  public static BookmarkFolders: BookmarkFolder[] = []

  public static GetFolder(openPath: string, bookmarkFolder: DataBookmarkFolder): HTMLElement | null {
    let folder = this.BookmarkFolders.find((e) => e.name === bookmarkFolder.path)
    if (folder == null) {
      const element = CloneNode(Bookmarks.bookmarkFolder, isHTMLElement)
      if (element == null) {
        return null
      }
      folder = {
        name: bookmarkFolder.name,
        element,
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

  public static BuildBookmark(bookmark: DataBookmark): HTMLElement | null {
    const card = CloneNode(Bookmarks.bookmarkCard, isHTMLElement)
    if (card == null) {
      return null
    }

    const title = card.querySelector<HTMLElement>('.title')
    title?.replaceChildren(bookmark.path.replace(/.*\/([^/]+)$/, '$1'))

    card.style.backgroundImage = `url("/images/preview${bookmark.path}-image.webp")`
    const button = card.querySelector('button')
    button?.addEventListener('click', (event) => {
      Publish('Bookmarks:Remove', bookmark.path)
      event.stopPropagation()
    })
    card.addEventListener('click', (event) => {
      Net.PostJSON(
        '/api/navigate/latest',
        {
          path: bookmark.path,
          modCount: -1,
        },
        (_: unknown): _ is unknown => true,
      ).then(
        () => {
          Publish('Navigate:Load', {
            path: bookmark.folder,
            noMenu: true,
          })
        },
        () => null,
      )
      event.stopPropagation()
    })
    return card
  }

  public static buildBookmarkNodes(data: DataWithBookmarks, openPath: string): void {
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
  }

  public static buildBookmarks(data: DataWithBookmarks): void {
    if (this.bookmarksTab == null || this.bookmarkCard == null || this.bookmarkFolder == null) {
      return
    }

    const openPath =
      this.bookmarksTab.querySelector('.folder:not(.closed)')?.getAttribute('data-folderPath') ?? data.path

    for (const existing of this.bookmarksTab.querySelectorAll('div.folder')) {
      existing.remove()
    }

    this.BookmarkFolders = []
    this.buildBookmarkNodes(data, openPath)
    this.BookmarkFolders.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (const folder of this.BookmarkFolders) {
      this.bookmarksTab.appendChild(folder.element)
    }
  }

  public static Init(): void {
    this.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    this.bookmarkFolder = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    this.bookmarksTab = document.querySelector<HTMLElement>('#tabBookmarks')

    Subscribe('Navigate:Data', (data) => {
      if (isDataWithBookmarks(data)) this.buildBookmarks(data)
    })

    Subscribe('Bookmarks:Load', () => {
      Net.GetJSON<DataBookmarkFolder[]>('/api/bookmarks', isDataBookmarkFolderArray)
        .then((bookmarks) => {
          this.buildBookmarks({ path: '', bookmarks })
        })
        .catch(() => null)
    })

    Subscribe('Bookmarks:Add', (path) => {
      if (typeof path !== 'string') return
      Net.PostJSON('/api/bookmarks/add', { path }, (_: unknown): _ is unknown => true)
        .catch((err: unknown) => {
          if (!(err instanceof Error)) throw new Error('Non Error rejection!')
          if (err.message !== 'Empty JSON response recieved') throw err
        })
        .then(() => {
          Publish('Bookmarks:Load')
        })
        .then(() => {
          Publish('Loading:Success')
        })
        .catch(() => null)
    })

    Subscribe('Bookmarks:Remove', (path) => {
      if (typeof path !== 'string') return
      Net.PostJSON('/api/bookmarks/remove', { path }, (_: unknown): _ is unknown => true)
        .catch((err: unknown) => {
          if (!(err instanceof Error)) throw new Error('Non Error rejection!')
          if (err.message !== 'Empty JSON response recieved') throw err
        })
        .then(() => {
          Publish('Bookmarks:Load')
        })
        .then(() => {
          Publish('Loading:Success')
        })
        .catch(() => null)
    })
  }
}
