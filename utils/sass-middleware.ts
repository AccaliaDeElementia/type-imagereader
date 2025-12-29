'use sanity'

import type { Request, Response, NextFunction } from 'express'

import { StatusCodes } from 'http-status-codes'

import { join, normalize } from 'node:path'
import { readdir, watch, access } from 'node:fs/promises'

import sass from 'sass'

import { Debouncer } from './debounce'

import debug from 'debug'

interface sourceMap {
  version: number
  file: string
  names: string[]
  sources: string[]
  mappings: string
}

interface cssAndMap {
  css: string
  map: sourceMap
}

const sassExtension = /\.s[ca]ss$/

export const Imports = { sass, access, readdir, watch }

function LogError(err: unknown, message: string, defaultError: string): Error {
  Functions.logger(message, err)
  if (err instanceof Error) {
    return err
  }
  return new Error(defaultError)
}

const createCache = (): Record<string, Promise<cssAndMap | null>> => ({})
export const Functions = {
  logger: debug('type-imagereader:sass-middleware'),
  debouncer: new Debouncer(),
  cache: createCache(),
  CompileCss: async (path: string, filename: string): Promise<cssAndMap> => {
    try {
      Functions.logger(`Begin compiling ${filename}`)
      const styles = await Imports.sass.compileAsync(join(path, filename), {
        style: 'compressed',
        sourceMap: true,
      })
      Functions.logger(`${filename} compiled successfully`)
      return {
        css: styles.css,
        map: {
          version: +(styles.sourceMap?.version ?? 0),
          file: filename,
          names: styles.sourceMap?.names ?? [],
          sources: styles.sourceMap?.sources ?? [],
          mappings: styles.sourceMap?.mappings ?? '',
        },
      }
    } catch (err) {
      throw LogError(err, `Error Compiling ${filename}:`, 'Unexpected Error Encountered Compiling CSS')
    }
  },
  CompileAndCache: async (basePath: string, filename: string): Promise<boolean> => {
    try {
      await Imports.access(join(basePath, filename))
      const key = filename.replace(sassExtension, '.css')
      Functions.cache[key] = Functions.CompileCss(basePath, filename).catch(() => null)
      return true
    } catch (err) {
      return false
    }
  },
  CompileFolder: async (basePath: string, path: string): Promise<void> => {
    for (const dirinfo of await Imports.readdir(join(basePath, path), {
      withFileTypes: true,
    })) {
      if (sassExtension.test(dirinfo.name) && !/(?:^|\/)\./.test(dirinfo.name)) {
        const sassFile = join(path, dirinfo.name)
        Functions.CompileAndCache(basePath, sassFile).catch(() => null)
      }
    }
  },
  WatchFolder: async (basePath: string, path: string): Promise<void> => {
    try {
      Functions.logger(`Watching ${path} for stylesheets`)
      const watcher = Imports.watch(join(basePath, path), { persistent: false })
      for await (const event of watcher) {
        if (event.filename === null) continue
        if (!sassExtension.test(event.filename) || /(?:^|\/)\./.test(event.filename)) continue
        const sassFile = join(path, event.filename)
        Functions.debouncer.debounce(sassFile, async () => {
          Functions.logger(`${sassFile} needs recompiling, ${event.eventType}`)
          await Functions.CompileAndCache(basePath, sassFile)
        })
      }
    } catch (err) {
      Functions.logger(`Watcher for ${path} exited unexpectedly`, err)
    }
  },
}

export interface Options {
  mountPath: string
  watchdir: string
}

export default ({
  mountPath,
  watchdir,
}: Options): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  Functions.WatchFolder(mountPath, watchdir).catch(() => null)
  Functions.CompileFolder(mountPath, watchdir).catch(() => null)

  const acceptRequest = (req: Request): boolean => {
    // ignore all requests that are not GET or don't have .css in them
    if (req.method.toLowerCase() !== 'get' || !/\.css(?:\.map)?$/.test(req.path) || /(?:^|\/)\.[^.]/.test(req.path)) {
      return false
    }
    return true
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!acceptRequest(req)) {
      next()
      return
    }

    if (normalize(req.path) !== req.path) {
      res.status(StatusCodes.FORBIDDEN).send('Directory Traversal Not Allowed!')
      return
    }
    try {
      const path = req.path.replace(/\.map$/, '')
      if (Functions.cache[path] === undefined) {
        ;(await Functions.CompileAndCache(mountPath, path.replace(/\.css$/, '.sass'))) ||
          (await Functions.CompileAndCache(mountPath, path.replace(/\.css$/, '.scss')))
      }
      const styles = await Functions.cache[path]
      if (styles === null || styles === undefined) {
        res.status(StatusCodes.NOT_FOUND).send('NOT FOUND')
      } else if (/\.map$/i.test(req.path)) {
        res.status(StatusCodes.OK).set('Content-Type', 'application/json').json(styles.map)
      } else {
        res.status(StatusCodes.OK).set('Content-Type', 'text/css').send(styles.css)
      }
    } catch (err) {
      let message = 'Internal Server Error'
      if (err instanceof Error) {
        ;({ message } = err)
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(message)
    }
  }
}
