import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { NOT_FOUND, FORBIDDEN, INTERNAL_SERVER_ERROR } from 'http-status-codes'

import { normalize } from 'path'

import persistance from '../utils/persistance'
import { getListing, getBookmarks } from './api'

const debug = require('debug')

export function handleErrors (prefix: string, action: (req: Request, res: Response) => Promise<void>): RequestHandler {
  const logger = debug(prefix)
  return async (req: Request, res: Response) => {
    try {
      await action(req, res)
    } catch (e) {
      logger(`Error rendering: ${req.originalUrl}`, e, e.stack)
      res.status(INTERNAL_SERVER_ERROR).render('error', {
        title: 'ERROR',
        code: 'E_INTERNAL_ERROR',
        message: e.message || 'Internal Server Error',
        stack: e.stack
      })
    }
  }
}

// Export the base-router
export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
  // Init router and path
  const router = Router()

  const knex = await persistance.initialize()

  const rootRoute = async (req: Request, res: Response) => {
    const folder = '/' + (req.params[0] || '')
    if (normalize(folder) !== folder) {
      res.status(FORBIDDEN).render('error', {
        error: {
          title: 'ERROR',
          code: 'E_NO_TRAVERSE',
          message: 'Directory Traversal is not Allowed!'
        }
      })
    }
    const data = await getListing(folder, knex)
    if (!data) {
      res.status(NOT_FOUND).render('error', {
        title: 'ERROR',
        code: 'E_NOT_FOUND',
        message: 'Not Found'
      })
      return
    }
    const bookmarks = await getBookmarks(knex, folder)
    res.render('index', {
      data,
      bookmarks
    })
  }
  router.get('/', rootRoute)
  router.get('/show', rootRoute)
  router.get('/show/*', rootRoute)

  return router
}
