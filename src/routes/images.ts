'use sanity'

import { Router, Response } from 'express'
import { normalize, join, extname } from 'path'
import { readFile } from 'fs/promises'

import Sharp from 'sharp'

const allowedExtensions = /^(jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/i

class ImageData {
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

const readImage = async (path: string) => {
  if (normalize(path) !== path) {
    return ImageData.fromError(
      'ENOTRAVERSE',
      403,
      'Directory Traversal is not Allowed!',
      path
    )
  }
  const ext = extname(path).slice(1)
  if (!allowedExtensions.test(ext)) {
    return ImageData.fromError(
      'ENOTIMAGE',
      400,
      'Requested Path is Not An Image!',
      path
    )
  }
  try {
    const data = await readFile(join('/data', path))
    return ImageData.fromImage(data, ext, path)
  } catch (e) {
    return ImageData.fromError(
      'ENOTFOUND',
      404,
      'Requested Path Not Found!',
      path
    )
  }
}

const resizePreview = async (image: ImageData) => {
  if (image.code !== null) {
    return // Image already has an error
  }
  try {
    image.data = await Sharp(image.data)
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

  }
}

const sendImage = async (image: ImageData, res: Response) => {
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

// Export the base-router
export async function getRouter () {
  // Init router and path
  const router = Router()

  router.get('/full/*', async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    const image = await readImage(filename)
    await sendImage(image, res)
  })

  router.get('/preview/*', async (req, res) => {
    const filename = `/${req.params[0] || ''}`
    const image = await readImage(filename)
    await resizePreview(image)
    await sendImage(image, res)
  })
  return router
}
