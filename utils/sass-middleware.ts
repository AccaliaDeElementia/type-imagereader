import { Request, Response, NextFunction } from 'express'

import { StatusCodes } from 'http-status-codes'

import { join, normalize } from 'path'
import { readdir, watch, access } from 'fs/promises'

import sass from 'sass'

import { Debouncer } from './debounce'

import debug from 'debug'
const logger = debug('type-imagereader:sass-middleware')

const debouncer = Debouncer.create()

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

const cssMap: {[key: string]: Promise<cssAndMap>} = {}
const compileCss = async (path: string, filename: string): Promise<cssAndMap> => {
  try {
    logger(`Begin compiling ${filename}`)
    const styles = await sass.compileAsync(join(path, filename), {
      style: 'compressed',
      sourceMap: true
    })
    logger(`${filename} compiled successfully`)
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
    let throwable = err
    if (!(err instanceof Error)) {
      throwable = new Error(err)
    }
    logger(`Error Compiling ${filename}`, throwable.message)
    throw throwable
  }
}

const sassExtension = /\.s[ca]ss$/
const compileAndSave = async (basePath: string, filename: string): Promise<boolean> => {
  try {
    await access(join(basePath, filename))
    cssMap[filename.replace(sassExtension, '.css')] = compileCss(basePath, filename)
    cssMap[filename.replace(sassExtension, '.css')]?.catch(() => 0)
    return true
  } catch (err) {
    return false
  }
}

const watchFolder = async (basePath: string, path: string) => {
  try {
    logger(`Watching ${path} for stylesheets`)
    const watcher = watch(join(basePath, path), { persistent: false })
    for await (const event of watcher) {
      if (!sassExtension.test(event.filename)) continue
      const sassFile = join(path, event.filename)
      debouncer.debounce(sassFile, async () => {
        logger(`${sassFile} needs recompiling, ${event.eventType}`)
        await compileAndSave(basePath, sassFile)
      })
    }
  } catch (err) {
    logger(`Watcher for ${path} exited unexpectedly`, err)
  }
}

const precompileFolder = async (basePath: string, path: string) => {
  for (const dirinfo of await readdir(join(basePath, path), { withFileTypes: true })) {
    if (sassExtension.test(dirinfo.name)) {
      const sassFile = join(path, dirinfo.name)
      compileAndSave(basePath, sassFile)
    }
  }
}

export interface Options {
  mountPath: string
  watchdir: string
}

export default ({ mountPath, watchdir }: Options) => {
  watchFolder(mountPath, watchdir)
  precompileFolder(mountPath, watchdir)

  return async (req: Request, res: Response, next: NextFunction) => {
    // ignore all requests that are not GET or don't have .css in them
    if (req.method.toLowerCase() !== 'get' || !req.path.match(/\.css(\.map)?$/)) {
      return next()
    }

    if (normalize(req.path) !== req.path) {
      return res.status(StatusCodes.FORBIDDEN).send('Directory Traversal Not Allowed!')
    }
    try {
      const path = req.path.replace(/\.map$/, '')
      if (!cssMap[path]) {
        await compileAndSave(mountPath, path.replace(/\.css$/, '.sass')) ||
        await compileAndSave(mountPath, path.replace(/\.css$/, '.scss'))
      }
      const styles = await cssMap[path]
      if (!styles) {
        res.status(StatusCodes.NOT_FOUND).send('NOT FOUND')
      } else {
        if (/\.map$/.test(req.path)) {
          res.set('Content-Type', 'application/json')
          res.json(styles.map)
        } else {
          res.set('Content-Type', 'text/css')
          res.send(styles.css)
        }
      }
    } catch (err: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(err.message)
    }
  }
}
