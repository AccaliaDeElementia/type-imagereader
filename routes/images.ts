'use sanity'

import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { normalize, join, extname } from 'path'
import { readFile } from 'fs/promises'

import Sharp from 'sharp'

import { StatusCodes } from 'http-status-codes'

import debug from 'debug'

const allowedExtensions = /^(jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/i

export class ImageData {
  data: Buffer = Buffer.from('')
  extension: string|null = null
  code: string|null = null
  statusCode: number = 500
  message: string|null = null
  path: string = ''

  static fromImage (data: Buffer, extension: string, path: string) {
    const result = new ImageData()
    result.data = data
    result.extension = extension
    result.path = path
    return result
  }

  static fromError (code: string, statusCode: number, message: string, path: string) {
    const result = new ImageData()
    result.code = code
    result.statusCode = statusCode
    result.message = message
    result.path = path
    return result
  }
}

export class Imports {
  public static debug = debug
  public static readFile = readFile
  public static Sharp = Sharp
  public static Router = Router
}

interface CacheItem {
  path: string
  width: number,
  height: number
  image: Promise<ImageData>
}

type CacheCreator = (path: string, width: number, height: number) => Promise<ImageData>

export class ImageCache {
  public items: CacheItem[] = []
  public static cacheSize = 25
  public cacheFunction: CacheCreator

  constructor (cacheFn: CacheCreator) {
    this.cacheFunction = cacheFn
  }

  public fetch (path: string, width: number, height: number): Promise<ImageData> {
    let [i, item] = this.items.reduce(([idx, accumulator]: [number, CacheItem|null], current, i) =>
      current.path === path && current.width >= width && current.height >= height ? [i, current] : [idx, accumulator], [-1, null]
    )
    if (i >= 0 && item !== null) {
      this.items.splice(i, 1)
      this.items.unshift(item)
      return item?.image
    } else {
      item = {
        path,
        width,
        height,
        image: this.cacheFunction(path, width, height)
      }
      if (this.items.length >= ImageCache.cacheSize) {
        this.items = this.items.slice(0, ImageCache.cacheSize - 1)
      }
      this.items.unshift(item)
    }
    return item.image
  }
}

export class Functions {
  public static async ReadImage (path: string): Promise<ImageData> {
    if (normalize(path) !== path) {
      return ImageData.fromError(
        'E_NO_TRAVERSE',
        StatusCodes.FORBIDDEN,
        'Directory Traversal is not Allowed!',
        path
      )
    }
    const ext = extname(path).slice(1)
    if (!allowedExtensions.test(ext)) {
      return ImageData.fromError(
        'E_NOT_IMAGE',
        StatusCodes.BAD_REQUEST,
        'Requested Path is Not An Image!',
        path
      )
    }
    try {
      const data = await Imports.readFile(join('/data', path))
      return ImageData.fromImage(data, ext, path)
    } catch (e) {
      return ImageData.fromError(
        'E_NOT_FOUND',
        StatusCodes.NOT_FOUND,
        'Requested Path Not Found!',
        path
      )
    }
  }

  public static async RescaleImage (image: ImageData, width: number, height: number, animated: boolean = true): Promise<void> {
    if (image.code !== null) {
      return // Image already has an error
    }
    try {
      image.data = await Imports.Sharp(image.data, { animated })
        .rotate()
        .resize({
          width,
          height,
          fit: Sharp.fit.inside,
          withoutEnlargement: true
        })
        .webp()
        .toBuffer()
      image.extension = 'webp'
    } catch (e) {
      // Do nothing.... we tried
    }
  }

  public static async ReadAndRescaleImage (path: string, width: number, height: number, animated: boolean = true): Promise<ImageData> {
    const image = await Functions.ReadImage(path)
    await Functions.RescaleImage(image, width, height, animated)
    return image
  }

  public static SendImage (image: ImageData, res: Response): void {
    const aMonth = 1000 * 60 * 60 * 24 * 30
    if (image.code != null) {
      res.status(image.statusCode).json({
        error: {
          code: image.code,
          message: image.message,
          path: image.path
        }
      })
      return
    }
    res
      .set('Content-Type', `image/${image.extension}`)
      .set('Cache-Control', `public, max-age=${aMonth}`)
      .set('Expires', new Date(Date.now() + aMonth).toUTCString())
      .send(image.data)
  }
}

export const CacheStorage = {
  kioskCache: new ImageCache(async (path, _, __) => ImageData.fromError('INTERNAL_SERVER_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, 'CACHE_NOT_INITIALIZED', path)),
  scaledCache: new ImageCache(async (path, _, __) => ImageData.fromError('INTERNAL_SERVER_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, 'CACHE_NOT_INITIALIZED', path))
}

// Export the base-router
export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
  // Init router and path
  const router = Imports.Router()

  const logger = Imports.debug('type-imagereader:images')

  CacheStorage.kioskCache = new ImageCache(Functions.ReadAndRescaleImage)
  CacheStorage.scaledCache = new ImageCache(Functions.ReadAndRescaleImage)

  const sendError = (res: Response, code: string, statusCode: StatusCodes, message: string) => {
    res.status(statusCode).json({
      error: {
        code,
        message
      }
    })
  }

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

  router.get('/full/*', handleErrors(async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    const image = await Functions.ReadImage(filename)
    Functions.SendImage(image, res)
  }))

  router.get('/scaled/:width/:height/*-image.webp', handleErrors(async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    if (!req.params.width) {
      return sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'width parameter must be provided')
    }
    const width = +req.params.width
    if (!Number.isInteger(width) || `${width}` !== req.params.width || width < 1) {
      return sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'width parameter must be positive integer')
    }
    if (!req.params.height) {
      return sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'height parameter must be provided')
    }
    const height = +req.params.height
    if (!Number.isInteger(height) || `${height}` !== req.params.height || height < 1) {
      return sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'height parameter must be positive integer')
    }
    const image = await CacheStorage.scaledCache.fetch(filename, width, height)
    Functions.SendImage(image, res)
  }))

  router.get('/preview/*-image.webp', handleErrors(async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    const image = await Functions.ReadImage(filename)
    await Functions.RescaleImage(image, 240, 320, false)
    Functions.SendImage(image, res)
  }))

  router.get('/kiosk/*-image.webp', handleErrors(async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    const image = await CacheStorage.kioskCache.fetch(filename, 1280, 720)
    Functions.SendImage(image, res)
  }))

  return router
}
