'use sanity'

import { normalize, basename, dirname, extname, sep } from 'node:path'

import type { Knex } from 'knex'
import { EscapeLikeWildcards, StringishHasValue } from '#utils/helpers'
import { GetParentFolders as _GetParentFolders } from '#utils/Path'

export const Imports = { GetParentFolders: _GetParentFolders }

export const INVALID_MOD_COUNT = -1
const MAXIMUM_MOD_COUNT = Number.MAX_SAFE_INTEGER + INVALID_MOD_COUNT
const RESET_MOD_COUNT = 0
const INCREMENT_SINGLE = 1
const MODCOUNT_INITIAL_MAGNITUDE = 1e10
const LIMIT_SINGLE_RECORD = 1
const ZERO_COUNT = 0

export interface Bookmark {
  name: string
  path: string
  folder: string
}

export interface BookmarkFolder {
  name: string
  path: string
  bookmarks: Bookmark[]
}

export interface Folder {
  name: string
  path: string
  cover: string | null
}

export interface FolderWithParent extends Folder {
  folder: string
  sortKey: string
}

export interface FolderWithCounts extends Folder {
  totalCount: number
  totalSeen: number
}

export interface Picture {
  name: string
  path: string
  index: number
  seen: boolean
}

interface Listing {
  name: string
  path: string
  parent: string
  cover: string | null
  next: Folder | null
  nextUnread: Folder | null
  prev: Folder | null
  prevUnread: Folder | null
  children: FolderWithCounts[]
  pictures: Picture[]
  bookmarks: BookmarkFolder[]
  modCount: number
}
interface ModCountType {
  _modCount: number
  _Reset: () => number
  Get: () => number
  Validate: (incoming: number) => boolean
  Increment: () => number
}
export const ModCount: ModCountType = {
  _modCount: INVALID_MOD_COUNT,
  _Reset: (): number => {
    ModCount._modCount = Math.floor(Math.random() * MODCOUNT_INITIAL_MAGNITUDE)
    return ModCount._modCount
  },
  Get: (): number => ModCount._modCount,
  Validate: (incoming: number): boolean => ModCount._modCount === incoming,
  Increment: (): number => {
    if (ModCount._modCount >= MAXIMUM_MOD_COUNT) {
      ModCount._modCount = RESET_MOD_COUNT
    }
    ModCount._modCount += INCREMENT_SINGLE
    return ModCount._modCount
  },
}
ModCount._Reset()

export const UriSafePath = {
  decode: (uri: string): string =>
    uri
      .split('/')
      .map((part) => decodeURIComponent(part))
      .join('/'),
  encode: (uri: string): string =>
    uri
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/'),
  encodeNullable: (uri: string | null | undefined): string | null => {
    if (!StringishHasValue(uri)) {
      return null
    }
    return UriSafePath.encode(uri)
  },
}

interface DbChildFolder {
  path: string
  current: string | null
  firstPicture: string | null
  totalCount: number
  seenCount: number
}

interface DbFolder {
  path: string
  folder: string | null
  sortKey: string
  current: string | null
  firstPicture: string | null
}

interface DbPicture {
  path: string
  seen: boolean
}

interface DbBookmark {
  path: string
  folder: string
}

export interface SiblingFolderSearch {
  path: string
  sortKey: string
  direction: 'asc' | 'desc'
  type: 'all' | 'unread'
}

