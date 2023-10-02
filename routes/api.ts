'use sanity'

import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize, basename, dirname, sep } from 'path'

import persistance from '../utils/persistance'
import { Knex } from 'knex'

import debug from 'debug'

export interface Bookmark {
  name: string,
  path: string,
  folder: string
}

export interface BookmarkFolder {
  name: string,
  bookmarks: Bookmark[]
}

export interface Folder {
  name: string,
  path: string,
  cover: string|null
}

export interface FolderWithParent extends Folder {
  folder: string,
  sortKey: string
}

export interface FolderWithCounts extends Folder {
  totalCount: number,
  totalSeen: number
}

export interface Picture {
  name: string,
  path: string,
  index: number,
  seen: boolean
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

  public static Validate (incoming: number) {
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
    return `${uri}`.split('/')
      .map(part => decodeURIComponent(part))
      .join('/')
  }

  public static encode (uri: string): string {
    return `${uri}`.split('/')
      .map(part => encodeURIComponent(part))
      .join('/')
  }

  public static encodeNullable (uri: string|null): string|null {
    if (!uri) {
      return null
    }
    return UriSafePath.encode(uri)
  }
}

export class Functions {
  public static async GetChildFolders (knex: Knex, path: string): Promise<FolderWithCounts[]> {
    const data = await knex('folders')
      .select(
        'path',
        'current',
        'totalCount',
        'seenCount',
        'firstPicture'
      )
      .where('folder', '=', path)
      .orderBy('sortKey')
    return data.map(i => {
      return {
        name: basename(i.path),
        path: UriSafePath.encode(i.path),
        cover: UriSafePath.encodeNullable(i.current || i.firstPicture),
        totalCount: i.totalCount,
        totalSeen: i.seenCount
      }
    })
  }

  public static async GetFolder (knex: Knex, path: string): Promise<FolderWithParent|null> {
    const folder = (await knex('folders')
      .select(
        'path',
        'folder',
        'sortKey',
        'current',
        'firstPicture'
      )
      .where('path', '=', path)
      .limit(1))[0]
    if (!folder) {
      return null
    }
    return {
      name: basename(folder.path),
      path: UriSafePath.encode(folder.path),
      folder: UriSafePath.encode(folder.folder),
      sortKey: folder.sortKey,
      cover: UriSafePath.encodeNullable(folder.current || folder.firstPicture)
    }
  }

  public static async GetDirectionFolder (knex: Knex, path: string, sortKey: string, direction: 'asc'|'desc'): Promise<Folder|null> {
    const comparer = direction === 'asc' ? '>' : '<'
    const folderpath = normalize(dirname(path) + sep)
    const folder = (await knex.union([
      knex('folders')
        .select(
          'path',
          'current',
          'firstPicture'
        )
        .where('folder', '=', folderpath)
        .andWhere('sortKey', '=', sortKey)
        .andWhere('path', comparer, path)
        .orderBy('path', direction)
        .limit(1),
      knex('folders')
        .select(
          'path',
          'current',
          'firstPicture'
        )
        .where('folder', '=', folderpath)
        .andWhere('sortKey', comparer, sortKey)
        .orderBy('sortKey', direction)
        .limit(1)
    ], true))[0]
    if (!folder) {
      return null
    }
    return {
      name: basename(folder.path),
      path: UriSafePath.encode(folder.path),
      cover: UriSafePath.encodeNullable(folder.current || folder.firstPicture)
    }
  }

  public static async GetPreviousFolder (knex: Knex, path: string, sortKey: string): Promise<Folder|null> {
    return Functions.GetDirectionFolder(knex, path, sortKey, 'desc')
  }

  public static async GetNextFolder (knex: Knex, path: string, sortKey: string): Promise<Folder|null> {
    return Functions.GetDirectionFolder(knex, path, sortKey, 'asc')
  }

  public static async GetPictures (knex: Knex, path: string): Promise<Picture[]> {
    return (await knex('pictures')
      .select(
        'path',
        'seen'
      )
      .where('folder', '=', path)
      .orderBy('sortKey', 'path')
    ).map((pic, index) => {
      return {
        name: basename(pic.path),
        path: UriSafePath.encode(pic.path),
        index,
        seen: !!pic.seen
      }
    })
  }

