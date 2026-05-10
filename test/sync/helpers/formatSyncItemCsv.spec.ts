'use sanity'

import { formatSyncItemCsv } from '#sync/helpers.js'

const baseRow = {
  folder: '/',
  path: '/foo.jpg',
  isFile: true,
  sortKey: 'foo',
  pathHash: 'abc123',
}

describe('sync/helpers formatSyncItemCsv()', () => {
  it('should terminate the row with a newline', () => {
    expect(formatSyncItemCsv(baseRow).endsWith('\n')).toBe(true)
  })
  it('should emit exactly one newline per row', () => {
    expect(formatSyncItemCsv(baseRow).split('\n')).toHaveLength(2)
  })
  it('should wrap the folder field in double quotes', () => {
    const parts = formatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[0]).toBe('"/"')
  })
  it('should wrap the path field in double quotes', () => {
    const parts = formatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[1]).toBe('"/foo.jpg"')
  })
  it('should emit t for isFile true', () => {
    const parts = formatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[2]).toBe('t')
  })
  it('should emit f for isFile false', () => {
    const parts = formatSyncItemCsv({ ...baseRow, isFile: false })
      .trim()
      .split(',')
    expect(parts[2]).toBe('f')
  })
  it('should wrap the sortKey field in double quotes', () => {
    const parts = formatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[3]).toBe('"foo"')
  })
  it('should wrap the pathHash field in double quotes', () => {
    const parts = formatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[4]).toBe('"abc123"')
  })
  it('should double inner double quotes when they appear in the folder', () => {
    const row = { ...baseRow, folder: '/pre"fix/' }
    expect(formatSyncItemCsv(row)).toContain('"/pre""fix/"')
  })
  it('should double inner double quotes when they appear in the path', () => {
    const row = { ...baseRow, path: '/a"b.jpg' }
    expect(formatSyncItemCsv(row)).toContain('"/a""b.jpg"')
  })
  it('should preserve commas inside quoted fields without extra escaping', () => {
    const row = { ...baseRow, path: '/a,b.jpg' }
    expect(formatSyncItemCsv(row)).toContain('"/a,b.jpg"')
  })
})
