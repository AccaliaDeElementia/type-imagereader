'use sanity'

import { buildAssetVersions } from '#utils/assetVersions.js'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EXPECTED_HASH_LENGTH = 8

describe('utils/assetVersions buildAssetVersions()', () => {
  let dir = ''
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'asset-versions-'))
  })
  afterEach(() => {
    if (dir !== '') rmSync(dir, { recursive: true, force: true })
  })
  it('should return an empty map for an empty directory', () => {
    expect(buildAssetVersions(dir)).toEqual({})
  })
  it('should include a top-level file keyed by /name', () => {
    writeFileSync(join(dir, 'a.txt'), 'hello')
    expect(Object.keys(buildAssetVersions(dir))).toEqual(['/a.txt'])
  })
  it('should include nested files keyed by /dir/name', () => {
    mkdirSync(join(dir, 'scripts'))
    writeFileSync(join(dir, 'scripts', 'app.js'), 'console.log("hi")')
    expect(Object.keys(buildAssetVersions(dir))).toEqual(['/scripts/app.js'])
  })
  it('should include files multiple levels deep', () => {
    mkdirSync(join(dir, 'a', 'b'), { recursive: true })
    writeFileSync(join(dir, 'a', 'b', 'c.txt'), 'deep')
    expect(Object.keys(buildAssetVersions(dir))).toEqual(['/a/b/c.txt'])
  })
  it('should hash distinct contents to distinct values', () => {
    writeFileSync(join(dir, 'a.txt'), 'one')
    writeFileSync(join(dir, 'b.txt'), 'two')
    const versions = buildAssetVersions(dir)
    expect(versions['/a.txt']).not.toBe(versions['/b.txt'])
  })
  it('should hash identical contents to identical values', () => {
    writeFileSync(join(dir, 'a.txt'), 'same')
    writeFileSync(join(dir, 'b.txt'), 'same')
    const versions = buildAssetVersions(dir)
    expect(versions['/a.txt']).toBe(versions['/b.txt'])
  })
  it('should produce an 8-character hash', () => {
    writeFileSync(join(dir, 'a.txt'), 'whatever')
    expect(buildAssetVersions(dir)['/a.txt']?.length).toBe(EXPECTED_HASH_LENGTH)
  })
})
