'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize } from 'path'

export class Imports {
  public static Router = Router
}

export async function getRouter (_app: Application, _serve: Server, _socket: WebSocketServer): Promise<Router> {
  const router = Imports.Router()

  const rootRoute = (req: Request, res: Response): void => {
    const folder = '/' + (req.params[0] ?? '')
    if (normalize(folder) !== folder) {
      res.status(StatusCodes.FORBIDDEN).render('error', {
        error: {
          title: 'ERROR',
          code: 'E_NO_TRAVERSE',
          message: 'Directory Traversal is not Allowed!'
        }
      })
      return
    }
    res.render('app')
  }
  router.get('/', (_: Request, res: Response) => {
    res.redirect(StatusCodes.MOVED_TEMPORARILY, '/show')
  })
  router.get('/show', rootRoute)
  router.get('/show/*', rootRoute)

  return router
}
