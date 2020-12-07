'use sanity'

import { Router, Request, Response, RequestHandler } from 'express'

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

interface ChildFolder {
  name: string,
  path: string|null,
  cover: string|null,
  totalCount: number,
  totalSeen: number
}

const getChildren = async (path:string, knex:Knex) => {
  const folderInfoSubQuery = knex('pictures')
    .select('folder')
    .count('* as totalCount')
    .sum({ totalSeen: knex.raw('CASE WHEN seen THEN 1 ELSE 0 END') })
    .min('sortKey as firstImage')
    .groupBy('folder')
    .where('folder', 'like', `${path}%`)
    .as('folderInfos')
  const folderInfos = await knex('pictures')
    .select(
      'pictures.folder as folder',
      'pictures.path as firstImage',
      'folderInfos.totalCount as totalCount',
      'folderInfos.totalSeen as totalSeen',
      'folders.current',
      'folders.sortKey')
    .join(folderInfoSubQuery, function () {
      this.on('folderInfos.firstImage', '=', 'pictures.sortKey')
        .andOn('folderInfos.folder', '=', 'pictures.folder')
    })
    .leftJoin('folders', 'pictures.folder', '=', 'folders.path')
    .orderBy('folders.sortKey')
  const lookup: { [name: string]: ChildFolder } = {}
  folderInfos.forEach(info => {
    const name: string = info.folder.substring(path.length).split('/')[0]
    const child = lookup[name] || {
      name,
      path: null,
      cover: null,
      totalCount: 0,
      totalSeen: 0
    }
    child.totalCount += +info.totalCount
    child.totalSeen += +info.totalSeen
    if (`${path}${name}/` === info.folder) {
      child.cover = info.current || info.firstImage
    }
    lookup[name] = child
  })

  const children = await knex('folders')
    .select(
      'path',
      'current'
    )
    .where({
      folder: path
    })
    .orderBy('sortKey')
  return children.map(child => {
    const name = child.path.substring(path.length).split('/')[0]
    const item = lookup[name] || {
      name,
      path: null,
      cover: null,
      totalCount: 0,
      totalSeen: 0
    }
    item.path = toURI(child.path)
    item.cover = toURI(child.current ? child.current : item.cover)
    return item
  })
}

const getPictures = async (path: string, knex:Knex) => {
  const pictures = await knex('pictures')
    .select(
      'path',
      'seen'
    )
    .where({
      folder: path
    })
  return pictures.map(pic => {
    pic.name = basename(pic.path)
    pic.path = toURI(pic.path)
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
    res.status(404).json({
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

const setLatest = async (knex: Knex, path: string) => {
  const folder = dirname(path) + sep
  await knex('folders').update({ current: path }).where({ path: folder })
  await knex('pictures').update({ seen: true }).where({ path })
}

const markRead = async (knex: Knex, path: string, seenValue = true) => {
  await knex('pictures').update({ seen: seenValue }).where('folder', 'like', `${path}%`)
  if (!seenValue) {
    await knex('folders').update({ current: null }).where('path', 'like', `${path}%`)
    await knex('folders').update({ current: null }).where({ path })
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
export async function getRouter () {
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
      res.status(500).json({
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
      res.status(400).json({
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
      res.status(200).end()
    }
  }))

  router.post('/mark/read', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await markRead(knex, path, true)
      res.status(200).end()
    }
  }))

  router.post('/mark/unread', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await markRead(knex, path, false)
      res.status(200).end()
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
      res.status(200).end()
    }
  }))

  router.post('/bookmarks/remove', handleErrors(async (req, res) => {
    const path = parsePath(req.body.path, res)
    if (path !== null) {
      await removeBookmark(knex, path)
      res.status(200).end()
    }
  }))

  return router
}
