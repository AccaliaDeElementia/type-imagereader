'use sanity'

import { build, context, type BuildOptions } from 'esbuild'

const ES_TARGET = 'es2024'

const entryPoints: Record<string, string> = {
  app: 'public/scripts/app/index.ts',
  slideshow: 'public/scripts/slideshow/index.ts',
}

const baseOptions: BuildOptions = {
  entryPoints,
  bundle: true,
  target: ES_TARGET,
  format: 'iife',
  outdir: 'dist/scripts',
}

export async function buildOnce(): Promise<void> {
  await build({
    ...baseOptions,
    minify: true,
  })
}

export async function buildWatch(): Promise<void> {
  const ctx = await context({
    ...baseOptions,
    minify: false,
    sourcemap: 'inline',
  })
  await ctx.watch()
  console.log('[esbuild] watching for changes...')
}

const [, , mode] = process.argv
if (mode === 'watch') {
  buildWatch().catch(console.error)
} else {
  buildOnce().catch(console.error)
}
