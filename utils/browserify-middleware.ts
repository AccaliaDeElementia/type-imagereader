'use sanity'

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'

import { promisify } from 'node:util'
import { join, normalize } from 'node:path'
import { readdir, watch, access } from 'node:fs/promises'

import browserify from 'browserify'
import { minify } from 'terser'

import { Debouncer } from './debounce'

import debug from 'debug'

const isCompileableExtension = /\.[jt]s$/

export const Imports = { access, watch, readdir, browserify, minify }

function isError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}

function isErrorWithCode(error: unknown, ...codes: string[]): error is NodeJS.ErrnoException {
  return isError(error) && codes.find((code) => code === error.code) !== undefined
}

function unknownToError(err: unknown, message: string): Error {
  if (err instanceof Error) {
    return err
  }
  return new Error(message)
}

const createCache = (): Record<string, Promise<string | null>> => ({})
export const Functions = {
  browserified: createCache(),
  logger: debug('type-imagereader:browserify-middleware'),
  debouncer: new Debouncer(),
  GetPaths: (path: string): string[] => {
    const exts = ['.js', '.ts', '']
    return exts.map((ext) => path.replace(isCompileableExtension, '') + ext)
  },
  GetSystemPath: async (basePath: string, path: string): Promise<string | null> => {
    const test = async (testpath: string): Promise<boolean> =>
      await Imports.access(testpath)
        .then(() => true)
        .catch(() => false)
    const candidates = Functions.GetPaths(path).map((candidate) => join(basePath, candidate))
    const exists = await Promise.all(candidates.map(async (candidate) => await test(candidate)))
    return candidates.find((_, i) => exists[i] === true) ?? null
  },
  CompileBundle: async (path: string): Promise<string | null> =>
    await Imports.access(path)
      .then(async (): Promise<string> => {
        const browser = Imports.browserify()
        browser.plugin('tsify')
        browser.plugin('common-shakeify', {
          ecmaVersion: 14,
        })
        browser.transform('brfs')
        browser.add(path)
        const source = await promisify(browser.bundle.bind(browser))()
        return source.toString()
      })
      .then(async (src) => await Imports.minify(src))
      .then((minified) => minified.code ?? null)
      .catch(async (err: unknown): Promise<string | null> => {
        if (isErrorWithCode(err, 'MODULE_NOT_FOUND', 'ENOENT')) {
          return await Promise.resolve(null)
        } else {
          return await Promise.reject(unknownToError(err, 'Compile Error'))
        }
      }),
  CompileAndCache: async (basePath: string, mountedPath: string): Promise<void> => {
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
  },
  SendScript: async (basepath: string, path: string, res: Response): Promise<void> => {
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
    } catch (err: unknown) {
      if (isErrorWithCode(err, 'MODULE_NOT_FOUND', 'ENOENT')) {
        renderError(StatusCodes.NOT_FOUND, `Not Found: ${path}`)
      } else if (err instanceof Error) {
        renderError(StatusCodes.INTERNAL_SERVER_ERROR, err)
      } else {
        renderError(StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL SERVER ERROR')
      }
    }
  },
  WatchFolder: async (basePath: string, mountPath: string, isFolder: boolean): Promise<void> => {
    try {
      Functions.logger(`Watching ${mountPath} for Scripts`)
      const watcher = Imports.watch(join(basePath, mountPath), {
        persistent: false,
      })
      for await (const event of watcher) {
        if (event.filename == null) continue
        const scriptFile = isFolder ? mountPath : join(mountPath, event.filename)
        Functions.debouncer.debounce(scriptFile, async () => {
          Functions.logger(`${scriptFile} needs recompiling. ${event.eventType}`)
          await Functions.CompileAndCache(basePath, scriptFile)
        })
      }
    } catch (err: unknown) {
      if (isErrorWithCode(err, 'MODULE_NOT_FOUND', 'ENOENT')) {
        Functions.logger(`${mountPath} does not exist to watch`, err.message)
      } else {
        Functions.logger(`Watcher for ${mountPath} exited unexpectedly`, err)
      }
    }
  },
  WatchAllFolders: async (basePath: string, watchDirs: string[]): Promise<void> => {
    for (const dir of watchDirs) {
      try {
        for (const dirinfo of await Imports.readdir(join(basePath, dir), {
          withFileTypes: true,
        })) {
          if (dirinfo.name.startsWith('.')) {
            continue
          }
          const target = join(dir, dirinfo.name)
          if (isCompileableExtension.test(dirinfo.name) || dirinfo.isDirectory()) {
            Functions.CompileAndCache(basePath, target).catch(() => null)
          }
          if (dirinfo.isDirectory()) {
            Functions.WatchFolder(basePath, target, true).catch(() => null)
          }
        }
        Functions.WatchFolder(basePath, dir, false).catch(() => null)
      } catch (err: unknown) {
        if (isErrorWithCode(err, 'MODULE_NOT_FOUND', 'ENOENT')) {
          Functions.logger(`${dir} does not exist to precompile scripts`, err.message)
        } else {
          Functions.logger(`Unexpected Error while precompiling ${dir} scripts`, err)
        }
      }
    }
  },
}

export interface Options {
  basePath: string
  watchPaths?: string[]
}

export default (options: Options): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  if (options.watchPaths != null && options.watchPaths.length > 0) {
    Functions.WatchAllFolders(options.basePath, options.watchPaths).catch(() => null)
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
