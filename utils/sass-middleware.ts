import { Request, Response, NextFunction } from 'express'

import { StatusCodes } from 'http-status-codes'

import { join, normalize } from 'path'
import { readdir, watch, access } from 'fs/promises'

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

export class Imports {
  public static sass = sass
  public static access = access
  public static readdir = readdir
  public static watch = watch
}

export class Functions {
  public static logger = debug('type-imagereader:sass-middleware')
  public static debouncer = Debouncer.create()
  public static cache: {[key: string]: Promise<cssAndMap|null>} = {}

  public static async CompileCss (path: string, filename: string): Promise<cssAndMap> {
    try {
      Functions.logger(`Begin compiling ${filename}`)
      const styles = await Imports.sass.compileAsync(join(path, filename), {
        style: 'compressed',
        sourceMap: true
      })
      Functions.logger(`${filename} compiled successfully`)
      return {
        css: styles.css,
        map: {
          version: +(styles.sourceMap?.version || 0),
          file: filename,
          names: styles.sourceMap?.names || [],
          sources: styles.sourceMap?.sources || [],
          mappings: styles.sourceMap?.mappings || ''
        }
      }
    } catch (err: any) {
      Functions.logger(`Error Compiling ${filename}: ${err}`)
      throw err
    }
  }

  public static async CompileAndCache (basePath: string, filename: string): Promise<boolean> {
    try {
      await Imports.access(join(basePath, filename))
      const key = filename.replace(sassExtension, '.css')
      Functions.cache[key] = Functions.CompileCss(basePath, filename)
        .catch(() => null)
      return true
    } catch (err) {
      return false
    }
  }

  public static async CompileFolder (basePath: string, path: string) {
    for (const dirinfo of await Imports.readdir(join(basePath, path), { withFileTypes: true })) {
      if (sassExtension.test(dirinfo.name) && !/(^|\/)\./.test(dirinfo.name)) {
        const sassFile = join(path, dirinfo.name)
        Functions.CompileAndCache(basePath, sassFile)
      }
    }
  }

  public static async WatchFolder (basePath: string, path: string) {
    try {
      Functions.logger(`Watching ${path} for stylesheets`)
      const watcher = Imports.watch(join(basePath, path), { persistent: false })
      for await (const event of watcher) {
        if (!sassExtension.test(event.filename) || /(^|\/)\./.test(event.filename)) continue
        const sassFile = join(path, event.filename)
        Functions.debouncer.debounce(sassFile, async () => {
          Functions.logger(`${sassFile} needs recompiling, ${event.eventType}`)
          await Functions.CompileAndCache(basePath, sassFile)
        })
      }
    } catch (err) {
      Functions.logger(`Watcher for ${path} exited unexpectedly`, err)
    }
  }
}

export interface Options {
  mountPath: string
  watchdir: string
}

export default ({ mountPath, watchdir }: Options) => {
  Functions.WatchFolder(mountPath, watchdir)
  Functions.CompileFolder(mountPath, watchdir)

  return async (req: Request, res: Response, next: NextFunction) => {
    // ignore all requests that are not GET or don't have .css in them
    if (req.method.toLowerCase() !== 'get' ||
      !req.path.match(/\.css(\.map)?$/) ||
      /(^|\/)\.[^.]/.test(req.path)) {
      return next()
    }

    if (normalize(req.path) !== req.path) {
      return res.status(StatusCodes.FORBIDDEN).send('Directory Traversal Not Allowed!')
    }
    try {
      const path = req.path.replace(/\.map$/, '')
      if (!Functions.cache[path]) {
        await Functions.CompileAndCache(mountPath, path.replace(/\.css$/, '.sass')) ||
        await Functions.CompileAndCache(mountPath, path.replace(/\.css$/, '.scss'))
      }
      const styles = await Functions.cache[path]
      if (!styles) {
        res.status(StatusCodes.NOT_FOUND).send('NOT FOUND')
      } else {
        if (/\.map$/.test(req.path)) {
          res.status(StatusCodes.OK).set('Content-Type', 'application/json').json(styles.map)
        } else {
          res.status(StatusCodes.OK).set('Content-Type', 'text/css').send(styles.css)
        }
      }
    } catch (err: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(err.message)
    }
  }
}
