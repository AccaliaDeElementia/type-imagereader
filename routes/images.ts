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

  public static async ResizePreview (image: ImageData): Promise<void> {
    if (image.code !== null) {
      return // Image already has an error
    }
    try {
      image.data = await Imports.Sharp(image.data)
        .rotate()
        .resize({
          width: 240,
          height: 320,
          fit: Sharp.fit.inside,
          withoutEnlargement: true
        })
        .png()
        .toBuffer()
      image.extension = 'png'
    } catch (e) {
      image.code = 'E_INTERNAL_ERROR'
      image.statusCode = StatusCodes.INTERNAL_SERVER_ERROR
      image.message = 'Image Rescale Error'
    }
  }

  public static async ResizeKiosk (image: ImageData): Promise<void> {
    if (image.code !== null) {
      return // Image already has an error
    }
    try {
      let sharp = Imports.Sharp(image.data, { animated: true })
      const metadata = await sharp.metadata()
      sharp = sharp.rotate()
      if (metadata.pages === undefined || metadata.pages <= 1) {
        // Resizing Animated gifs/webp not yet supported well :'(
        sharp = sharp.resize({
          width: 1280,
          height: 720,
          fit: Sharp.fit.inside,
          withoutEnlargement: true
        })
      }
      image.data = await sharp
        .webp()
        .toBuffer()
      image.extension = 'webp'
    } catch (e) {
      image.code = 'E_INTERNAL_ERROR'
      image.statusCode = StatusCodes.INTERNAL_SERVER_ERROR
      image.message = 'Image Rescale Error'
    }
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

// Export the base-router
export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
  // Init router and path
  const router = Imports.Router()

  const logger = Imports.debug('type-imagereader:images')

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
    await Functions.SendImage(image, res)
  }))

  router.get('/preview/*', handleErrors(async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    const image = await Functions.ReadImage(filename)
    await Functions.ResizePreview(image)
    await Functions.SendImage(image, res)
  }))

  router.get('/kiosk/*', handleErrors(async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    const image = await Functions.ReadImage(filename)
    await Functions.ResizeKiosk(image)
    await Functions.SendImage(image, res)
  }))

  return router
}
