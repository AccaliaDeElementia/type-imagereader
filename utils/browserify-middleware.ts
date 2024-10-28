'use sanity'

import type { Request, Response, NextFunction } from 'express'
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
  public static browserified: { [key: string]: Promise<string | null> } = {}
  public static logger = debug('type-imagereader:browserify-middleware')
  public static debouncer = Debouncer.create()

  public static GetPaths (path: string): string[] {
    const exts = ['.js', '.ts', '']
    return exts.map(ext => path.replace(isCompileableExtension, '') + ext)
  }

  public static GetSystemPath = async (basePath: string, path: string): Promise<string | null> => {
    const test = async (testpath: string): Promise<boolean> => await Imports.access(testpath).then(() => true).catch(() => false)
    const candidates = Functions.GetPaths(path)
      .map(candidate => join(basePath, candidate))
    const exists = await Promise.all(candidates.map(async candidate => await test(candidate)))
    return candidates.filter((_, i) => exists[i])[0] ?? null
  }

  public static async CompileBundle (path: string): Promise<string | null> {
    return await Imports.access(path)
      .then(async (): Promise<string> => await new Promise((resolve, reject) => {
        const browser = Imports.browserify()
        browser.plugin('tsify')
        browser.plugin('common-shakeify', {
          ecmaVersion: 14
        })
        browser.transform('brfs')
        browser.add(path)
        browser.bundle((err, source) => {
          if (err != null) {
            reject(err)
          } else {
            resolve(source.toString())
          }
        })
      }))
      .then(async src => await Imports.minify(src))
      .then(minified => minified.code ?? null)
      .catch(async (err: any): Promise<string | null> => await new Promise((resolve, reject) => {
        if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
          resolve(null)
        } else {
          reject(err)
        }
      }))
  }

  public static async CompileAndCache (basePath: string, mountedPath: string): Promise<void> {
    const realPath = await Functions.GetSystemPath(basePath, mountedPath)
    if (realPath == null || realPath.length < 1) return
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

  public static async SendScript (basepath: string, path: string, res: Response): Promise<void> {
    const renderError = (code: StatusCodes, err: Error | string): void => {
      if (err instanceof Error) {
        res.status(code).render('error', err)
      } else {
        res.status(code).render('error', { message: err })
      }
    }
    try {
      if (Functions.browserified[path] == null) {
        await Functions.CompileAndCache(basepath, path)
      }
      const code = await Functions.browserified[path]
      if (code == null || code.length < 1) {
        renderError(StatusCodes.NOT_FOUND, `Not Found: ${path}`)
      } else {
        res.status(StatusCodes.OK).contentType('application/javascript').send(code)
      }
    } catch (err: any) {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
        renderError(StatusCodes.NOT_FOUND, `Not Found: ${path}`)
      } else if (!(err instanceof Error)) {
        renderError(StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL SERVER ERROR')
      } else {
        renderError(StatusCodes.INTERNAL_SERVER_ERROR, err)
      }
    }
  }

  public static async WatchFolder (basePath: string, mountPath: string, isFolder: boolean): Promise<void> {
    try {
      Functions.logger(`Watching ${mountPath} for Scripts`)
      const watcher = Imports.watch(join(basePath, mountPath), { persistent: false })
      for await (const event of watcher) {
        if (event.filename == null) continue
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

  public static async WatchAllFolders (basePath: string, watchDirs: string[]): Promise<void> {
    for (const dir of watchDirs) {
      try {
        for (const dirinfo of await Imports.readdir(join(basePath, dir), { withFileTypes: true })) {
          if (/^\./.test(dirinfo.name)) {
            continue
          }
          const target = join(dir, dirinfo.name)
          if (isCompileableExtension.test(dirinfo.name) || dirinfo.isDirectory()) {
            Functions.CompileAndCache(basePath, target).catch(() => {})
          }
          if (dirinfo.isDirectory()) {
            Functions.WatchFolder(basePath, target, true).catch(() => {})
          }
        }
        Functions.WatchFolder(basePath, dir, false).catch(() => {})
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

export default (options: Options): (req: Request, res: Response, next: NextFunction) => Promise<void> => {
  if (options.watchPaths != null && options.watchPaths.length > 0) {
    Functions.WatchAllFolders(options.basePath, options.watchPaths).catch(() => {})
  }
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method.toLowerCase() !== 'get' || !isCompileableExtension.test(req.path)) {
      next()
      return
    }
    if (normalize(req.path) !== req.path) {
      res.status(StatusCodes.FORBIDDEN).render('error', { message: 'Directory Traversal Not Allowed!' })
      return
    }
    try {
      await Functions.SendScript(options.basePath, req.path, res)
    } catch (err) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', { message: 'INTERNAL_SERVER_ERROR' })
    }
  }
}
