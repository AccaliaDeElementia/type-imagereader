'use sanity'

import { readdir } from 'fs/promises'
import { Dirent } from 'fs'
import { join, extname } from 'path'

const allowedExtensions = /^(jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/i

async function fsWalker (root: string, eachItem: (items:{path: string, isFile: boolean}[], queuelength: Number)=> Promise<void>) {
  const queue = ['/']
  if (!eachItem) {
    eachItem = () => Promise.resolve()
  }
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) {
      continue
    }
    const items: Dirent[] = await readdir(join(root, current), {
      encoding: 'utf8',
      withFileTypes: true
    })
    await eachItem(items
      .filter(item => item.isDirectory()
        ? item.name[0] !== '.'
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

export default fsWalker
