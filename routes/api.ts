'use sanity'

import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize, basename, dirname, sep } from 'path'

import persistance from '../utils/persistance'
import { Knex } from 'knex'

import debug from 'debug'

let modCount: number = Date.now()

const validateModcount = (incomingModCount: number): boolean => modCount === incomingModCount

const incrementModCount = (): number => {
  if (modCount >= Number.MAX_SAFE_INTEGER - 1) {
    modCount = 0
  }
  modCount++
  return modCount
}

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
  return (await knex('pictures')
    .select(
      'path',
      'seen'
    )
    .where({
      folder: path
    })
    .orderBy('sortKey', 'path')
  ).map((pic, index) => {
    pic.name = basename(pic.path)
    pic.path = toURI(pic.path)
    pic.index = index
    return pic
  })
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
  const bookmarks = await getBookmarks(knex)
  return {
    name: folder.name,
    path: folder.path,
    parent: folder.folder,
    cover: folder.cover,
    folder,
    next,
    prev,
    children,
    pictures,
    bookmarks,
    modCount
  }
}

const listing = async (path: string, knex: Knex, res: Response) => {
  const folder = await getListing(path, knex)
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

const parents = (path: string): string[] => {
  const folders = []
  let parent = path
  while (parent && parent !== '/') {
    parent = dirname(parent)
    folders.push(`${parent}${parent !== '/' ? '/' : ''}`)
  }
  return folders
}

export async function setLatest (knex: Knex, path: string | undefined) {
  if (!path) {
    return '/'
  }
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
  const rawAdjustments = await knex('pictures')
    .count('path as adjustments')
    .where('seen', '<>', seenValue)
    .andWhere('folder', 'like', `${path}%`)
  if (rawAdjustments && rawAdjustments[0] && rawAdjustments[0].adjustments) {
    const adjustment = +(rawAdjustments[0].adjustments)
    await knex('pictures')
      .update({ seen: seenValue })
      .where('folder', 'like', `${path}%`)
    await knex('folders')
      .increment('seenCount', seenValue ? adjustment : -adjustment)
      .whereIn('path', parents(path))
  }
  if (!seenValue) {
    await knex('folders')
      .update({ current: null, seenCount: 0 })
      .where('path', 'like', `${path}%`)
      .orWhere({ path })
  } else {
    await knex('folders')
      .update({ seenCount: knex.raw('"totalCount"') })
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

export async function getBookmarks (knex: Knex) {
  const results = await knex('bookmarks')
    .select(
      'pictures.path',
      'pictures.folder'
    )
    .join('pictures', 'pictures.path', 'bookmarks.path')
    .join('folders', 'folders.path', 'pictures.folder')
    .orderBy(['folders.sortKey', 'pictures.sortKey'])
  return results
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
      path = fromURI(path)
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
      await setLatest(knex, path)
    } else if (validateModcount(incomingModCount) && path !== null) {
      incrementModCount()
      response = modCount
      await setLatest(knex, path)
    }
    res.status(StatusCodes.OK).send(`${response}`)
  }))

  router.post('/mark/read', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await markRead(knex, path, true)
      res.status(StatusCodes.OK).end()
    }
  }))

  router.post('/mark/unread', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await markRead(knex, path, false)
      res.status(StatusCodes.OK).end()
    }
  }))

  router.get('/bookmarks/*', handleErrors(async (_, res) => {
    res.json(await getBookmarks(knex))
  }))

  router.get('/bookmarks/', handleErrors(async (_, res) => {
    res.json(await getBookmarks(knex))
  }))

  router.post('/bookmarks/add', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await addBookmark(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  router.post('/bookmarks/remove', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await removeBookmark(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  return router
}
