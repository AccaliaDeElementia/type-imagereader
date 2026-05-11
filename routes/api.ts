'use sanity'

import { type Application, Router, type Request, type Response, type RequestHandler } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'

import { normalize } from 'node:path'

import { initialize as _initialize } from '#utils/persistence.js'

import {
  addBookmark as _addBookmark,
  getBookmarks as _getBookmarks,
  getListing as _getListing,
  INVALID_MOD_COUNT,
  markFolderSeen as _markFolderSeen,
  ModCount,
  removeBookmark as _removeBookmark,
  setLatestPicture as _setLatestPicture,
  UriSafePath,
} from './apiFunctions.js'

import debug from 'debug'
import { reqParamToString } from '#utils/helpers.js'
import { handleErrors as _handleErrors } from '#utils/express.js'
import { isPathTraversal as _isPathTraversal } from '#utils/path.js'

export const Imports = {
  Router,
  debug,
  handleErrors: _handleErrors,
  isPathTraversal: _isPathTraversal,
  initialize: _initialize,
  getListing: _getListing,
  setLatestPicture: _setLatestPicture,
  markFolderSeen: _markFolderSeen,
  getBookmarks: _getBookmarks,
  addBookmark: _addBookmark,
  removeBookmark: _removeBookmark,
}

interface ReqWithBodyData {
  body: BodyData
}

interface BodyData {
  modCount?: number
  path: string
}

export function isReqWithBodyData(obj: unknown): obj is ReqWithBodyData {
  if (obj === null || typeof obj !== 'object') return false
  if (!('body' in obj) || obj.body === null || typeof obj.body !== 'object') return false
  if ('modCount' in obj.body && typeof obj.body.modCount !== 'number') return false // optional
  if (!('path' in obj.body) || typeof obj.body.path !== 'string') return false // required
  return true
}

export function readBody(req: unknown): BodyData {
  if (!isReqWithBodyData(req)) throw new Error('Invalid JSON Object provided as input')
  return req.body
}

// Export the base-router
export async function getRouter(_app: Application, _server: Server, _socket: WebSocketServer): Promise<Router> {
  const knex = await Imports.initialize()
  // init router and path
  const router = Imports.Router()

  const logger = Imports.debug('type-imagereader:api')
  const handleErrors = (action: (req: Request, res: Response) => Promise<void>): RequestHandler =>
    Imports.handleErrors(logger, action)

  const parsePath = (path: string, res: Response): string | null => {
    if (Imports.isPathTraversal(path)) {
      logger('path traversal blocked: %s', path)
      res.status(StatusCodes.FORBIDDEN).json({
        error: {
          code: 'E_NO_TRAVERSE',
          message: 'Directory Traversal is not Allowed!',
          path,
        },
      })
      return null
    }
    return normalize(`/${path}`)
  }

  router.get(
    '/',
    handleErrors(async (_, res) => {
      res.status(StatusCodes.OK).json({ title: 'API' })
      await Promise.resolve() // async required by handleErrors contract
    }),
  )

  router.get(
    '/healthcheck',
    handleErrors(async (_, res) => {
      res.status(StatusCodes.OK).send('OK')
      await Promise.resolve() // async required by handleErrors contract
    }),
  )

  const listing = handleErrors(async (req, res) => {
    let path: string | null = `/${reqParamToString(req.params.path)}`
    logger('GET /listing %s', path)
    path = parsePath(path, res)
    if (path === null) {
      return
    }
    const folder = await Imports.getListing(knex, normalize(`${path}/`))
    if (folder === null) {
      logger('listing not found: %s', path)
      res.status(StatusCodes.NOT_FOUND).json({
        error: {
          code: 'E_NOT_FOUND',
          message: 'Directory Not Found!',
          path,
        },
      })
      return
    }
    res.status(StatusCodes.OK).json(folder)
  })

  router.get('/listing/*path', listing)
  router.get('/listing', listing)

  router.post(
    '/navigate/latest',
    handleErrors(async (req, res) => {
      const body = readBody(req)
      const incomingModCount = body.modCount ?? Number.NaN
      let response = INVALID_MOD_COUNT
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path === null) {
        return
      }
      logger('POST /navigate/latest %s', path)
      if (incomingModCount === INVALID_MOD_COUNT) {
        await Imports.setLatestPicture(knex, path)
      } else {
        const newCount = ModCount.validateAndIncrement(incomingModCount)
        if (newCount === null) {
          logger('modcount mismatch: client=%d server=%d for %s', incomingModCount, ModCount.get(), path)
          res.status(StatusCodes.BAD_REQUEST).send(`${INVALID_MOD_COUNT}`)
          return
        }
        response = newCount
        await Imports.setLatestPicture(knex, path)
      }
      res.status(StatusCodes.OK).send(`${response}`)
    }),
  )

  router.post(
    '/mark/read',
    handleErrors(async (req, res) => {
      const body = readBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        logger('POST /mark/read %s', path)
        await Imports.markFolderSeen(knex, normalize(`${path}/`), true)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  router.post(
    '/mark/unread',
    handleErrors(async (req, res) => {
      const body = readBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        logger('POST /mark/unread %s', path)
        await Imports.markFolderSeen(knex, normalize(`${path}/`), false)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  const getBookmarks = handleErrors(async (_, res) => {
    logger('GET /bookmarks')
    res.json(await Imports.getBookmarks(knex))
  })

  router.get('/bookmarks/*path', getBookmarks)

  router.get('/bookmarks', getBookmarks)

  router.post(
    '/bookmarks/add',
    handleErrors(async (req, res) => {
      const body = readBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        logger('POST /bookmarks/add %s', path)
        await Imports.addBookmark(knex, path)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  router.post(
    '/bookmarks/remove',
    handleErrors(async (req, res) => {
      const body = readBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        logger('POST /bookmarks/remove %s', path)
        await Imports.removeBookmark(knex, path)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  return router
}
