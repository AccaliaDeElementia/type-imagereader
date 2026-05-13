'use sanity'

import { publish as _publish, subscribe as _subscribe } from './pubsub.js'
import { getJSON as _getJSON, postJSON as _postJSON, acceptAnyResponse } from './net.js'
import { cloneNode } from './utils.js'
import { isHTMLElement } from '#contracts/markup.js'
import {
  type Bookmark,
  type BookmarkFolder,
  isBookmarkFolder,
  isArray,
  type Listing,
  isListing,
} from '#contracts/listing.js'

export const Imports = {
  getJSON: _getJSON,
  postJSON: _postJSON,
  subscribe: _subscribe,
  publish: _publish,
}

interface WebBookmarkFolder {
  path: string
  element: HTMLElement
}

const UNINITIALIZED_MOD_COUNT = -1
const SORT_BEFORE = -1
const SORT_AFTER = 1
const SORT_EQUAL = 0
const INITIAL_LOAD_TOKEN = 0
const TOKEN_STEP = 1

export const Bookmarks = {
  bookmarkCard: undefined as DocumentFragment | undefined,
  bookmarkFolder: undefined as DocumentFragment | undefined,
  bookmarksTab: null as HTMLElement | null,
  bookmarkFolders: [] as WebBookmarkFolder[],
  loadToken: INITIAL_LOAD_TOKEN,
}

function getOrCreateFolderElement(openPath: string, bookmarkFolder: BookmarkFolder): HTMLElement | null {
  let folder = Bookmarks.bookmarkFolders.find((e) => e.path === bookmarkFolder.path)
  if (folder === undefined) {
    const element = cloneNode(Bookmarks.bookmarkFolder, isHTMLElement)
    if (element === undefined) {
      return null
    }
    folder = {
      path: bookmarkFolder.path,
      element,
    }
    element.setAttribute('data-folderPath', bookmarkFolder.path)
    const title = element.querySelector<HTMLElement>('.title')
    if (title !== null) title.innerText = decodeURI(bookmarkFolder.name)
    title?.addEventListener('click', () => {
      for (const otherFolder of Bookmarks.bookmarkFolders) {
        otherFolder.element.classList.add('closed')
      }
      element.classList.remove('closed')
    })
    if (bookmarkFolder.path === openPath) {
      element.classList.remove('closed')
    }
    Bookmarks.bookmarkFolders.push(folder)
  }
  return folder.element
}

function buildBookmark(bookmark: Bookmark): HTMLElement | null {
  const card = cloneNode(Bookmarks.bookmarkCard, isHTMLElement)
  if (card === undefined) {
    return null
  }

  const title = card.querySelector<HTMLElement>('.title')
  title?.replaceChildren(bookmark.path.replace(/.*\/(?<name>[^\/]+)$/v, '$<name>'))

  card.style.backgroundImage = `url("/images/preview${bookmark.path}-image.webp")`
  const button = card.querySelector('button')
  button?.addEventListener('click', (event) => {
    Imports.publish('Bookmarks:Remove', bookmark.path)
    event.stopPropagation()
  })
  card.addEventListener('click', (event) => {
    Imports.postJSON(
      '/api/navigate/latest',
      {
        path: bookmark.path,
        modCount: UNINITIALIZED_MOD_COUNT,
      },
      acceptAnyResponse,
    )
      .then(() => {
        Imports.publish('Navigate:Load', {
          path: bookmark.folder,
          name: '',
          parent: '',
          noMenu: true,
        })
      })
      .catch(() => null)
    event.stopPropagation()
  })
  return card
}

function buildBookmarkNodes(data: Listing, openPath: string): void {
  if (data.bookmarks === undefined) return
  for (const folder of data.bookmarks) {
    const folderNode = Internals.getOrCreateFolderElement(openPath, folder)
    if (folderNode === null) {
      continue
    }
    for (const bookmark of folder.bookmarks) {
      const card = Internals.buildBookmark(bookmark)
      if (card === null) {
        continue
      }
      folderNode.appendChild(card)
    }
  }
}

function buildBookmarks(data: Listing): void {
  if (
    Bookmarks.bookmarksTab === null ||
    Bookmarks.bookmarkCard === undefined ||
    Bookmarks.bookmarkFolder === undefined
  ) {
    return
  }

  const openPath =
    Bookmarks.bookmarksTab.querySelector('.folder:not(.closed)')?.getAttribute('data-folderPath') ?? data.path

  for (const existing of Bookmarks.bookmarksTab.querySelectorAll('div.folder')) {
    existing.remove()
  }

  Bookmarks.bookmarkFolders = []
  Internals.buildBookmarkNodes(data, openPath)
  Bookmarks.bookmarkFolders.sort((a, b) => (a.path < b.path ? SORT_BEFORE : a.path > b.path ? SORT_AFTER : SORT_EQUAL))
  for (const folder of Bookmarks.bookmarkFolders) {
    Bookmarks.bookmarksTab.appendChild(folder.element)
  }
}

export function init(): void {
  Bookmarks.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
  Bookmarks.bookmarkFolder = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
  Bookmarks.bookmarksTab = document.querySelector<HTMLElement>('#tabBookmarks')

  Imports.subscribe('Navigate:Data', async (data) => {
    if (isListing(data)) Internals.buildBookmarks(data)
    await Promise.resolve()
  })

  Imports.subscribe('Bookmarks:Load', async () => {
    Bookmarks.loadToken += TOKEN_STEP
    const token = Bookmarks.loadToken
    await Imports.getJSON<BookmarkFolder[]>('/api/bookmarks', (o: unknown) => isArray(o, isBookmarkFolder))
      .then((bookmarks) => {
        if (token !== Bookmarks.loadToken) return
        Internals.buildBookmarks({ name: '', parent: '', path: '', bookmarks })
      })
      .catch((err: unknown) => {
        if (token !== Bookmarks.loadToken) return
        Imports.publish('Loading:Error', err)
      })
  })

  const bookmarkAction = async (apiPath: string, path: unknown): Promise<void> => {
    if (typeof path !== 'string') return
    await Imports.postJSON(apiPath, { path }, acceptAnyResponse)
      .then(() => {
        Imports.publish('Bookmarks:Load')
        Imports.publish('Loading:Success')
      })
      .catch((err: unknown) => {
        Imports.publish('Loading:Error', err instanceof Error ? err : new Error('Non Error rejection!'))
      })
  }

  Imports.subscribe('Bookmarks:Add', async (path) => {
    await bookmarkAction('/api/bookmarks/add', path)
  })
  Imports.subscribe('Bookmarks:Remove', async (path) => {
    await bookmarkAction('/api/bookmarks/remove', path)
  })
}

export const Internals = {
  getOrCreateFolderElement,
  buildBookmark,
  buildBookmarkNodes,
  buildBookmarks,
}
