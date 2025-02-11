'use sanity'

import { normalize, basename, dirname, extname, sep } from 'path'

import type { Knex } from 'knex'

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

export class ModCount {
  protected static modCount = ModCount.Reset()

  protected static Reset (): number {
    this.modCount = Math.floor(Math.random() * 1e10)
    return this.modCount
  }

  public static Get (): number {
    return this.modCount
  }

  public static Validate (incoming: number): boolean {
    return this.modCount === incoming
  }

  public static Increment (): number {
    if (this.modCount >= Number.MAX_SAFE_INTEGER - 1) {
      this.modCount = 0
    }
    this.modCount++
    return this.modCount
  }
}

export class UriSafePath {
  public static decode (uri: string): string {
    return uri.split('/')
      .map(part => decodeURIComponent(part))
      .join('/')
  }

  public static encode (uri: string): string {
    return uri.split('/')
      .map(part => encodeURIComponent(part))
      .join('/')
  }

  public static encodeNullable (uri: string | null): string | null {
    if (uri == null || uri.length < 1) {
      return null
    }
    return UriSafePath.encode(uri)
  }
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
  folder: string
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

export class Functions {
  public static async GetChildFolders (knex: Knex, path: string): Promise<FolderWithCounts[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO, make a true typesafe db access, use Prisma maybe?
    const data = await knex('folders')
      .select(
        'path',
        'current',
        'totalCount',
        'seenCount',
        'firstPicture'
      )
      .where('folder', '=', path)
      .orderBy('sortKey') as DbChildFolder[]
    return data.map(i => ({
      name: basename(i.path),
      path: UriSafePath.encode(i.path),
      cover: UriSafePath.encodeNullable(i.current ?? i.firstPicture),
      totalCount: i.totalCount,
      totalSeen: i.seenCount
    }))
  }

  public static async GetFolder (knex: Knex, path: string): Promise<FolderWithParent | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO, make a true typesafe db access, use Prisma maybe?
    const folder = (await knex('folders')
      .select(
        'path',
        'folder',
        'sortKey',
        'current',
        'firstPicture'
      )
      .where('path', '=', path)
      .limit(1))[0] as DbFolder | undefined
    if (folder == null) {
      return null
    }
    return {
      name: basename(folder.path),
      path: UriSafePath.encode(folder.path),
      folder: UriSafePath.encode(folder.folder),
      sortKey: folder.sortKey,
      cover: UriSafePath.encodeNullable(folder.current ?? folder.firstPicture)
    }
  }

