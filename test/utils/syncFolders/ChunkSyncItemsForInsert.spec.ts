'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'

describe('utils/syncfolders function ChunkSyncItemsForInsert()', () => {
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
    const result = Functions.ChunkSyncItemsForInsert(items)
    expect(result.files).to.equal(3)
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
    const result = Functions.ChunkSyncItemsForInsert(items)
    expect(result.dirs).to.equal(5)
  })
  it('should set dirname for root folder item', () => {
    const items = [{ path: '/foo', isFile: false }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.folder).to.equal('/')
  })
  it('should set dirname for non root folder item', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.folder).to.equal('/foo/')
  })
  it('should set path for root folder folder', () => {
    const items = [{ path: '/foo', isFile: false }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo/')
  })
  it('should set path for root folder file', () => {
    const items = [{ path: '/foo.bmp', isFile: true }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo.bmp')
  })
  it('should set path for non root folder folder', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo/bar/')
  })
  it('should set path for non root folder file', () => {
    const items = [{ path: '/foo/bar.jpg', isFile: true }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.path).to.equal('/foo/bar.jpg')
  })
  it('should set isFile for file', () => {
    const items = [{ path: '/foo/bar.jpg', isFile: true }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.isFile).to.equal(true)
  })
  it('should set isFile for folder', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.isFile).to.equal(false)
  })
  it('should set sort key', () => {
    const items = [{ path: '/foo/bar', isFile: false }]
    const result = Functions.ChunkSyncItemsForInsert(items).chunks[0]?.pop()
    expect(result?.sortKey).to.equal('bar')
  })
})
