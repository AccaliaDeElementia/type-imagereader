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
import { parseRequestedDimension as _parseRequestedDimension, UNBOUNDED } from '#contracts/scaledImage.js'

const CACHE_SIZE = 25
const ORIGINAL_CACHE_SIZE = 5
const ORIGINAL_UNBOUNDED = 0
const SECONDS_TO_MILLISECONDS_MULTIPLE = 1000
const ONE_MONTH_SECONDS = 2_592_000
const ONE_MONTH_MS = ONE_MONTH_SECONDS * SECONDS_TO_MILLISECONDS_MULTIPLE
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

function omitIfUnbounded(dimension: number): number | undefined {
  return dimension === UNBOUNDED ? undefined : dimension
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
      return
    }
    try {
      this.data = await Imports.Sharp(this.data, { animated })
        .rotate()
        .resize({
          width: omitIfUnbounded(width),
          height: omitIfUnbounded(height),
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

  // webp cannot encode over 16383px on a side; such an image keeps its original
  // bytes and extension.
  async convert(animated: boolean): Promise<void> {
    if (this.error !== null) {
      return
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
  parseRequestedDimension: _parseRequestedDimension,
}

export interface CacheItem {
  path: string
  width: number
  height: number
  image: Promise<ImageData>
}

type CacheCreator = (path: string, width: number, height: number) => Promise<ImageData>

function cachedAxisCovers(cached: number, requested: number): boolean {
  if (requested === UNBOUNDED) return cached === UNBOUNDED
  return cached !== UNBOUNDED && cached >= requested
}

export class ImageCache {
  public items: CacheItem[] = []
  public static cacheSize = CACHE_SIZE
  public cacheFunction: CacheCreator
  public maxItems: number | undefined

  constructor(cacheFn: CacheCreator, maxItems?: number) {
    this.cacheFunction = cacheFn
    this.maxItems = maxItems
  }

  public async fetch(path: string, width: number, height: number): Promise<ImageData> {
    let item = this.items.find(
      (entry) => entry.path === path && cachedAxisCovers(entry.width, width) && cachedAxisCovers(entry.height, height),
    )
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
    const sizeLimit = this.maxItems ?? ImageCache.cacheSize
    if (this.items.length >= sizeLimit) {
      this.items = this.items.filter((_, i) => i < sizeLimit)
    }
    const result = await item.image
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
    .set('Cache-Control', `public, max-age=${ONE_MONTH_SECONDS}`)
    .set('Expires', new Date(Date.now() + ONE_MONTH_MS).toUTCString())
    .send(image.data)
}

// eslint-disable-next-line @typescript-eslint/promise-function-async -- CacheCreator returns a promise; there is nothing here to await
const uninitializedCacheError: CacheCreator = (path) =>
  Promise.resolve(
    ImageData.fromError('INTERNAL_SERVER_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, 'CACHE_NOT_INITIALIZED', path),
  )

export const CacheStorage = {
  kioskCache: new ImageCache(uninitializedCacheError),
  scaledCache: new ImageCache(uninitializedCacheError),
  originalCache: new ImageCache(uninitializedCacheError, ORIGINAL_CACHE_SIZE),
}

// eslint-disable-next-line @typescript-eslint/require-await -- getRouter's contract is async; this router has nothing to await
export async function getRouter(_app: Application, _serve: Server, _socket: WebSocketServer): Promise<Router> {
  const router = Imports.Router()

  CacheStorage.kioskCache = new ImageCache(readAndRescaleImage)
  CacheStorage.scaledCache = new ImageCache(readAndRescaleImage)
  CacheStorage.originalCache = new ImageCache(readAndConvertImage, ORIGINAL_CACHE_SIZE)

  const handleErrors = (action: (req: Request, res: Response) => Promise<void> | void): RequestHandler =>
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
      const width = Imports.parseRequestedDimension(reqParamToString(req.params.width))
      if (width === undefined) {
        sendError(res, {
          code: 'E_BAD_REQUEST',
          statusCode: StatusCodes.BAD_REQUEST,
          message: 'width parameter must be a positive integer or auto',
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
      const height = Imports.parseRequestedDimension(reqParamToString(req.params.height))
      if (height === undefined) {
        sendError(res, {
          code: 'E_BAD_REQUEST',
          statusCode: StatusCodes.BAD_REQUEST,
          message: 'height parameter must be a positive integer or auto',
        })
        return
      }
      if (width === UNBOUNDED && height === UNBOUNDED) {
        sendError(res, {
          code: 'E_BAD_REQUEST',
          statusCode: StatusCodes.BAD_REQUEST,
          message: 'at least one of width and height must be bounded; use /images/original for neither',
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

  return router
}

export const Internals = { readImage, rescaleImage, convertImage, sendImage }
