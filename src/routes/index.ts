import { Router, Request, Response, RequestHandler } from 'express'

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
      res.status(500).render('error', {
        title: 'ERROR',
        code: 'EINTERNALERROR',
        message: e.message || 'Internal Server Error',
        stack: e.stack
      })
    }
  }
}

// Export the base-router
export async function getRouter () {
  // Init router and path
  const router = Router()

  const knex = await persistance.initialize()

  const rootRoute = async (req: Request, res: Response) => {
    const folder = '/' + (req.params[0] || '')
    if (normalize(folder) !== folder) {
      res.status(400).json({
        error: {
          code: 'ENOTRAVERSE',
          message: 'Directory Traversal is not Allowed!',
          path: folder
        }
      })
    }
    const data = await getListing(folder, knex)
    if (!data) {
      res.status(500).render('error', {
        title: 'ERROR',
        code: 'ENOTFOUND',
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
