'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'
import debug from 'debug'

import { reqParamToString } from '#utils/helpers.js'
import { isBlockedTraversal as _isBlockedTraversal, toFolderPath } from '#utils/path.js'
import { initialize as _initialize } from '#utils/persistence.js'
import { folderExists as _folderExists } from './apiFunctions.js'

export const Imports = {
  Router,
  isBlockedTraversal: _isBlockedTraversal,
  initialize: _initialize,
  folderExists: _folderExists,
  logger: debug('type-imagereader:root'),
}

export async function getRouter(_app: Application, _serve: Server, _socket: WebSocketServer): Promise<Router> {
  const knex = await Imports.initialize()
  const router = Imports.Router()

  const rootRoute = async (req: Request, res: Response): Promise<void> => {
    const folder = `/${reqParamToString(req.params.path)}`
    Imports.logger('GET %s', folder)
    if (Imports.isBlockedTraversal(Imports.logger, folder)) {
      res.status(StatusCodes.FORBIDDEN).render('error', {
        title: 'ERROR',
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
      })
      return
    }
    if (!(await Imports.folderExists(knex, toFolderPath(folder)))) {
      Imports.logger('folder not found: %s', folder)
      res.status(StatusCodes.NOT_FOUND).render('error', {
        title: 'Not Found',
        code: 'E_NOT_FOUND',
        message: `No such folder: ${folder}`,
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

  return router
}
