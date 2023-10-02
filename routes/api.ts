'use sanity'

import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize } from 'path'

import persistance from '../utils/persistance'
import { Knex } from 'knex'

import { ModCount, UriSafePath, Functions } from './apiFunctions'

import debug from 'debug'

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
