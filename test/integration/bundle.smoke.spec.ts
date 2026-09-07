'use sanity'

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { isDictionary } from '#utils/typeGuards.js'

const BUILD_TIMEOUT_MS = 60_000

const readBuildClientScript = (): string => {
  const parsed: unknown = JSON.parse(readFileSync('package.json', 'utf8'))
  if (!isDictionary(parsed) || !isDictionary(parsed.scripts) || typeof parsed.scripts['build:client'] !== 'string') {
    throw new Error('package.json is missing scripts.build:client')
  }
  return parsed.scripts['build:client']
}
const ESBUILD_ARGS = readBuildClientScript()
  .split(' ')
  .filter((arg) => !arg.startsWith('--outdir='))

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
