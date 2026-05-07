'use sanity'

import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join, extname } from 'node:path'
import assert from 'node:assert'

const allowedExtensions = /^\.(?:jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/iv
const DEFAULT_CONCURRENCY = 8
const ZERO = 0
const ONE = 1

type EachItemFn = (items: Array<{ path: string; isFile: boolean }>, queuelength: number) => Promise<void>

async function processDir(root: string, current: string, queue: string[], eachItem: EachItemFn): Promise<void> {
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

async function fsWalker(root: string, eachItem: EachItemFn): Promise<void> {
  const queue = ['/']
  const concurrency = fsWalker.concurrency
  let active = ZERO
  let aborted = false
  let failure: unknown = null
  const waiters: Array<() => void> = []

  const notify = (): void => {
    while (waiters.length > ZERO) {
      const resume = waiters.shift()
      resume?.()
    }
  }

  const waitForWork = async (): Promise<void> => {
    const { promise, resolve } = Promise.withResolvers<undefined>()
    waiters.push(() => {
      resolve(undefined)
    })
    await promise
  }

  const worker = async (): Promise<void> => {
    while (true) {
      while (queue.length === ZERO) {
        if (aborted) return
        if (active === ZERO) {
          notify()
          return
        }
        //eslint-disable-next-line no-await-in-loop -- worker-pool coordination
        await waitForWork()
      }
      if (aborted) return
      const current = queue.shift()
      assert(current !== undefined)
      active += ONE
      try {
        //eslint-disable-next-line no-await-in-loop -- per-worker sequential processing
        await processDir(root, current, queue, eachItem)
      } catch (err) {
        //eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- concurrent peer may have set aborted
        if (!aborted) {
          aborted = true
          failure = err
        }
      } finally {
        active -= ONE
        notify()
      }
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      await worker()
    }),
  )
  if (failure !== null) {
    //eslint-disable-next-line @typescript-eslint/only-throw-error -- preserve original rejection value
    throw failure
  }
}

fsWalker.fn = {
  readdir,
}
fsWalker.concurrency = DEFAULT_CONCURRENCY

export default fsWalker
