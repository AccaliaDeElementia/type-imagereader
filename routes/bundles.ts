import { Application, Router, Request, Response } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import browserify from 'browserify'
import minifyStream from 'minify-stream'

import { readdir, watch } from 'fs/promises'
import { statSync } from 'fs'
import { Buffer } from 'buffer'

import debug from 'debug'
const logPrefix = 'type-imagereader:bundle'

class MyError extends Error {
  message: string
  statusCode: number
  code: string
  title: string
  constructor (message: string, statusCode: number, code: string, title: string) {
    super()
    this.message = message
    this.statusCode = statusCode
    this.code = code
    this.title = title
  }
}

export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
  const router = Router()

  const bundles: { [key: string]: Promise<Buffer> } = {}

  const makeBundle = (path: string) => {
    const logger = debug(`${logPrefix}:makeBundle`)
    const handleError = (err: Error | any) => {
      if (err === null) {
        return
      }
      if (err instanceof Error) {
        logger(`${path} Failed bundling!`, err.message)
      } else {
        logger(`${path} Failed bundling!`, err)
      }
      if (err.code === 'MODULE_NOT_FOUND' ||
        err.code === 'ENOENT') {
        return new MyError(
          `Not Found: ${path}`,
          StatusCodes.NOT_FOUND,
          'E_NOT_FOUND',
          'ERROR - NOT FOUND'
        )
      }
      return new MyError(
        err.message,
        StatusCodes.INTERNAL_SERVER_ERROR,
        'E_INTERNAL_SERVER_ERROR',
        'ERROR - INTERNAL SERVER ERROR'
      )
    }

    logger(`${path} Start bundling`)
    try {
      // Force an error if the folder doesn't exist as tsify does NOT handle that gracefully
      statSync(`./bundles/${path}`)

      bundles[path] = new Promise((resolve, reject) => {
        const browser = browserify()
        browser.plugin('tsify')
        browser.plugin('common-shakeify')
        browser.transform('brfs')
        browser.add(`./bundles/${path}`)
        const bundle = browser.bundle()

        const minified = bundle.pipe(minifyStream({
          compress: {
            ecma: 2020,
            passes: 2
          },
          sourceMap: false
        }))
        bundle.on('error', (e: any) => reject(handleError(e)))
        bundle.on('end', async () => {
          const chunks = []
          for await (const chunk of minified) {
            chunks.push(chunk)
          }
          resolve(Buffer.concat(chunks))
          logger(`${path} Bundled successfully`)
        })
      })
    } catch (err) {
      handleError(err)
      bundles[path] = Promise.reject(handleError(err))
    }
    if (bundles[path] !== undefined) {
      // bundles[path].catch(() => 0) // Ignore errors they were logged above and will be retrieved later?
    }
  }

  const watchDir = async (path: string) => {
    const logger = debug(`${logPrefix}:watchChanges`)
    try {
      logger(`Watching ${path} for changes`)
      const watcher = watch(`./bundles/${path}`, { persistent: false })
      for await (const event of watcher) {
        logger(`${path}/${event.filename} ${event.eventType} rebundling ${path}`)
        makeBundle(path)
      }
    } catch (err) {
      if (err instanceof Error) {
        logger(`Watcher for ${path} exited unexpectedly: ${err.message}`, err)
      } else {
        logger(`Watcher for ${path} exited unexpectedly`, err)
      }
    }
  }

  for (const dirinfo of await readdir('./bundles', { withFileTypes: true })) {
    if (/[.][tj]s$/.test(dirinfo.name) || dirinfo.isDirectory()) {
      makeBundle(dirinfo.name)
      watchDir(dirinfo.name)
    }
  }

  router.get('/:bundleName', async (req: Request, res: Response) => {
    const bundleName = `${req.params.bundleName}`
    if (!Object.keys(bundles).some(name => name === bundleName)) {
      makeBundle(`${req.params.bundleName}`)
    }
    try {
      const code = await bundles[bundleName]
      res.status(StatusCodes.OK).contentType(`${bundleName}.js`).send(code)
    } catch (e: any) {
      let statusCode = StatusCodes.INTERNAL_SERVER_ERROR
      if (typeof e.statusCode === 'number') {
        statusCode = e.statusCode
      }
      res.status(statusCode).render('error', e)
    }
  })

  return router
}
