'use sanity'

import { type Application, Router, type Request, type Response, type RequestHandler } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { join, extname } from 'node:path'
import { readFile } from 'node:fs/promises'

import Sharp from 'sharp'

import { StatusCodes } from 'http-status-codes'

import debug from 'debug'
import type { Debugger } from 'debug'
import { reqParamToString, getDataDir as _getDataDir } from '#utils/helpers.js'
import { handleErrors as _handleErrors, sendError } from '#utils/express.js'
import { isBlockedTraversal as _isBlockedTraversal } from '#utils/path.js'

const CACHE_SIZE = 25
const ORIGINAL_CACHE_SIZE = 5
const ORIGINAL_UNBOUNDED = 0
const ONE_MONTH_MS = 2_592_000_000
const PREVIEW_WIDTH = 240
const PREVIEW_HEIGHT = 320
const KIOSK_WIDTH = 1280
const KIOSK_HEIGHT = 800

const allowedExtensions = /^(?:jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/iv

export interface ImageError {
  code: string
  statusCode: number
  message: string
}

export class ImageData {
  static defaultData = Buffer.from('')
  data: Buffer = ImageData.defaultData
  extension: string | null = null
  error: ImageError | null = null
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
    result.error = { code, statusCode, message }
    result.path = path
    return result
  }

  async rescale(width: number, height: number, animated: boolean): Promise<void> {
    if (this.error !== null) {
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
    } catch (err) {
      Imports.logger('rescale failed for %s: %s', this.path, err instanceof Error ? err.message : String(err))
    }
  }

  // Transcode at the stored resolution. Applies the same EXIF rotation and webp
  // encoding as rescale() so an unscaled view matches the scaled one in
  // orientation and colour, without resampling the pixels. An image the webp
  // encoder can't handle (over 16383px on a side) leaves data and extension
  // untouched, falling back to serving the original bytes.
  async convert(animated: boolean): Promise<void> {
    if (this.error !== null) {
      return // Image already has an error
    }
    try {
      this.data = await Imports.Sharp(this.data, { animated }).rotate().webp().toBuffer()
      this.extension = 'webp'
    } catch (err) {
      Imports.logger('convert failed for %s: %s', this.path, err instanceof Error ? err.message : String(err))
    }
  }
}

const logger: Debugger = debug('type-imagereader:images')

export const Imports = {
  logger,
  readFile,
  Sharp,
  Router,
  handleErrors: _handleErrors,
  isBlockedTraversal: _isBlockedTraversal,
  getDataDir: _getDataDir,
}

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
  // Per-instance override of the shared size limit, resolved on every fetch so
  // that changes to the shared default still apply to instances without one.
  public maxItems: number | undefined

  constructor(cacheFn: CacheCreator, maxItems?: number) {
    this.cacheFunction = cacheFn
    this.maxItems = maxItems
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
      this.items = this.items.filter((entry) => entry !== item) // remove from current position before promoting to front
    }
    this.items.unshift(item)
    const sizeLimit = this.maxItems ?? ImageCache.cacheSize
    if (this.items.length >= sizeLimit) {
      this.items = this.items.filter((_, i) => i < sizeLimit)
    }
    const result = await item.image
    // Don't poison the cache with errors — let subsequent requests retry from disk.
    if (result.error !== null) {
      this.items = this.items.filter((entry) => entry !== item)
    }
    return result
  }
}

export async function readImage(path: string): Promise<ImageData> {
  if (Imports.isBlockedTraversal(Imports.logger, path)) {
    return ImageData.fromError('E_NO_TRAVERSE', StatusCodes.FORBIDDEN, 'Directory Traversal is not Allowed!', path)
  }
  const ext = extname(path).replace(/^\./v, '')
  if (!allowedExtensions.test(ext)) {
    Imports.logger('not an image: ext=%s for %s', ext, path)
    return ImageData.fromError('E_NOT_IMAGE', StatusCodes.BAD_REQUEST, 'Requested Path is Not An Image!', path)
  }
  try {
    const data = await Imports.readFile(join(Imports.getDataDir(), path))
    return ImageData.fromImage(data, ext, path)
  } catch (err) {
    Imports.logger('image not found: %s (%s)', path, err instanceof Error ? err.message : String(err))
    return ImageData.fromError('E_NOT_FOUND', StatusCodes.NOT_FOUND, 'Requested Path Not Found!', path)
  }
}

export async function rescaleImage(image: ImageData, width: number, height: number, animated = true): Promise<void> {
  await image.rescale(width, height, animated)
}

export async function convertImage(image: ImageData, animated = true): Promise<void> {
  await image.convert(animated)
}

export async function readAndRescaleImage(
  path: string,
  width: number,
  height: number,
  animated = true,
): Promise<ImageData> {
  const image = await Internals.readImage(path)
  await Internals.rescaleImage(image, width, height, animated)
  return image
}

