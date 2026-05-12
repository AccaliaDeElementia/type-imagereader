'use sanity'

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const HASH_START = 0
const HASH_LENGTH = 8

function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(HASH_START, HASH_LENGTH)
}

export function buildAssetVersions(distDir: string): Record<string, string> {
  const out: Record<string, string> = {}
  function walk(rel: string): void {
    const abs = rel === '' ? distDir : join(distDir, rel)
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        walk(childRel)
      } else {
        out[`/${childRel}`] = hashFile(join(distDir, childRel))
      }
    }
  }
  walk('')
  return out
}

export function assetUrl(versions: Record<string, string>, urlPath: string): string {
  const version = versions[urlPath]
  if (version === undefined) return urlPath
  return `${urlPath}?v=${version}`
}
