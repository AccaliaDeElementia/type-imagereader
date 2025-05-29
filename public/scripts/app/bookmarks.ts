'use sanity'

import { Publish, Subscribe } from './pubsub'
import { Net } from './net'
import { CloneNode, isHTMLElement } from './utils'

import {
  type Bookmark,
  type BookmarkFolder,
  isBookmarkFolder,
  isArray,
  type Listing,
  isListing,
} from '../../../contracts/listing'

interface WebBookmarkFolder {
  name: string
  element: HTMLElement
}

export const Bookmarks = {
  bookmarkCard: ((): DocumentFragment | undefined => undefined)(),
  bookmarkFolder: ((): DocumentFragment | undefined => undefined)(),
  bookmarksTab: ((): HTMLElement | null => null)(),
  BookmarkFolders: ((): WebBookmarkFolder[] => [])(),
  GetFolder: (openPath: string, bookmarkFolder: BookmarkFolder): HTMLElement | null => {
    let folder = Bookmarks.BookmarkFolders.find((e) => e.name === bookmarkFolder.path)
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
        for (const otherFolder of Bookmarks.BookmarkFolders) {
          otherFolder.element.classList.add('closed')
        }
        element.classList.remove('closed')
      })
      if (bookmarkFolder.path === openPath) {
        element.classList.remove('closed')
      }
      Bookmarks.BookmarkFolders.push(folder)
    }
    return folder.element
  },
  BuildBookmark: (bookmark: Bookmark): HTMLElement | null => {
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
  },
  buildBookmarkNodes: (data: Listing, openPath: string): void => {
    if (data.bookmarks === undefined) return
    for (const folder of data.bookmarks) {
      const folderNode = Bookmarks.GetFolder(openPath, folder)
      if (folderNode == null) {
        continue
      }
      for (const bookmark of folder.bookmarks) {
        const card = Bookmarks.BuildBookmark(bookmark)
        if (card == null) {
          continue
        }
        folderNode.appendChild(card)
      }
    }
  },
  buildBookmarks: (data: Listing): void => {
    if (Bookmarks.bookmarksTab == null || Bookmarks.bookmarkCard == null || Bookmarks.bookmarkFolder == null) {
      return
    }

    const openPath =
      Bookmarks.bookmarksTab.querySelector('.folder:not(.closed)')?.getAttribute('data-folderPath') ?? data.path

    for (const existing of Bookmarks.bookmarksTab.querySelectorAll('div.folder')) {
      existing.remove()
    }

    Bookmarks.BookmarkFolders = []
    Bookmarks.buildBookmarkNodes(data, openPath)
    Bookmarks.BookmarkFolders.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (const folder of Bookmarks.BookmarkFolders) {
      Bookmarks.bookmarksTab.appendChild(folder.element)
    }
  },
  Init: (): void => {
    Bookmarks.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    Bookmarks.bookmarkFolder = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    Bookmarks.bookmarksTab = document.querySelector<HTMLElement>('#tabBookmarks')

    Subscribe('Navigate:Data', async (data) => {
      if (isListing(data)) Bookmarks.buildBookmarks(data)
      await Promise.resolve()
    })

    Subscribe('Bookmarks:Load', async () => {
      await Net.GetJSON<BookmarkFolder[]>('/api/bookmarks', (o: unknown) => isArray(o, isBookmarkFolder))
        .then((bookmarks) => {
          Bookmarks.buildBookmarks({ name: '', parent: '', path: '', bookmarks })
        })
        .catch(() => null)
    })

    Subscribe('Bookmarks:Add', async (path) => {
      if (typeof path !== 'string') return
      await Net.PostJSON('/api/bookmarks/add', { path }, (_: unknown): _ is unknown => true)
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

    Subscribe('Bookmarks:Remove', async (path) => {
      if (typeof path !== 'string') return
      await Net.PostJSON('/api/bookmarks/remove', { path }, (_: unknown): _ is unknown => true)
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
  },
}
