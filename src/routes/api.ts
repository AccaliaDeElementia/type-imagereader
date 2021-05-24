'use sanity'

import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { NOT_FOUND, FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes'

import { normalize, basename, dirname, sep } from 'path'

import persistance from '../utils/persistance'
import Knex = require('knex')

const debug = require('debug')

const fromURI = (str: string) => {
  return `${str}`.split('/').map(part => decodeURIComponent(part)).join('/')
}

const toURI = (str: string|null) => {
  if (!str) {
    return null
  }
  return `${str}`.split('/').map(part => encodeURIComponent(part)).join('/')
}

const getChildren = async (path:string, knex:Knex) => {
  const data = await knex.with('firsts',
    (qb) => qb
      .select('pictures.folder')
      .min({
        sortKey: 'pictures.sortKey'
      })
      .from('pictures')
      .join('folders', 'pictures.folder', '=', 'folders.path')
      .where({
        'folders.folder': path
      })
      .groupBy('pictures.folder')
  )
    .with('firstImages',
      qb => qb
        .select('firsts.folder')
        .min('pictures.path as path')
        .from('firsts')
        .leftJoin('pictures',
          (jc) => jc.on('pictures.folder', 'firsts.folder')
            .andOn('pictures.sortKey', 'firsts.sortKey'))
        .groupBy('firsts.folder')
    )
    .select(
      'folders.path',
      'folders.current',
      'folders.totalCount',
      'folders.seenCount',
      'firstImages.path as first'
    )
    .from('folders')
    .leftJoin('firstImages', 'firstImages.folder', '=', 'folders.path')
    .where({
      'folders.folder': path
    })
    .orderBy('folders.sortKey')
  return data.map(i => {
    return {
      name: basename(i.path.substring(path.length)),
      path: toURI(i.path),
      cover: toURI(i.current || i.first),
      totalCount: i.totalCount,
      totalSeen: i.seenCount
    }
  })
}

const getPictures = async (path: string, knex:Knex) => {
  const pictures = (await knex('pictures')
    .select(
      'path',
      'seen'
    )
    .where({
      folder: path
    })
    .orderBy('sortKey')
  ).map((pic, index) => {
    pic.name = basename(pic.path)
    pic.path = toURI(pic.path)
    pic.index = index
    return pic
  })
  const pageSize = 32
  const pages = []
  const totalPages = pictures.length > 0 ? 1 + Math.floor(pictures.length / pageSize) : 0
  for (let i = 0; i < totalPages; i++) {
    pages.push(pictures.slice(i * pageSize, (i + 1) * pageSize))
  }
  return {
    count: pictures.length,
    pageSize,
    totalPages,
    pages
  }
}

const getFolder = async (path: string, sortKey: string|null, knex: Knex, direction = 'this') => {
  let query = knex('folders')
    .leftJoin('pictures', 'pictures.folder', '=', 'folders.path')
    .select(
      'folders.folder',
      'folders.path',
      'folders.current',
      'pictures.path as first',
      'folders.sortKey')
    .limit(1)
  switch (direction) {
    case 'this':
      query = query.where({
        'folders.path': path
      })
        .orderBy('pictures.sortKey')
      break
    case 'next':
      query = query.where('folders.sortKey', '>', sortKey)
        .andWhere({
          'folders.folder': path
        })
        .orderBy('folders.sortKey', 'pictures.sortKey')
      break
    case 'prev':
      query = query.where('folders.sortKey', '<', sortKey)
        .andWhere({
          'folders.folder': path
        })
        .orderBy([
          {
            column: 'folders.sortKey',
            order: 'desc'
          }, {
            column: 'pictures.sortKey'
          }
        ])
      break
    default:
      throw new Error(`Invalid direction: ${direction}`)
  }
  const result = (await query)[0]
  if (!result) {
    return null
  }
  return {
    name: basename(result.path),
    path: toURI(result.path),
    folder: result.folder,
    sortKey: result.sortKey,
    cover: toURI(result.current || result.first)
  }
}

export async function getListing (path: string, knex: Knex) {
  const folder = await getFolder(path, null, knex)
  if (!folder) {
    return null
  }
  const next = await getFolder(folder.folder, folder.sortKey, knex, 'next')
  if (next) {
    delete next.folder
    delete next.sortKey
  }
  const prev = await getFolder(folder.folder, folder.sortKey, knex, 'prev')
  if (prev) {
    delete prev.folder
    delete prev.sortKey
  }
  const children = await getChildren(path, knex)
  const pictures = await getPictures(path, knex)
  return {
    name: folder.name,
    path: folder.path,
    parent: folder.folder,
    cover: folder.cover,
    folder,
    next,
    prev,
    children,
    pictures
  }
}

const listing = async (path: string, knex: Knex, res: Response) => {
  const folder = await getListing(path, knex)
  if (!folder) {
    res.status(NOT_FOUND).json({
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

const parents = (path: string): string[] => {
  const folders = []
  let parent = path
  while (parent && parent !== '/') {
    parent = dirname(parent)
    folders.push(`${parent}${parent !== '/' ? '/' : ''}`)
  }
  return folders
}

export async function setLatest (knex: Knex, path: string) {
  const folder = dirname(path) + sep
  const picture = await knex('pictures').select('seen').where({ path })
  if (!picture || !picture.length) {
    return
  } else if (!picture[0].seen) {
    await knex('folders')
      .increment('seenCount', 1)
      .whereIn('path', parents(path))
  }
  await knex('folders').update({ current: path }).where({ path: folder })
  await knex('pictures').update({ seen: true }).where({ path })
  return toURI(folder)
}

const markRead = async (knex: Knex, path: string, seenValue = true) => {
  const adjustment = +(await knex('pictures')
    .count('path as adjustments')
    .where('seen', '<>', seenValue)
    .andWhere('folder', 'like', `${path}%`))[0].adjustments
  await knex('pictures')
    .update({ seen: seenValue })
    .where('folder', 'like', `${path}%`)
  await knex('folders')
    .increment('seenCount', seenValue ? adjustment : -adjustment)
    .whereIn('path', parents(path))
  if (!seenValue) {
    await knex('folders')
      .update({ current: null, seenCount: 0 })
      .where('path', 'like', `${path}%`)
      .orWhere({ path })
  } else {
    await knex('folders')
      .update({ current: null, seenCount: knex.raw('"totalCount"') })
      .where('path', 'like', `${path}%`)
      .orWhere({ path })
  }
}

const addBookmark = async (knex: Knex, path: string) => {
  const current = await knex('bookmarks')
    .select('id')
    .where({ path })
  if (!current.length) {
    await knex('bookmarks')
      .insert({ path })
  }
}

const removeBookmark = async (knex: Knex, path: string) => {
  const current = await knex('bookmarks')
    .select('id')
    .where({ path })
  if (current.length) {
    await knex('bookmarks')
      .where({ path })
      .delete()
  }
}

export async function getBookmarks (knex: Knex, path: string) {
  const marks = await knex('bookmarks')
    .select(
      'pictures.path',
      'pictures.folder'
    )
    .join('pictures', 'pictures.path', 'bookmarks.path')
    .join('folders', 'folders.path', 'pictures.folder')
    .orderBy(['folders.sortKey', 'pictures.sortKey'])

  const current = []
  const children = []
  const others = []
  for (const mark of marks) {
    mark.name = basename(mark.path)
    if (mark.folder === path) {
      current.push(mark)
    } else if (mark.folder.indexOf(path) === 0) {
      const folder = mark.folder.slice(path.length)
      if (!children.length || children[children.length - 1].folder !== folder) {
        children.push({
          folder,
          marks: [mark]
        })
      } else {
        children[children.length - 1].marks.push(mark)
      }
    } else {
      const folder = mark.folder
      if (!others.length || others[others.length - 1].folder !== folder) {
        others.push({
          folder,
          marks: [mark]
        })
      } else {
        others[others.length - 1].marks.push(mark)
      }
    }
  }
  return {
    current,
    children,
    others
  }
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
      res.status(INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'EINTERNALERROR',
          message: 'Internal Server Error'
        }
      })
    }
  }

  const parsePath = (path: string, res: Response, decodeURI = true) => {
    if (decodeURI) {
      path = fromURI(path)
    }
    if (normalize(path) !== path) {
      res.status(FORBIDDEN).json({
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
    res.status(OK).send('OK')
  }))

  router.get('/listing/*', handleErrors(async (req, res) => {
    const folder = parsePath(
      `/${req.params[0] || ''}${req.params[0].length && req.params[0][req.params[0].length - 1] !== '/' ? '/' : ''}`,
      res,
      false
    )
    if (folder !== null) {
      await listing(folder, knex, res)
    }
  }))
  router.get('/listing', handleErrors(async (_, res) => await listing('/', knex, res)))

  router.post('/navigate/latest', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await setLatest(knex, path)
      res.status(OK).end()
    }
  }))

  router.post('/mark/read', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await markRead(knex, path, true)
      res.status(OK).end()
    }
  }))

  router.post('/mark/unread', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await markRead(knex, path, false)
      res.status(OK).end()
    }
  }))

  router.get('/bookmarks/*', handleErrors(async (req, res) => {
    const folder = parsePath(
      `/${req.params[0] || ''}${req.params[0].length && req.params[0][req.params[0].length - 1] !== '/' ? '/' : ''}`,
      res,
      false
    )
    if (folder !== null) {
      res.json(await getBookmarks(knex, folder))
    }
  }))

  router.get('/bookmarks/', handleErrors(async (__, res) => {
    res.json(await getBookmarks(knex, '/'))
  }))

  router.post('/bookmarks/add', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await addBookmark(knex, path)
      res.status(OK).end()
    }
  }))

  router.post('/bookmarks/remove', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await removeBookmark(knex, path)
      res.status(OK).end()
    }
  }))

  return router
}
