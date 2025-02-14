'use sanity'

import { type Application, Router, type Request, type Response, type RequestHandler } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize } from 'path'

import persistance from '../utils/persistance'

import { ModCount, UriSafePath, Functions } from './apiFunctions'

import debug from 'debug'

export class Imports {
  public static Router = Router
  public static debug = debug
}

interface ReqWithBodyData {
  body: BodyData
}

interface BodyData {
  modCount?: number,
  path: string
}

export function isReqWithBodyData(obj: unknown): obj is ReqWithBodyData {
  if (obj == null || typeof obj !== 'object') return false
  if (!('body' in obj) || obj.body == null || typeof obj.body !== 'object') return false
  if ('modCount' in obj.body && typeof obj.body.modCount !== 'number') return false
  if (!('path' in obj.body) || typeof obj.body.path !== 'string') return false
  return true
}

export function ReadBody (req: unknown): BodyData {
  if (!isReqWithBodyData(req)) throw new Error('Invalid JSON Object provided as input')
  return req.body
}

// Export the base-router
export async function getRouter (_app: Application, _server: Server, _socket: WebSocketServer): Promise<Router> {
  const knex = await persistance.initialize()
  // Init router and path
  const router = Imports.Router()

  const logger = Imports.debug('type-imagereader:api')

  const handleErrors = (action: (req: Request, res: Response) => Promise<void>): RequestHandler => async (req: Request, res: Response) => {
    try {
      await action(req, res)
    } catch (e) {
      logger(`Error rendering: ${req.originalUrl}`, req.body)
      logger(e)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error'
        }
      })
    }
  }

  const parsePath = (path: string, res: Response): string | null => {
    if (normalize(path) !== path) {
      res.status(StatusCodes.FORBIDDEN).json({
        error: {
          code: 'E_NO_TRAVERSE',
          message: 'Directory Traversal is not Allowed!',
          path
        }
      })
      return null
    }
    return normalize('/' + path)
  }

  router.get('/', handleErrors(async (_, res) => {
    res.status(StatusCodes.OK).json({ title: 'API' })
    await Promise.resolve()
  }))

  router.get('/healthcheck', handleErrors(async (_, res) => {
    res.status(StatusCodes.OK).send('OK')
    await Promise.resolve()
  }))

  const listing = handleErrors(async (req, res) => {
    let path: string | null = req.params[0] != null && req.params[0].length > 0 ? req.params[0] : '/'
    path = parsePath(path, res)
    if (path === null) { return }
    const folder = await Functions.GetListing(knex, normalize(path + '/'))
    if (folder == null) {
      res.status(StatusCodes.NOT_FOUND).json({
        error: {
          code: 'E_NOT_FOUND',
          message: 'Directory Not Found!',
          path
        }
      })
      return
    }
    res.status(StatusCodes.OK).json(folder)
  })

  router.get('/listing/*', listing)
  router.get('/listing', listing)

  

  router.post('/navigate/latest', handleErrors(async (req, res) => {
    const body = ReadBody(req)
    const incomingModCount = body.modCount ?? Number.NaN
    let response = -1
    const path = parsePath(UriSafePath.decode(body.path), res)
    if (path == null) {
      return
    }
    if (incomingModCount === -1) {
      await Functions.SetLatestPicture(knex, path)
    } else if (ModCount.Validate(incomingModCount)) {
      response = ModCount.Increment()
      await Functions.SetLatestPicture(knex, path)
    } else {
      res.status(StatusCodes.BAD_REQUEST).send('-1')
      return
    }
    res.status(StatusCodes.OK).send(`${response}`)
  }))

  router.post('/mark/read', handleErrors(async (req, res) => {
    const body = ReadBody(req)
    const path = parsePath(UriSafePath.decode(body.path), res)
    if (path !== null) {
      await Functions.MarkFolderRead(knex, normalize(path + '/'))
      res.status(StatusCodes.OK).end()
    }
  }))

  router.post('/mark/unread', handleErrors(async (req, res) => {
    const body = ReadBody(req)
    const path = parsePath(UriSafePath.decode(body.path), res)
    if (path !== null) {
      await Functions.MarkFolderUnread(knex, normalize(path + '/'))
      res.status(StatusCodes.OK).end()
    }
  }))

  const getBookmarks = handleErrors(async (_, res) => {
    res.json(await Functions.GetBookmarks(knex))
  })

  router.get('/bookmarks/*', getBookmarks)

  router.get('/bookmarks', getBookmarks)

  router.post('/bookmarks/add', handleErrors(async (req, res) => {
    const body = ReadBody(req)
    const path = parsePath(UriSafePath.decode(body.path), res)
    if (path !== null) {
      await Functions.AddBookmark(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  router.post('/bookmarks/remove', handleErrors(async (req, res) => {
    const body = ReadBody(req)
    const path = parsePath(UriSafePath.decode(body.path), res)
    if (path !== null) {
      await Functions.RemoveBookmark(knex, path)
      res.status(StatusCodes.OK).end()
    }
  }))

  return router
}
