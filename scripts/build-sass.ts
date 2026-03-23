'use sanity'

import sass from 'sass'
import { writeFile, watch, mkdir } from 'node:fs/promises'

const INPUT_DIR = 'public/stylesheets'
const OUTPUT_DIR = 'dist/stylesheets'

const sassExtension = /\.s[ca]ss$/v

const entryPoints: Record<string, string> = {
  bundle: `${INPUT_DIR}/bundle.sass`,
  slideshow: `${INPUT_DIR}/slideshow.sass`,
}

async function compileAll(compressed: boolean): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true })
  await Promise.all(
    Object.entries(entryPoints).map(async ([name, input]) => {
      const result = await sass.compileAsync(input, {
        style: compressed ? 'compressed' : 'expanded',
      })
      await writeFile(`${OUTPUT_DIR}/${name}.css`, result.css)
    }),
  )
}

export async function buildOnce(): Promise<void> {
  await compileAll(true)
}

export async function buildWatch(): Promise<void> {
  await compileAll(false)
  console.log('[sass] watching for changes...')
  const watcher = watch(INPUT_DIR)
  for await (const event of watcher) {
    if (event.filename === null || !sassExtension.test(event.filename)) continue
    console.log(`[sass] ${event.filename} changed, recompiling...`)
    // eslint-disable-next-line no-await-in-loop -- Deliberately recompiling synchronously on each change
    await compileAll(false)
  }
}

const [, , mode] = process.argv
if (mode === 'watch') {
  buildWatch().catch(console.error)
} else {
  buildOnce().catch(console.error)
}
