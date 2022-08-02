'use sanity'

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'

import { join, normalize } from 'path'
import { readdir, watch, access } from 'fs/promises'

import browserify from 'browserify'
import minifyStream from 'minify-stream'

import { getDebouncer } from './debounce'

import debug from 'debug'
const logger = debug('type-imagereader:browserify-middleware')

const debouncer = getDebouncer()

const isCompileableExtension = /\.[jt]s$/

const browserified: { [key: string]: Promise<Buffer|null> } = {}

const compileAsync = (path: string): Promise<Buffer|null> =>
  access(path)
    .then((): Promise<Buffer> => new Promise((resolve, reject) => {
      const browser = browserify()
      browser.plugin('tsify')
      browser.plugin('common-shakeify', {
        ecmaVersion: 14
      })
      browser.transform('brfs')
      browser.add(path)
      const bundle = browser.bundle()

      const minifier = minifyStream({
        compress: {
          ecma: 2024,
          passes: 2
        },
        sourceMap: false
      })
      minifier.on('error', (e: any) => reject(e))
      bundle.on('error', (e: any) => reject(e))
      const minified = bundle.pipe(minifier)
      bundle.on('end', async () => {
        const chunks = []
        for await (const chunk of minified) {
          chunks.push(chunk)
        }
        resolve(Buffer.concat(chunks))
      })
    }))
    .catch((err: any): Promise<Buffer|null> => new Promise((resolve, reject) => {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
        return resolve(null)
      }
      reject(err)
    }))

const getPaths = (path: string): string[] =>
  ['.js', '.ts', ''].map(ext => path.replace(isCompileableExtension, '') + ext)

const getPath = async (basePath: string, path: string): Promise<string | null> => {
  const test = async (testpath: string) => {
    try {
      await access(testpath)
      return true
    } catch {
      return false
    }
  }
  const candidates = getPaths(path)
    .map(candidate => join(basePath, candidate))
  const exists = await Promise.all(candidates.map(candidate => test(candidate)))
  return candidates.filter((_, i) => exists[i])[0] || null
}

const sendScript = async (basepath: string, path: string, res: Response) => {
  const renderError = (code:StatusCodes, err: Error|String) => {
    if (err instanceof Error) {
      res.status(code).render('error', err)
    } else {
      res.status(code).render('error', { message: err })
    }
  }
  try {
    if (!browserified[path]) {
      await compileAndCache(basepath, path)
    }
    const code = await browserified[path]
    if (!code) {
      return renderError(StatusCodes.NOT_FOUND, `Not Found: ${path}`)
    }
    res.status(StatusCodes.OK).contentType('application/javascript').send(code)
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
      return renderError(StatusCodes.NOT_FOUND, `Not Found: ${path}`)
    }
    if (!(err instanceof Error)) {
      return renderError(StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL SERVER ERROR')
    } else {
      return renderError(StatusCodes.INTERNAL_SERVER_ERROR, err)
    }
  }
}

const compileAndCache = async (basePath: string, mountedPath: string) => {
  const realPath = await getPath(basePath, mountedPath)
  if (!realPath) return
  try {
    const paths = getPaths(mountedPath)
    logger(`Begin compiling ${realPath}`)
    const code = compileAsync(realPath)
    for (const path of paths) {
      browserified[path] = code
    }
    await code
    logger(`Compiled successfully ${realPath}`)
  } catch (err) {
    logger(`Compile for ${mountedPath} failed:`, err)
  }
}

const watchFolder = async (basePath: string, mountPath: string, isFolder: boolean = false) => {
  try {
    logger(`Watching ${mountPath} for Scripts`)
    const watcher = watch(join(basePath, mountPath), { persistent: false })
    for await (const event of watcher) {
      const scriptFile = isFolder ? mountPath : join(mountPath, event.filename)
      debouncer(scriptFile, async () => {
        logger(`${scriptFile} needs recompiling. ${event.eventType}`)
        await compileAndCache(basePath, scriptFile)
      })
    }
  } catch (err) {
    logger(`Watcher for ${mountPath} exited unexpectedly`, err)
  }
}

const precompileScripts = async (basePath: string, watchDirs: string[]) => {
  for (const dir of watchDirs) {
    for (const dirinfo of await readdir(join(basePath, dir), { withFileTypes: true })) {
      const target = join(dir, dirinfo.name)
      if (isCompileableExtension.test(dirinfo.name) || dirinfo.isDirectory()) {
        compileAndCache(basePath, target)
      }
      if (dirinfo.isDirectory()) {
        watchFolder(basePath, target, true)
      }
    }
  }
  for (const dir of watchDirs) {
    watchFolder(basePath, dir)
  }
}

export interface Options {
  basePath: string
  watchPaths?: string[]
}

export default (options: Options) => {
  if (options.watchPaths) {
    precompileScripts(options.basePath, options.watchPaths)
  }
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method.toLowerCase() !== 'get' || !req.path.match(isCompileableExtension)) {
      return next()
    }
    if (normalize(req.path) !== req.path) {
      return res.status(StatusCodes.FORBIDDEN).render('error', { message: 'Directory Traversal Not Allowed!' })
    }
    try {
      await sendScript(options.basePath, req.path, res)
    } catch (err) {
      logger('Send Script Error', err)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', { message: 'INTERNAL_SERVER_ERRROR' })
    }
  }
}
