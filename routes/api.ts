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
import { handleErrors as _handleErrors, sendError as _sendError } from '#utils/express.js'
import { isBlockedTraversal as _isBlockedTraversal } from '#utils/path.js'
import { isDictionary, hasOptionalKey, hasRequiredKey } from '#utils/typeGuards.js'

export const Imports = {
  Router,
  debug,
  handleErrors: _handleErrors,
  sendError: _sendError,
  isBlockedTraversal: _isBlockedTraversal,
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
  if (!isDictionary(obj) || !isDictionary(obj.body)) return false
  if (!hasOptionalKey(obj.body, 'modCount', (v) => typeof v === 'number')) return false
  if (!hasRequiredKey(obj.body, 'path', (v) => typeof v === 'string')) return false
  return true
}

export function readBody(req: unknown): BodyData {
  if (!isReqWithBodyData(req)) throw new Error('Invalid JSON Object provided as input')
  return req.body
}

export async function getRouter(_app: Application, _server: Server, _socket: WebSocketServer): Promise<Router> {
  const knex = await Imports.initialize()
  const router = Imports.Router()

  const logger = Imports.debug('type-imagereader:api')
  const diagnosticLogger = Imports.debug('type-imagereader:diagnostic')
  const handleErrors = (action: (req: Request, res: Response) => Promise<void> | void): RequestHandler =>
    Imports.handleErrors(logger, action)

  const parsePath = (path: string, res: Response): string | null => {
    if (Imports.isBlockedTraversal(logger, path)) {
      Imports.sendError(res, {
        code: 'E_NO_TRAVERSE',
        statusCode: StatusCodes.FORBIDDEN,
        message: 'Directory Traversal is not Allowed!',
        path,
      })
      return null
    }
    return normalize(`/${path}`)
  }

  router.get(
    '/',
    handleErrors((_, res) => {
      res.status(StatusCodes.OK).json({ title: 'API' })
    }),
  )

  router.get(
    '/healthcheck',
    handleErrors((_, res) => {
      res.status(StatusCodes.OK).send('OK')
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
      Imports.sendError(res, {
        code: 'E_NOT_FOUND',
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Directory Not Found!',
        path,
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
        const claim = ModCount.claimAndIncrement(incomingModCount)
        if (!claim.claimed) {
          logger('modcount mismatch: client=%d server=%d for %s', incomingModCount, ModCount.get(), path)
          res.status(StatusCodes.BAD_REQUEST).send(`${INVALID_MOD_COUNT}`)
          return
        }
        response = claim.count
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

  router.post(
    '/diagnostic',
    handleErrors(async (req, res) => {
      diagnosticLogger('%o', (req as { body: unknown }).body)
      res.status(StatusCodes.NO_CONTENT).end()
      await Promise.resolve()
    }),
  )

  return router
}
