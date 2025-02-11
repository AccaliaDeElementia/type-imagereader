'use sanity'

import { readdir } from 'fs/promises'
import type { Dirent } from 'fs'
import { join, extname } from 'path'
import assert from 'assert'

const allowedExtensions = /^(jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/i

async function fsWalker (root: string, eachItem: (items: Array<{ path: string, isFile: boolean }>, queuelength: number) => Promise<void>): Promise<void> {
  const queue = ['/']
  while (queue.length > 0) {
    const current = queue.shift()
    assert(current !== undefined)
    const items: Dirent[] = await fsWalker.fn.readdir(join(root, current), {
      encoding: 'utf8',
      withFileTypes: true
    })
    await eachItem(items
      .filter(item => item.isDirectory()
        ? !item.name.startsWith('.')
        : allowedExtensions.test(extname(item.name).slice(1)))
      .map(item => {
        const path = join(current, item.name)
        if (item.isDirectory()) {
          queue.push(path)
        }
        return { path, isFile: !item.isDirectory() }
      }), queue.length)
  }
}

fsWalker.fn = {
  readdir
}

export default fsWalker
