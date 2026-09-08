'use sanity'

import { isProcessEntryPoint } from '#app.js'

const ENTRY_FILE = '/srv/type-imagereader/app.ts'
const ENTRY_DIR = '/srv/type-imagereader'

describe('app isProcessEntryPoint()', () => {
  it('should be true when node was pointed at the entry file itself', () => {
    expect(isProcessEntryPoint(ENTRY_FILE, ENTRY_FILE, ENTRY_DIR)).toBe(true)
  })
  it('should be true when node was pointed at the entry directory', () => {
    expect(isProcessEntryPoint(ENTRY_DIR, ENTRY_FILE, ENTRY_DIR)).toBe(true)
  })
  it('should be true for a relative invocation that resolves to the entry file', () => {
    expect(isProcessEntryPoint('./app.ts', `${process.cwd()}/app.ts`, process.cwd())).toBe(true)
  })
  it('should be false when a test runner is the entry', () => {
    expect(isProcessEntryPoint('/srv/type-imagereader/node_modules/.bin/vitest', ENTRY_FILE, ENTRY_DIR)).toBe(false)
  })
  it('should be false when argv carries no entry at all', () => {
    expect(isProcessEntryPoint(undefined, ENTRY_FILE, ENTRY_DIR)).toBe(false)
  })
})
