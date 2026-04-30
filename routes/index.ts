'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'
import debug from 'debug'

import { ReqParamToString } from '#utils/helpers'
import { isPathTraversal as _isPathTraversal } from '#utils/Path'

export const Imports = { Router, isPathTraversal: _isPathTraversal, logger: debug('type-imagereader:root') }

export async function getRouter(_app: Application, _serve: Server, _socket: WebSocketServer): Promise<Router> {
  const router = Imports.Router()

  const rootRoute = (req: Request, res: Response): void => {
    const folder = `/${ReqParamToString(req.params.path)}`
    Imports.logger('GET %s', folder)
    if (Imports.isPathTraversal(folder)) {
      Imports.logger('path traversal blocked: %s', folder)
      res.status(StatusCodes.FORBIDDEN).render('error', {
        error: {
          title: 'ERROR',
          code: 'E_NO_TRAVERSE',
          message: 'Directory Traversal is not Allowed!',
        },
      })
      return
    }
    res.render('app')
  }
  router.get('/', (_: Request, res: Response) => {
    res.redirect(StatusCodes.MOVED_TEMPORARILY, '/show')
  })
  router.get('/show', rootRoute)
  router.get('/show/*path', rootRoute)

  await Promise.resolve() // async required by getRouter signature
  return router
}