export const Functions = {
  GetChildFolders: async (knex: Knex, path: string): Promise<FolderWithCounts[]> => {
    const data = await knex('folders')
      .select<DbChildFolder[]>('path', 'current', 'totalCount', 'seenCount', 'firstPicture')
      .where('folder', '=', path)
      .orderBy('sortKey')
    return data.map((i) => ({
      name: basename(i.path),
      path: UriSafePath.encode(i.path),
      cover: UriSafePath.encodeNullable(i.current ?? i.firstPicture),
      totalCount: i.totalCount,
      totalSeen: i.seenCount,
    }))
  },
  GetFolder: async (knex: Knex, path: string): Promise<FolderWithParent | null> => {
    const folder = (
      await knex('folders')
        .select<DbFolder[]>('path', 'folder', 'sortKey', 'current', 'firstPicture')
        .where('path', '=', path)
        .limit(LIMIT_SINGLE_RECORD)
    ).shift()
    if (folder === undefined) {
      return null
    }
    return {
      name: basename(folder.path),
      path: UriSafePath.encode(folder.path),
      folder: UriSafePath.encode(folder.folder ?? '/'),
      sortKey: folder.sortKey,
      cover: UriSafePath.encodeNullable(folder.current ?? folder.firstPicture),
    }
  },
  GetDirectionFolder: async (
    knex: Knex,
    { path, sortKey, direction, type }: SiblingFolderSearch,
  ): Promise<Folder | null> => {
    const comparer = direction === 'asc' ? '>' : '<'
    const folderpath = normalize(dirname(path) + sep)
    const doSelect = (
      filter: (query: Knex.QueryBuilder) => Knex.QueryBuilder,
    ): Knex.QueryBuilder<DbFolder, DbFolder[]> => {
      let query = knex('folders').select<DbFolder[]>('path', 'current', 'firstPicture').where('folder', '=', folderpath)
      if (type === 'unread') {
        query = query.andWhere('totalCount', '>', knex.raw('"seenCount"'))
      }
      return filter(query).limit(LIMIT_SINGLE_RECORD)
    }
    const eqlFolders = await doSelect((query) =>
      query.andWhere('sortKey', '=', sortKey).andWhere('path', comparer, path).orderBy('path', direction),
    )
    const neqFolders = await doSelect((query) =>
      query.andWhere('sortKey', comparer, sortKey).orderBy('sortKey', direction),
    )
    const folder = [...eqlFolders, ...neqFolders].shift()
    if (folder === undefined) {
      return null
    }
    return {
      name: basename(folder.path),
      path: UriSafePath.encode(folder.path),
      cover: UriSafePath.encodeNullable(folder.current ?? folder.firstPicture),
    }
  },
  GetPreviousFolder: async (knex: Knex, path: string, sortKey: string): Promise<Folder | null> =>
    await Functions.GetDirectionFolder(knex, { path, sortKey, direction: 'desc', type: 'all' }),
  GetNextFolder: async (knex: Knex, path: string, sortKey: string): Promise<Folder | null> =>
    await Functions.GetDirectionFolder(knex, { path, sortKey, direction: 'asc', type: 'all' }),
  GetPictures: async (knex: Knex, path: string): Promise<Picture[]> => {
    const pics = await knex('pictures')
      .select<DbPicture[]>('path', 'seen')
      .where('folder', '=', path)
      .orderBy('sortKey', 'path')
    return pics.map((pic, index) => ({
      name: basename(pic.path, extname(pic.path)),
      path: UriSafePath.encode(pic.path),
      index,
      seen: pic.seen,
    }))
  },
  GetBookmarks: async (knex: Knex): Promise<BookmarkFolder[]> => {
    const bookmarks = await knex('bookmarks')
      .select<DbBookmark[]>('pictures.path', 'pictures.folder')
      .join('pictures', 'pictures.path', 'bookmarks.path')
      .join('folders', 'folders.path', 'pictures.folder')
      .orderBy(['folders.path', 'folders.sortKey', 'pictures.sortKey', 'pictures.path'])
    let folder: BookmarkFolder = {
      name: '',
      path: '',
      bookmarks: [],
    }
    const results = []
    for (const bookmark of bookmarks) {
      if (bookmark.folder !== folder.name) {
        results.push(folder)
        folder = {
          name: bookmark.folder,
          path: UriSafePath.encode(bookmark.folder),
          bookmarks: [],
        }
      }
      folder.bookmarks.push({
        name: basename(bookmark.path),
        path: UriSafePath.encode(bookmark.path),
        folder: UriSafePath.encode(bookmark.folder),
      })
    }
    results.push(folder)
    results.shift()
    return results
  },
  GetListing: async (knex: Knex, path: string): Promise<Listing | null> => {
    const folder = await Functions.GetFolder(knex, path)
    if (folder === null) {
      return null
    }
    const next = await Functions.GetNextFolder(knex, path, folder.sortKey)
    const nextUnread = await Functions.GetDirectionFolder(knex, {
      path,
      sortKey: folder.sortKey,
      direction: 'asc',
      type: 'unread',
    })
    const prev = await Functions.GetPreviousFolder(knex, path, folder.sortKey)
    const prevUnread = await Functions.GetDirectionFolder(knex, {
      path,
      sortKey: folder.sortKey,
      direction: 'desc',
      type: 'unread',
    })
    const children = await Functions.GetChildFolders(knex, path)
    const pictures = await Functions.GetPictures(knex, path)
    const bookmarks = await Functions.GetBookmarks(knex)
    return {
      name: folder.name,
      path: folder.path,
      parent: folder.folder,
      cover: folder.cover,
      next,
      nextUnread,
      prev,
      prevUnread,
      children,
      pictures,
      bookmarks,
      modCount: ModCount.Get(),
    }
  },
  SetLatestPicture: async (knex: Knex, path: string): Promise<string | null> => {
    const folder = normalize(dirname(path) + sep)
    const picture = (await knex('pictures').select<DbPicture[]>('seen').where({ path })).shift()
    if (picture === undefined) {
      return null
    }
    if (!picture.seen) {
      await knex('folders').increment('seenCount', INCREMENT_SINGLE).whereIn('path', Imports.GetParentFolders(path))
      await knex('pictures').update({ seen: true }).where({ path })
    }
    await knex('folders').update({ current: path }).where({ path: folder })
    return UriSafePath.encode(folder)
  },
  MarkFolderSeen: async (knex: Knex, path: string, markAsSeen: boolean): Promise<void> => {
    const updates = await knex('pictures')
      .update({ seen: markAsSeen })
      .where({ seen: !markAsSeen })
      .andWhere('folder', 'like', `${EscapeLikeWildcards(path)}%`)
    if (updates > ZERO_COUNT) {
      const increment = markAsSeen ? updates : -updates
      await knex('folders').increment('seenCount', increment).whereIn('path', Imports.GetParentFolders(path))
      const folderUpdate = markAsSeen
        ? { seenCount: knex.raw('"totalCount"') }
        : { seenCount: ZERO_COUNT, current: null }
      await knex('folders')
        .update(folderUpdate)
        .where('path', 'like', `${EscapeLikeWildcards(path)}%`)
        .orWhere({ path })
    }
  },
  AddBookmark: async (knex: Knex, path: string): Promise<void> => {
    await knex('bookmarks').insert({ path }).onConflict('path').ignore()
  },
  RemoveBookmark: async (knex: Knex, path: string): Promise<void> => {
    await knex('bookmarks').where({ path }).delete()
  },
}
