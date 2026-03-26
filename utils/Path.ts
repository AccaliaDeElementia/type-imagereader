'use sanity'

import { normalize, dirname, sep } from 'node:path'

export function isPathTraversal(path: string): boolean {
  return normalize(path) !== path || path.startsWith('/~')
}

export function GetParentFolders(path: string): string[] {
  const results = []
  let parent = path
  while (parent !== sep) {
    parent = normalize(dirname(parent) + sep)
    results.push(parent)
  }
  return results
}