  public static async GetBookmarks (knex: Knex): Promise<BookmarkFolder[]> {
    const bookmarks = await knex('bookmarks')
      .select(
        'pictures.path',
        'pictures.folder'
      )
      .join('pictures', 'pictures.path', 'bookmarks.path')
      .join('folders', 'folders.path', 'pictures.folder')
      .orderBy([
        'folders.sortKey',
        'folders.path',
        'pictures.sortKey',
        'pictures.path'
      ])
    let folder: BookmarkFolder = {
      name: '',
      bookmarks: []
    }
    const results = []
    for (const bookmark of bookmarks) {
      if (bookmark.folder !== folder.name) {
        results.push(folder)
        folder = {
          name: bookmark.folder,
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

  public static async GetListing (knex: Knex, path: string) {
    const folder = await Functions.GetFolder(knex, path)
    if (!folder) {
      return null
    }
    const next = await Functions.GetNextFolder(knex, path, folder.sortKey)
    const prev = await Functions.GetPreviousFolder(knex, path, folder.sortKey)
    const children = await Functions.GetChildFolders(knex, path)
    const pictures = await Functions.GetPictures(knex, path)
    const bookmarks = await Functions.GetBookmarks(knex)
    return {
      name: folder.name,
      path: folder.path,
      parent: folder.folder,
      cover: folder.cover,
      next,
      prev,
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
    const picture = (await knex('pictures').select('seen').where({ path }))[0]
    if (!picture) { return null }
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

const listing = async (path: string, knex: Knex, res: Response) => {
  const folder = await Functions.GetListing(knex, path)
  if (!folder) {
    res.status(StatusCodes.NOT_FOUND).json({
      error: {
        code: 'ENOTFOUND',
        message: 'Directory Not Found!',
        path
      }
    })
    return
  }
  res.json(folder)
}

// Export the base-router
export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
  const knex = await persistance.initialize()
  // Init router and path
  const router = Router()

  const logger = debug('type-imagereader:api')

  const handleErrors = (action: (req: Request, res: Response) => Promise<void>): RequestHandler => async (req: Request, res: Response) => {
    try {
      await action(req, res)
    } catch (e) {
      logger(`Error rendering: ${req.originalUrl}`, req.body)
      logger(e)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'EINTERNALERROR',
          message: 'Internal Server Error'
        }
      })
    }
  }

  const parsePath = (path: string, res: Response, decodeURI = true) => {
    if (decodeURI) {
      path = UriSafePath.decode(path)
    }
    if (normalize(path) !== path) {
      res.status(StatusCodes.FORBIDDEN).json({
        error: {
          code: 'ENOTRAVERSE',
          message: 'Directory Traversal is not Allowed!',
          path
        }
      })
      return null
    }
    return path
  }

  router.get('/', handleErrors(async (_, res) => {
    res.json({ title: 'API' })
  }))

  router.get('/healthcheck', handleErrors(async (_, res) => {
    res.status(StatusCodes.OK).send('OK')
  }))

  router.get('/listing/*', handleErrors(async (req, res) => {
    const rawPath = req.params[0] || ''
    const folder = parsePath(
      `/${rawPath}${rawPath.length && rawPath[rawPath.length - 1] !== '/' ? '/' : ''}`,
      res,
      false
    )
    if (folder !== null) {
      await listing(folder, knex, res)
    }
  }))
  router.get('/listing', handleErrors(async (_, res) => await listing('/', knex, res)))

  router.post('/navigate/latest', handleErrors(async (req, res) => {
    const incomingModCount = +req.body.modCount
    let response = -1
    const path = parsePath(req.body.path, res)
    if (incomingModCount === -1 && path !== null) {
      await Functions.SetLatestPicture(knex, path)
    } else if (ModCount.Validate(incomingModCount) && path !== null) {
      response = ModCount.Increment()
      await Functions.SetLatestPicture(knex, path)
    }
    res.status(StatusCodes.OK).send(`${response}`)
  }))

  router.post('/mark/read', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await Functions.MarkFolderRead(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  router.post('/mark/unread', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await Functions.MarkFolderUnread(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  router.get('/bookmarks/*', handleErrors(async (_, res) => {
    res.json(await Functions.GetBookmarks(knex))
  }))

  router.get('/bookmarks/', handleErrors(async (_, res) => {
    res.json(await Functions.GetBookmarks(knex))
  }))

  router.post('/bookmarks/add', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await Functions.AddBookmark(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  router.post('/bookmarks/remove', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await Functions.RemoveBookmark(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  return router
}
