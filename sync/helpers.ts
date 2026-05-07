'use sanity'

import { wordsToNumbers } from 'words-to-numbers'
import posix from 'node:path'
import { createHash } from 'node:crypto'

const ZERO = 0
const ONE = 1
const NUMBER_PAD_LENGTH = 20
const DEFAULT_CHUNK_SIZE = 5000
const TRAILING_SLASH_OFFSET = -1

export interface DirEntryItem {
  path: string
  isFile: boolean
}

export interface SyncItem {
  folder: string
  path: string
  isFile: boolean
  sortKey: string
  pathHash: string
}

export interface SyncItemRows {
  files: number
  dirs: number
  rows: SyncItem[]
}

interface RowCountResult {
  rowCount: number
}

export function isRowCountResult(obj: unknown): obj is RowCountResult {
  if (obj === null || typeof obj !== 'object') return false
  return 'rowCount' in obj && typeof obj.rowCount === 'number'
}

export const Functions = {
  ExtractInsertCount: (result: unknown): number => {
    if (isRowCountResult(result)) {
      return result.rowCount
    }
    if (result instanceof Array && result.length > ZERO && typeof result[ZERO] === 'number') {
      return result[ZERO]
    }
    return ZERO
  },
  padLength: NUMBER_PAD_LENGTH,
  ToSortKey: (key: string): string => {
    const zeroes = '0'.repeat(Functions.padLength)
    return `${wordsToNumbers(key.toLowerCase())}`.replace(/\d+/gv, (num) =>
      num.length >= Functions.padLength ? num : `${zeroes}${num}`.slice(-Functions.padLength),
    )
  },
  Chunk: <T>(arr: T[], size = DEFAULT_CHUNK_SIZE): T[][] => {
    const res = []
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size))
    }
    return res
  },
  ExecChunksSynchronously: async <T>(chunks: T[][], execFn: (chunk: T[]) => Promise<void>) => {
    for (const chunk of chunks) {
      //eslint-disable-next-line no-await-in-loop -- Deliberately doing this synchronously
      await execFn(chunk)
    }
  },
  BuildSyncItemRows: (items: DirEntryItem[]): SyncItemRows => {
    let files = ZERO
    let dirs = ZERO
    const rows = items.map((item) => {
      if (item.isFile) {
        files += ONE
      } else {
        dirs += ONE
      }
      let folder = posix.dirname(item.path)
      if (folder !== posix.sep) {
        folder += posix.sep
      }
      const path = item.path + (item.isFile ? '' : posix.sep)
      return {
        folder,
        path,
        isFile: item.isFile,
        sortKey: Functions.ToSortKey(posix.basename(item.path)),
        pathHash: createHash('sha512').update(path).digest('base64'),
      }
    })
    return { files, dirs, rows }
  },
  FormatSyncItemCsv: (row: SyncItem): string => {
    const q = (value: string): string => `"${value.replaceAll('"', '""')}"`
    return `${q(row.folder)},${q(row.path)},${row.isFile ? 't' : 'f'},${q(row.sortKey)},${q(row.pathHash)}\n`
  },
  AddFolderAndAncestors: (affected: Set<string>, folderPath: string): void => {
    let current = folderPath
    while (true) {
      affected.add(current)
      if (current === posix.sep) return
      const parent = posix.dirname(current.slice(ZERO, TRAILING_SLASH_OFFSET))
      current = parent === posix.sep ? posix.sep : parent + posix.sep
    }
  },
}