// Matches the CacheCreator contract so the original cache can share ImageCache;
// the bounding box is meaningless for an unscaled image and is ignored.
export async function readAndConvertImage(
  path: string,
  _width: number,
  _height: number,
  animated = true,
): Promise<ImageData> {
  const image = await Internals.readImage(path)
  await Internals.convertImage(image, animated)
  return image
}

export function sendImage(image: ImageData, res: Response): void {
  if (image.error !== null) {
    sendError(res, { ...image.error, path: image.path })
    return
  }
  res
    .set('Content-Type', `image/${image.extension}`)
    .set('Cache-Control', `public, max-age=${ONE_MONTH_MS}`)
    .set('Expires', new Date(Date.now() + ONE_MONTH_MS).toUTCString())
    .send(image.data)
}

const uninitializedCacheError: CacheCreator = async (path) => {
  await Promise.resolve() // async required by CacheCreator contract
  return ImageData.fromError('INTERNAL_SERVER_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, 'CACHE_NOT_INITIALIZED', path)
}

// Placeholder caches that return errors until getRouter() initializes them
export const CacheStorage = {
  kioskCache: new ImageCache(uninitializedCacheError),
  scaledCache: new ImageCache(uninitializedCacheError),
  originalCache: new ImageCache(uninitializedCacheError, ORIGINAL_CACHE_SIZE),
}

// Export the base-router
export async function getRouter(_app: Application, _serve: Server, _socket: WebSocketServer): Promise<Router> {
  // init router and path
  const router = Imports.Router()

  CacheStorage.kioskCache = new ImageCache(readAndRescaleImage)
  CacheStorage.scaledCache = new ImageCache(readAndRescaleImage)
  CacheStorage.originalCache = new ImageCache(readAndConvertImage, ORIGINAL_CACHE_SIZE)

  const handleErrors = (action: (req: Request, res: Response) => Promise<void>): RequestHandler =>
    Imports.handleErrors(Imports.logger, action)

  router.get(
    '/full/*path',
    handleErrors(async (req, res) => {
      const filename = `/${reqParamToString(req.params.path)}`
      Imports.logger('GET /images/full %s', filename)
      const image = await Internals.readImage(filename)
      Internals.sendImage(image, res)
    }),
  )

  const parseNumberParam = (val: string): number | undefined => {
    if (!/^[1-9]\d*$/v.test(val)) return undefined
    return Number.parseInt(val, 10)
  }

  router.get(
    '/scaled/:width/:height/*path-image.webp',
    handleErrors(async (req, res) => {
      const filename = `/${reqParamToString(req.params.path)}`
      if (req.params.width === undefined) {
        sendError(res, {
          code: 'E_BAD_REQUEST',
          statusCode: StatusCodes.BAD_REQUEST,
          message: 'width parameter must be provided',
        })
        return
      }
      const width = parseNumberParam(reqParamToString(req.params.width))
      if (width === undefined) {
        sendError(res, {
          code: 'E_BAD_REQUEST',
          statusCode: StatusCodes.BAD_REQUEST,
          message: 'width parameter must be positive integer',
        })
        return
      }
      if (req.params.height === undefined) {
        sendError(res, {
          code: 'E_BAD_REQUEST',
          statusCode: StatusCodes.BAD_REQUEST,
          message: 'height parameter must be provided',
        })
        return
      }
      const height = parseNumberParam(reqParamToString(req.params.height))
      if (height === undefined) {
        sendError(res, {
          code: 'E_BAD_REQUEST',
          statusCode: StatusCodes.BAD_REQUEST,
          message: 'height parameter must be positive integer',
        })
        return
      }
      Imports.logger('GET /images/scaled %dx%d %s', width, height, filename)
      const image = await CacheStorage.scaledCache.fetch(filename, width, height)
      Internals.sendImage(image, res)
    }),
  )

  router.get(
    '/original/*path-image.webp',
    handleErrors(async (req, res) => {
      const filename = `/${reqParamToString(req.params.path)}`
      Imports.logger('GET /images/original %s', filename)
      const image = await CacheStorage.originalCache.fetch(filename, ORIGINAL_UNBOUNDED, ORIGINAL_UNBOUNDED)
      Internals.sendImage(image, res)
    }),
  )

  router.get(
    '/preview/*path-image.webp',
    handleErrors(async (req, res) => {
      const filename = `/${reqParamToString(req.params.path)}`
      Imports.logger('GET /images/preview %s', filename)
      const image = await Internals.readImage(filename)
      await Internals.rescaleImage(image, PREVIEW_WIDTH, PREVIEW_HEIGHT, false)
      Internals.sendImage(image, res)
    }),
  )

  router.get(
    '/kiosk/*path-image.webp',
    handleErrors(async (req, res) => {
      const filename = `/${reqParamToString(req.params.path)}`
      Imports.logger('GET /images/kiosk %s', filename)
      const image = await CacheStorage.kioskCache.fetch(filename, KIOSK_WIDTH, KIOSK_HEIGHT)
      Internals.sendImage(image, res)
    }),
  )

  await Promise.resolve() // async required by getRouter signature
  return router
}

export const Internals = { readImage, rescaleImage, convertImage, sendImage }
