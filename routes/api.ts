'use sanity'

import { type Application, Router, type Request, type Response, type RequestHandler } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'

import { normalize } from 'node:path'

import persistance from '#utils/persistance'

import { ModCount, UriSafePath, Functions, INVALID_MOD_COUNT } from './apiFunctions'

import debug from 'debug'
import { ReqParamToString } from '#utils/helpers'
import { handleErrors as _handleErrors } from '#utils/Express'
import { isPathTraversal as _isPathTraversal } from '#utils/Path'

export const Imports = { Router, debug, handleErrors: _handleErrors, isPathTraversal: _isPathTraversal }

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
  if ('modCount' in obj.body && typeof obj.body.modCount !== 'number') return false
  if (!('path' in obj.body) || typeof obj.body.path !== 'string') return false
  return true
}

export function ReadBody(req: unknown): BodyData {
  if (!isReqWithBodyData(req)) throw new Error('Invalid JSON Object provided as input')
  return req.body
}

// Export the base-router
export async function getRouter(_app: Application, _server: Server, _socket: WebSocketServer): Promise<Router> {
  const knex = await persistance.initialize()
  // Init router and path
  const router = Imports.Router()

  const logger = Imports.debug('type-imagereader:api')
  const handleErrors = (action: (req: Request, res: Response) => Promise<void>): RequestHandler =>
    Imports.handleErrors(logger, action)

  const parsePath = (path: string, res: Response): string | null => {
    if (Imports.isPathTraversal(path)) {
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
      await Promise.resolve()
    }),
  )

  router.get(
    '/healthcheck',
    handleErrors(async (_, res) => {
      res.status(StatusCodes.OK).send('OK')
      await Promise.resolve()
    }),
  )

  const listing = handleErrors(async (req, res) => {
    let path: string | null = `/${ReqParamToString(req.params.path)}`
    path = parsePath(path, res)
    if (path === null) {
      return
    }
    const folder = await Functions.GetListing(knex, normalize(`${path}/`))
    if (folder === null) {
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
      const body = ReadBody(req)
      const incomingModCount = body.modCount ?? Number.NaN
      let response = -1
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path === null) {
        return
      }
      if (incomingModCount === INVALID_MOD_COUNT) {
        await Functions.SetLatestPicture(knex, path)
      } else if (ModCount.Validate(incomingModCount)) {
        response = ModCount.Increment()
        await Functions.SetLatestPicture(knex, path)
      } else {
        res.status(StatusCodes.BAD_REQUEST).send('-1')
        return
      }
      res.status(StatusCodes.OK).send(`${response}`)
    }),
  )

  router.post(
    '/mark/read',
    handleErrors(async (req, res) => {
      const body = ReadBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        await Functions.MarkFolderSeen(knex, normalize(`${path}/`), true)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  router.post(
    '/mark/unread',
    handleErrors(async (req, res) => {
      const body = ReadBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        await Functions.MarkFolderSeen(knex, normalize(`${path}/`), false)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  const getBookmarks = handleErrors(async (_, res) => {
    res.json(await Functions.GetBookmarks(knex))
  })

  router.get('/bookmarks/*path', getBookmarks)

  router.get('/bookmarks', getBookmarks)

  router.post(
    '/bookmarks/add',
    handleErrors(async (req, res) => {
      const body = ReadBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        await Functions.AddBookmark(knex, path)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  router.post(
    '/bookmarks/remove',
    handleErrors(async (req, res) => {
      const body = ReadBody(req)
      const path = parsePath(UriSafePath.decode(body.path), res)
      if (path !== null) {
        await Functions.RemoveBookmark(knex, path)
        res.status(StatusCodes.OK).end()
      }
    }),
  )

  return router
}
