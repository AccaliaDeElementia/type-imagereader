'use sanity'

import { buildSyncItemRows } from '#sync/helpers.js'

describe('sync/helpers buildSyncItemRows()', () => {
  it('should count files in input', () => {
    const items = [
      { path: '/foo', isFile: false },
      { path: '/bar', isFile: false },
      { path: '/baz', isFile: false },
      { path: '/foo.jpg', isFile: true },
      { path: '/bar.png', isFile: true },
      { path: '/baz.gif', isFile: true },
      { path: '/quux', isFile: false },
      { path: '/quuux', isFile: false },
    ]
    const result = buildSyncItemRows(items)
    expect(result.files).toBe(3)
  })
  it('should count dirs in input', () => {
    const items = [
      { path: '/foo', isFile: false },
      { path: '/bar', isFile: false },
      { path: '/baz', isFile: false },
      { path: '/foo.jpg', isFile: true },
      { path: '/bar.png', isFile: true },
      { path: '/baz.gif', isFile: true },
      { path: '/quux', isFile: false },
      { path: '/quuux', isFile: false },
    ]
    const result = buildSyncItemRows(items)
    expect(result.dirs).toBe(5)
  })
  it('should return one row per input item', () => {
    const items = [
      { path: '/a.jpg', isFile: true },
      { path: '/b.jpg', isFile: true },
      { path: '/c', isFile: false },
    ]
    const result = buildSyncItemRows(items)
    expect(result.rows).toHaveLength(3)
  })
  it('should set dirname for root folder item', () => {
    const items = [{ path: '/foo', isFile: false }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.folder).toBe('/')
  })
  it('should set dirname for non root folder item', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.folder).toBe('/foo/')
  })
  it('should set path for root folder folder', () => {
    const items = [{ path: '/foo', isFile: false }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.path).toBe('/foo/')
  })
  it('should set path for root folder file', () => {
    const items = [{ path: '/foo.bmp', isFile: true }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.path).toBe('/foo.bmp')
  })
  it('should set path for non root folder folder', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.path).toBe('/foo/bar/')
  })
  it('should set path for non root folder file', () => {
    const items = [{ path: '/foo/bar.jpg', isFile: true }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.path).toBe('/foo/bar.jpg')
  })
  it('should set isFile for file', () => {
    const items = [{ path: '/foo/bar.jpg', isFile: true }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.isFile).toBe(true)
  })
  it('should set isFile for folder', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.isFile).toBe(false)
  })
  it('should set sort key', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = buildSyncItemRows(items).rows.pop()
    expect(result?.sortKey).toBe('bar')
  })
})
