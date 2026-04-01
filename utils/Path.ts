'use sanity'

import { normalize, dirname, sep } from 'node:path'

export function isPathTraversal(path: string): boolean {
  return normalize(path) !== path || path.startsWith('/~')
}

export function GetParentFolders(path: string): string[] {
  const results = []
  let current = path
  while (current !== sep) {
    current = normalize(dirname(current) + sep)
    results.push(current)
  }
  return results
}
