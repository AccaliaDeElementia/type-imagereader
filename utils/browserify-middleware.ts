'use sanity'

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'

import { join, normalize } from 'path'
import { readdir, watch, access } from 'fs/promises'

import browserify from 'browserify'
import { minify } from 'terser'

import { Debouncer } from './debounce'

import debug from 'debug'

const isCompileableExtension = /\.[jt]s$/

export class Imports {
  public static access = access
  public static watch = watch
  public static readdir = readdir
  public static browserify = browserify
  public static minify = minify
}

export class Functions {
  public static browserified: { [key: string]: Promise<string|null> } = {}
  public static logger = debug('type-imagereader:browserify-middleware')
  public static debouncer = Debouncer.create()

  public static GetPaths (path: string): string[] {
    const exts = ['.js', '.ts', '']
    return exts.map(ext => path.replace(isCompileableExtension, '') + ext)
  }

  public static GetSystemPath = async (basePath: string, path: string): Promise<string | null> => {
    const test = async (testpath: string) => Imports.access(testpath).then(() => true).catch(() => false)
    const candidates = Functions.GetPaths(path)
      .map(candidate => join(basePath, candidate))
    const exists = await Promise.all(candidates.map(candidate => test(candidate)))
    return candidates.filter((_, i) => exists[i])[0] || null
  }

  public static CompileBundle (path: string): Promise<string|null> {
    return Imports.access(path)
      .then((): Promise<string> => new Promise((resolve, reject) => {
        const browser = Imports.browserify()
        browser.plugin('tsify')
        browser.plugin('common-shakeify', {
          ecmaVersion: 14
        })
        browser.transform('brfs')
        browser.add(path)
        browser.bundle((err, source) => {
          if (err) {
            reject(err)
          } else {
            resolve(source.toString())
          }
        })
      }))
      .then(src => Imports.minify(src))
      .then(minified => minified.code || null)
      .catch((err: any): Promise<string|null> => new Promise((resolve, reject) => {
        if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
          return resolve(null)
        }
        reject(err)
      }))
  }

  public static async CompileAndCache (basePath: string, mountedPath: string) {
    const realPath = await Functions.GetSystemPath(basePath, mountedPath)
    if (!realPath) return
    try {
      const paths = Functions.GetPaths(mountedPath)
      Functions.logger(`Begin compiling ${realPath}`)
      const code = Functions.CompileBundle(realPath)
      for (const path of paths) {
        Functions.browserified[path] = code
      }
      await code
      Functions.logger(`Compiled successfully ${realPath}`)
    } catch (err) {
      Functions.logger(`Compile for ${realPath} failed:`, err)
    }
  }

  public static async SendScript (basepath: string, path: string, res: Response) {
    const renderError = (code:StatusCodes, err: Error|String) => {
      if (err instanceof Error) {
        res.status(code).render('error', err)
      } else {
        res.status(code).render('error', { message: err })
      }
    }
    try {
      if (!Functions.browserified[path]) {
        await Functions.CompileAndCache(basepath, path)
      }
      const code = await Functions.browserified[path]
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

  public static async WatchFolder (basePath: string, mountPath: string, isFolder: boolean) {
    try {
      Functions.logger(`Watching ${mountPath} for Scripts`)
      const watcher = Imports.watch(join(basePath, mountPath), { persistent: false })
      for await (const event of watcher) {
        if (!event.filename) continue
        const scriptFile = isFolder ? mountPath : join(mountPath, event.filename)
        Functions.debouncer.debounce(scriptFile, async () => {
          Functions.logger(`${scriptFile} needs recompiling. ${event.eventType}`)
          await Functions.CompileAndCache(basePath, scriptFile)
        })
      }
    } catch (err: any) {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
        Functions.logger(`${mountPath} does not exist to watch`, err.message)
      } else {
        Functions.logger(`Watcher for ${mountPath} exited unexpectedly`, err)
      }
    }
  }

  public static async WatchAllFolders (basePath: string, watchDirs: string[]) {
    for (const dir of watchDirs) {
      try {
        for (const dirinfo of await Imports.readdir(join(basePath, dir), { withFileTypes: true })) {
          if (/^\./.test(dirinfo.name)) {
            continue
          }
          const target = join(dir, dirinfo.name)
          if (isCompileableExtension.test(dirinfo.name) || dirinfo.isDirectory()) {
            Functions.CompileAndCache(basePath, target)
          }
          if (dirinfo.isDirectory()) {
            Functions.WatchFolder(basePath, target, true)
          }
        }
        Functions.WatchFolder(basePath, dir, false)
      } catch (err: any) {
        if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
          Functions.logger(`${dir} does not exist to precompile scripts`, err.message)
        } else {
          Functions.logger(`Unexpected Error while precompiling ${dir} scripts`, err)
        }
      }
    }
  }
}

export interface Options {
  basePath: string
  watchPaths?: string[]
}

export default (options: Options) => {
  if (options.watchPaths && options.watchPaths.length) {
    Functions.WatchAllFolders(options.basePath, options.watchPaths)
  }
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method.toLowerCase() !== 'get' || !req.path.match(isCompileableExtension)) {
      return next()
    }
    if (normalize(req.path) !== req.path) {
      return res.status(StatusCodes.FORBIDDEN).render('error', { message: 'Directory Traversal Not Allowed!' })
    }
    try {
      await Functions.SendScript(options.basePath, req.path, res)
    } catch (err) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', { message: 'INTERNAL_SERVER_ERROR' })
    }
  }
}
