'use sanity'

import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join, extname } from 'node:path'
import assert from 'node:assert'
import { HasValues } from './helpers'

const allowedExtensions = /^\.(?:jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/iv

async function processQueueItem(
  root: string,
  queue: string[],
  eachItem: (items: Array<{ path: string; isFile: boolean }>, queuelength: number) => Promise<void>,
): Promise<void> {
  const current = queue.shift()
  assert(current !== undefined)
  const items: Dirent[] = await fsWalker.fn.readdir(join(root, current), {
    encoding: 'utf8',
    withFileTypes: true,
  })
  await eachItem(
    items
      .filter((item) => (item.isDirectory() ? !item.name.startsWith('.') : allowedExtensions.test(extname(item.name))))
      .map((item) => {
        const path = join(current, item.name)
        if (item.isDirectory()) {
          queue.push(path)
        }
        return { path, isFile: !item.isDirectory() }
      }),
    queue.length,
  )
}

async function fsWalker(
  root: string,
  eachItem: (items: Array<{ path: string; isFile: boolean }>, queuelength: number) => Promise<void>,
): Promise<void> {
  const queue = ['/']
  while (HasValues(queue)) {
    // TODO: See if there's a different model for this walk that doesnt' have it awaiting in a loop
    // eslint-disable-next-line no-await-in-loop -- This walk should be synchronously async, right?
    await processQueueItem(root, queue, eachItem)
  }
}

fsWalker.fn = {
  readdir,
}

export default fsWalker
