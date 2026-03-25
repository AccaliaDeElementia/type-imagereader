'use sanity'

import { type Application, Router, type Request, type Response, type RequestHandler } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { normalize, join, extname } from 'node:path'
import { readFile } from 'node:fs/promises'

import Sharp from 'sharp'

import { StatusCodes } from 'http-status-codes'

import debug from 'debug'
import { ReqParamToString } from '#utils/helpers'

const CACHE_SIZE = 25
const ONE_MONTH = 2_592_000_000
const PREVIEW_WIDTH = 240
const PREVIEW_HEIGHT = 320
const KIOSK_WIDTH = 1280
const KIOSK_HEIGHT = 800

const allowedExtensions = /^(?:jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/iv

export class ImageData {
  static defaultData = Buffer.from('')
  data: Buffer = ImageData.defaultData
  extension: string | null = null
  code: string | null = null
  statusCode = Number.NaN
  message: string | null = null
  path = ''

  static fromImage(data: Buffer, extension: string, path: string): ImageData {
    const result = new ImageData()
    result.data = data
    result.extension = extension
    result.path = path
    return result
  }

  static fromError(code: string, statusCode: number, message: string, path: string): ImageData {
    const result = new ImageData()
    result.code = code
    result.statusCode = statusCode
    result.message = message
    result.path = path
    return result
  }

  async Rescale(width: number, height: number, animated: boolean): Promise<void> {
    if (this.code !== null) {
      return // Image already has an error
    }
    try {
      this.data = await Imports.Sharp(this.data, { animated })
        .rotate()
        .resize({
          width,
          height,
          fit: Sharp.fit.inside,
          withoutEnlargement: true,
        })
        .webp()
        .toBuffer()
      this.extension = 'webp'
    } catch (e) {
      // Do nothing.... we tried
    }
  }
}

export const Imports = { debug, readFile, Sharp, Router }

export interface CacheItem {
  path: string
  width: number
  height: number
  image: Promise<ImageData>
}

type CacheCreator = (path: string, width: number, height: number) => Promise<ImageData>

export class ImageCache {
  public items: CacheItem[] = []
  public static cacheSize = CACHE_SIZE
  public cacheFunction: CacheCreator

  constructor(cacheFn: CacheCreator) {
    this.cacheFunction = cacheFn
  }

  public async fetch(path: string, width: number, height: number): Promise<ImageData> {
    let item = this.items.find((entry) => entry.path === path && entry.width >= width && entry.height >= height)
    if (item === undefined) {
      item = {
        path,
        width,
        height,
        image: this.cacheFunction(path, width, height),
      }
    } else {
      this.items = this.items.filter((entry) => entry !== item)
    }
    this.items.unshift(item)
    if (this.items.length >= ImageCache.cacheSize) {
      this.items = this.items.filter((_, i) => i < ImageCache.cacheSize)
    }
    return await item.image
  }
}

export const Functions = {
  ReadImage: async (path: string): Promise<ImageData> => {
    if (normalize(path) !== path) {
      return ImageData.fromError('E_NO_TRAVERSE', StatusCodes.FORBIDDEN, 'Directory Traversal is not Allowed!', path)
    }
    const regexResult = /^(?:\.)?(?<ext>.+)/v.exec(extname(path))
    if (regexResult === null) {
      return ImageData.fromError('E_NOT_IMAGE', StatusCodes.BAD_REQUEST, 'Requested Path is Not An Image!', path)
    }
    const ext = regexResult.groups?.ext
    if (ext === undefined || !allowedExtensions.test(ext)) {
      return ImageData.fromError('E_NOT_IMAGE', StatusCodes.BAD_REQUEST, 'Requested Path is Not An Image!', path)
    }
    try {
      const data = await Imports.readFile(join('/data', path))
      return ImageData.fromImage(data, ext, path)
    } catch (e) {
      return ImageData.fromError('E_NOT_FOUND', StatusCodes.NOT_FOUND, 'Requested Path Not Found!', path)
    }
  },
  RescaleImage: async (image: ImageData, width: number, height: number, animated = true): Promise<void> => {
    await image.Rescale(width, height, animated)
  },
  ReadAndRescaleImage: async (path: string, width: number, height: number, animated = true): Promise<ImageData> => {
    const image = await Functions.ReadImage(path)
    await Functions.RescaleImage(image, width, height, animated)
    return image
  },
  SendImage: (image: ImageData, res: Response): void => {
    if (image.code !== null) {
      res.status(image.statusCode).json({
        error: {
          code: image.code,
          message: image.message,
          path: image.path,
        },
      })
      return
    }
    res
      .set('Content-Type', `image/${image.extension}`)
      .set('Cache-Control', `public, max-age=${ONE_MONTH}`)
      .set('Expires', new Date(Date.now() + ONE_MONTH).toUTCString())
      .send(image.data)
  },
}

export const CacheStorage = {
  kioskCache: new ImageCache(async (path, _, __) => {
    await Promise.resolve()
    return ImageData.fromError(
      'INTERNAL_SERVER_ERROR',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'CACHE_NOT_INITIALIZED',
      path,
    )
  }),
  scaledCache: new ImageCache(async (path, _, __) => {
    await Promise.resolve()
    return ImageData.fromError(
      'INTERNAL_SERVER_ERROR',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'CACHE_NOT_INITIALIZED',
      path,
    )
  }),
}

// Export the base-router
export async function getRouter(_app: Application, _serve: Server, _socket: WebSocketServer): Promise<Router> {
  // Init router and path
  const router = Imports.Router()

  const logger = Imports.debug('type-imagereader:images')

  CacheStorage.kioskCache = new ImageCache(Functions.ReadAndRescaleImage)
  CacheStorage.scaledCache = new ImageCache(Functions.ReadAndRescaleImage)

  const sendError = (res: Response, code: string, statusCode: StatusCodes, message: string): void => {
    res.status(statusCode).json({
      error: {
        code,
        message,
      },
    })
  }

  const handleErrors =
    (action: (req: Request, res: Response) => Promise<void>): RequestHandler =>
    async (req: Request, res: Response) => {
      try {
        await action(req, res)
      } catch (e) {
        logger(`Error rendering: ${req.originalUrl}`, req.body)
        logger(e)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: {
            code: 'E_INTERNAL_ERROR',
            message: 'Internal Server Error',
          },
        })
      }
    }

  router.get(
    '/full/*path',
    handleErrors(async (req, res) => {
      const filename = `/${ReqParamToString(req.params.path)}`
      const image = await Functions.ReadImage(filename)
      Functions.SendImage(image, res)
    }),
  )

  const parseNumberParam = (val: string): number | undefined => {
    if (!/^[1-9]\d*$/v.test(val)) return undefined
    return Number.parseInt(val, 10)
  }

  router.get(
    '/scaled/:width/:height/*path-image.webp',
    handleErrors(async (req, res) => {
      const filename = `/${ReqParamToString(req.params.path)}`
      if (req.params.width === undefined) {
        sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'width parameter must be provided')
        return
      }
      const width = parseNumberParam(ReqParamToString(req.params.width))
      if (width === undefined) {
        sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'width parameter must be positive integer')
        return
      }
      if (req.params.height === undefined) {
        sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'height parameter must be provided')
        return
      }
      const height = parseNumberParam(ReqParamToString(req.params.height))
      if (height === undefined) {
        sendError(res, 'E_BAD_REQUEST', StatusCodes.BAD_REQUEST, 'height parameter must be positive integer')
        return
      }
      const image = await CacheStorage.scaledCache.fetch(filename, width, height)
      Functions.SendImage(image, res)
    }),
  )

  router.get(
    '/preview/*path-image.webp',
    handleErrors(async (req, res) => {
      const filename = `/${ReqParamToString(req.params.path)}`
      const image = await Functions.ReadImage(filename)
      await Functions.RescaleImage(image, PREVIEW_WIDTH, PREVIEW_HEIGHT, false)
      Functions.SendImage(image, res)
    }),
  )

  router.get(
    '/kiosk/*path-image.webp',
    handleErrors(async (req, res) => {
      const filename = `/${ReqParamToString(req.params.path)}`
      const image = await CacheStorage.kioskCache.fetch(filename, KIOSK_WIDTH, KIOSK_HEIGHT)
      Functions.SendImage(image, res)
    }),
  )

  await Promise.resolve()

  return router
}
