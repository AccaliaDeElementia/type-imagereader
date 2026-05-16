'use sanity'

import { normalize, dirname, sep } from 'node:path'
import type { Debugger } from 'debug'

export function isPathTraversal(path: string): boolean {
  return normalize(path) !== path
}

export function isBlockedTraversal(logger: Debugger, path: string): boolean {
  if (!isPathTraversal(path)) return false
  logger('path traversal blocked: %s', path)
  return true
}

export function getParentFolders(path: string): string[] {
  const results = []
  let current = path
  while (current !== sep) {
    current = normalize(dirname(current) + sep)
    results.push(current)
  }
  return results
}

export function toFolderPath(path: string): string {
  return path.endsWith(sep) ? path : `${path}${sep}`
}
