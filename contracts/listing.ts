'use sanity'

import { isHTMLElement } from './markup'

function hasOptionalKey(obj: object, key: string, isT: (o: unknown) => boolean): boolean {
  const entries = Object.entries(obj)
  const e = entries.find(([k]) => k === key)
  return e === undefined || e[1] === undefined || isT(e[1])
}

function hasRequiredKey(obj: object, key: string, isT: (o: unknown) => boolean): boolean {
  const entries = Object.entries(obj)
  const e = entries.find(([k]) => k === key)
  return e !== undefined && isT(e[1])
}

export interface Bookmark {
  name: string
  path: string
  folder: string
}

export function isBookmark(obj: unknown): obj is Bookmark {
  if (obj == null || typeof obj !== 'object' || obj instanceof Array) return false
  if (!('name' in obj) || typeof obj.name !== 'string') return false
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  if (!('folder' in obj) || typeof obj.folder !== 'string') return false
  return true
}

export interface BookmarkFolder {
  name: string
  path: string
  bookmarks: Bookmark[]
}

function hasValidBookmarks(obj: object): boolean {
  if (!('bookmarks' in obj) || !(obj.bookmarks instanceof Array)) return false
  for (const bookmark of obj.bookmarks as unknown[]) {
    if (!isBookmark(bookmark)) return false
  }
  return true
}

export function isBookmarkFolder(obj: unknown): obj is BookmarkFolder {
  if (typeof obj !== 'object' || obj == null) return false
  if (!('name' in obj) || typeof obj.name !== 'string') return false
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  return hasValidBookmarks(obj)
}

export interface Folder {
  name: string
  path: string
  cover: string | null
}

export interface FolderWithCounts extends Folder {
  totalCount: number
  totalSeen: number
}

export function isFolder(obj: unknown): obj is Folder {
  if (obj == null || typeof obj !== 'object') return false
  if (!hasRequiredKey(obj, 'name', (o) => typeof o === 'string')) return false
  if (!hasRequiredKey(obj, 'path', (o) => typeof o === 'string')) return false
  if (!('cover' in obj) || !(typeof obj.cover === 'string' || obj.cover === null)) return false
  return true
}

export function isFolderWithCounts(obj: unknown): obj is FolderWithCounts {
  if (!isFolder(obj)) return false
  if (!('totalCount' in obj) || typeof obj.totalCount !== 'number') return false
  if (!('totalSeen' in obj) || typeof obj.totalSeen !== 'number') return false
  return true
}

export interface Picture {
  name: string
  path: string
  seen: boolean
  index?: number
  page?: number
  element?: HTMLElement
}

function isApiPicture(obj: object): boolean {
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  if (!('name' in obj) || typeof obj.name !== 'string') return false
  if (!('seen' in obj) || typeof obj.seen !== 'boolean') return false
  return true
}

function isUIPicture(obj: object): boolean {
  if ('index' in obj && !(obj.index === undefined || typeof obj.index === 'number')) return false
  if ('page' in obj && !(obj.page === undefined || typeof obj.page === 'number')) return false
  if ('element' in obj && !(obj.element === undefined || isHTMLElement(obj.element))) return false
  return true
}

export function isPicture(obj: unknown): obj is Picture {
  if (obj == null || typeof obj !== 'object') return false
  return isApiPicture(obj) && isUIPicture(obj)
}

export function isArray<T>(obj: unknown, isT: (o: unknown) => o is T): obj is T[] {
  if (!(obj instanceof Array)) return false
  if (obj.some((x) => !isT(x))) return false
  return true
}

export interface Listing {
  name: string
  path: string
  parent: string
  cover?: string
  next?: Folder
  nextUnread?: Folder
  prev?: Folder
  prevUnread?: Folder
  children?: FolderWithCounts[]
  pictures?: Picture[]
  bookmarks?: BookmarkFolder[]
  modCount?: number
  noMenu?: boolean
}
function hasListingNestedFields(obj: object): boolean {
  if (!hasOptionalKey(obj, 'next', isFolder)) return false
  if (!hasOptionalKey(obj, 'nextUnread', isFolder)) return false
  if (!hasOptionalKey(obj, 'prev', isFolder)) return false
  if (!hasOptionalKey(obj, 'prevUnread', isFolder)) return false
  if (!hasOptionalKey(obj, 'children', (o) => isArray(o, isFolderWithCounts))) return false
  if (!hasOptionalKey(obj, 'pictures', (o) => isArray(o, isPicture))) return false
  if (!hasOptionalKey(obj, 'bookmarks', (o) => isArray(o, isBookmarkFolder))) return false
  return true
}

function hasListingFields(obj: object): boolean {
  if (!hasRequiredKey(obj, 'name', (o) => typeof o === 'string')) return false
  if (!hasRequiredKey(obj, 'path', (o) => typeof o === 'string')) return false
  if (!hasRequiredKey(obj, 'parent', (o) => typeof o === 'string')) return false
  if (!hasOptionalKey(obj, 'cover', (o) => typeof o === 'string')) return false
  if (!hasOptionalKey(obj, 'modCount', (o) => typeof o === 'number')) return false
  if (!hasOptionalKey(obj, 'noMenu', (o) => typeof o === 'boolean')) return false
  return true
}

export function isListing(obj: unknown): obj is Listing {
  if (obj == null || typeof obj !== 'object') return false
  return hasListingFields(obj) && hasListingNestedFields(obj)
}