  // eslint-disable-next-line  @typescript-eslint/max-params -- TODO: refactor to simplify call
  public static async GetDirectionFolder (knex: Knex, path: string, sortKey: string, direction: 'asc' | 'desc', type: 'all' | 'unread'): Promise<Folder | null> {
    const comparer = direction === 'asc' ? '>' : '<'
    const folderpath = normalize(dirname(path) + sep)
    const doSelect = (filter: (query: Knex.QueryBuilder) => Knex.QueryBuilder): Knex.QueryBuilder => {
      let query = knex('folders')
        .select(
          'path',
          'current',
          'firstPicture'
        )
        .where('folder', '=', folderpath)
      if (type === 'unread') {
        query = query.andWhere('totalCount', '>', knex.raw('"seenCount"'))
      }
      return filter(query).limit(1)
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO, make a true typesafe db access, use Prisma maybe?
    const folder = (await knex.union([
      doSelect(query => query
        .andWhere('sortKey', '=', sortKey)
        .andWhere('path', comparer, path)
        .orderBy('path', direction)),
      doSelect(query => query
        .andWhere('sortKey', comparer, sortKey)
        .orderBy('sortKey', direction))
    ], true))[0] as DbFolder | undefined
    if (folder == null) {
      return null
    }
    return {
      name: basename(folder.path),
      path: UriSafePath.encode(folder.path),
      cover: UriSafePath.encodeNullable(folder.current ?? folder.firstPicture)
    }
  }

  public static async GetPreviousFolder (knex: Knex, path: string, sortKey: string): Promise<Folder | null> {
    return await Functions.GetDirectionFolder(knex, path, sortKey, 'desc', 'all')
  }

  public static async GetNextFolder (knex: Knex, path: string, sortKey: string): Promise<Folder | null> {
    return await Functions.GetDirectionFolder(knex, path, sortKey, 'asc', 'all')
  }

  public static async GetPictures (knex: Knex, path: string): Promise<Picture[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO, make a true typesafe db access, use Prisma maybe?
    const pics = await knex('pictures')
      .select(
        'path',
        'seen'
      )
      .where('folder', '=', path)
      .orderBy('sortKey', 'path') as DbPicture[]
    return pics.map((pic, index) => ({
      name: basename(pic.path, extname(pic.path)),
      path: UriSafePath.encode(pic.path),
      index,
      seen: !!pic.seen
    }))
  }

  public static async GetBookmarks (knex: Knex): Promise<BookmarkFolder[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO, make a true typesafe db access, use Prisma maybe?
    const bookmarks = await knex('bookmarks')
      .select(
        'pictures.path',
        'pictures.folder'
      )
      .join('pictures', 'pictures.path', 'bookmarks.path')
      .join('folders', 'folders.path', 'pictures.folder')
      .orderBy([
        'folders.path',
        'folders.sortKey',
        'pictures.sortKey',
        'pictures.path'
      ]) as DbBookmark[]
    let folder: BookmarkFolder = {
      name: '',
      path: '',
      bookmarks: []
    }
    const results = []
    for (const bookmark of bookmarks) {
      if (bookmark.folder !== folder.name) {
        results.push(folder)
        folder = {
          name: bookmark.folder,
          path: UriSafePath.encode(bookmark.folder),
          bookmarks: []
        }
      }
      folder.bookmarks.push({
        name: basename(bookmark.path),
        path: UriSafePath.encode(bookmark.path),
        folder: UriSafePath.encode(bookmark.folder)
      })
    }
    results.push(folder)
    results.shift()
    return results
  }

  public static async GetListing (knex: Knex, path: string): Promise<Listing | null> {
    const folder = await Functions.GetFolder(knex, path)
    if (folder == null) {
      return null
    }
    const next = await Functions.GetNextFolder(knex, path, folder.sortKey)
    const nextUnread = await Functions.GetDirectionFolder(knex, path, folder.sortKey, 'asc', 'unread')
    const prev = await Functions.GetPreviousFolder(knex, path, folder.sortKey)
    const prevUnread = await Functions.GetDirectionFolder(knex, path, folder.sortKey, 'desc', 'unread')
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
      modCount: ModCount.Get()
    }
  }

  public static GetPictureFolders (path: string): string[] {
    const results = []
    let parent = path
    while (parent !== sep) {
      parent = normalize(dirname(parent) + sep)
      results.push(parent)
    }
    return results
  }

  public static async SetLatestPicture (knex: Knex, path: string): Promise<string | null> {
    const folder = normalize(dirname(path) + sep)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO, make a true typesafe db access, use Prisma maybe?
    const picture = (await knex('pictures').select('seen').where({ path }))[0] as DbPicture | undefined
    if (picture == null) { return null }
    if (!picture.seen) {
      await knex('folders').increment('seenCount', 1).whereIn('path', Functions.GetPictureFolders(path))
      await knex('pictures').update({ seen: true }).where({ path })
    }
    await knex('folders').update({ current: path }).where({ path: folder })
    return UriSafePath.encode(folder)
  }

  public static async MarkFolderRead (knex: Knex, path: string): Promise<void> {
    const updates = await knex('pictures')
      .update({ seen: true })
      .where({ seen: false })
      .andWhere('folder', 'like', `${path}%`)
    if (updates > 0) {
      await knex('folders')
        .increment('seenCount', updates)
        .whereIn('path', Functions.GetPictureFolders(path))
      await knex('folders')
        .update({ seenCount: knex.raw('"totalCount"') })
        .where('path', 'like', `${path}%`)
        .orWhere({ path })
    }
  }

  public static async MarkFolderUnread (knex: Knex, path: string): Promise<void> {
    const updates = await knex('pictures')
      .update({ seen: false })
      .where({ seen: true })
      .andWhere('folder', 'like', `${path}%`)
    if (updates > 0) {
      await knex('folders')
        .increment('seenCount', -updates)
        .whereIn('path', Functions.GetPictureFolders(path))
      await knex('folders')
        .update({ seenCount: 0, current: null })
        .where('path', 'like', `${path}%`)
        .orWhere({ path })
    }
  }

  public static async AddBookmark (knex: Knex, path: string): Promise<void> {
    await knex('bookmarks')
      .insert({ path })
      .onConflict('path')
      .ignore()
  }

  public static async RemoveBookmark (knex: Knex, path: string): Promise<void> {
    await knex('bookmarks')
      .where({ path })
      .delete()
  }
}
