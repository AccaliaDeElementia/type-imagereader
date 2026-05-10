'use sanity'

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'

const BUILD_TIMEOUT_MS = 60_000

// Mirrors `build:client` in package.json. Update both together if the
// production build invocation changes.
const ESBUILD_ARGS = [
  'esbuild',
  'app=public/scripts/app/main.ts',
  'slideshow=public/scripts/slideshow/main.ts',
  '--bundle',
  '--minify',
  '--target=es2024',
  '--format=iife',
  '--sourcemap',
]

describe(
  'client bundle build smoke',
  () => {
    let outdir = ''
    let exitCode: number | null = null

    beforeAll(async () => {
      outdir = mkdtempSync(join(tmpdir(), 'imagereader-bundle-'))
      const child = spawn('npx', [...ESBUILD_ARGS, `--outdir=${outdir}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      await once(child, 'exit')
      exitCode = child.exitCode
    })

    afterAll(() => {
      if (outdir !== '') rmSync(outdir, { recursive: true, force: true })
    })

    it('should exit 0 from esbuild', () => {
      expect(exitCode).toBe(0)
    })

    it('should produce app.js bundle', () => {
      expect(existsSync(join(outdir, 'app.js'))).toBe(true)
    })

    it('should produce slideshow.js bundle', () => {
      expect(existsSync(join(outdir, 'slideshow.js'))).toBe(true)
    })
  },
  BUILD_TIMEOUT_MS,
)
