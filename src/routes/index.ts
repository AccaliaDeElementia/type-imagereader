import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize } from 'path'

const debug = require('debug')

export function handleErrors (prefix: string, action: (req: Request, res: Response) => Promise<void>): RequestHandler {
  const logger = debug(prefix)
  return async (req: Request, res: Response) => {
    try {
      await action(req, res)
    } catch (e) {
      let stack = ''
      let message = 'Internal Server Error'
      if (e instanceof Error) {
        stack = e.stack || stack
        message = e.message || message
      }
      logger(`Error rendering: ${req.originalUrl}`, e, stack)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', {
        title: 'ERROR',
        code: 'E_INTERNAL_ERROR',
        message: message || 'Internal Server Error',
        stack
      })
    }
  }
}

// Export the base-router
export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
  // Init router and path
  const router = Router()

  const rootRoute = async (req: Request, res: Response) => {
    const folder = '/' + (req.params[0] || '')
    if (normalize(folder) !== folder) {
      res.status(StatusCodes.FORBIDDEN).render('error', {
        error: {
          title: 'ERROR',
          code: 'E_NO_TRAVERSE',
          message: 'Directory Traversal is not Allowed!'
        }
      })
    }
    res.render('browser')
  }
  router.get('/', (_: Request, res: Response) => {
    res.redirect(StatusCodes.MOVED_TEMPORARILY, '/show')
  })
  router.get('/show', rootRoute)
  router.get('/show/*', rootRoute)

  return router
}
