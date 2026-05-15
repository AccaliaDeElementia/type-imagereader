'use sanity'

import { normalize, dirname, sep } from 'node:path'

export function isPathTraversal(path: string): boolean {
  return normalize(path) !== path
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
  return path === sep ? sep : `${path}${sep}`
}
