'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/filewatcher.js'
import type { Changeset } from '#utils/filewatcher.js'

describe('utils/filewatcher Functions', () => {
  describe('isImagePath()', () => {
    it('should return true for .jpg', () => {
      expect(Functions.isImagePath('/foo/bar.jpg')).to.equal(true)
    })
    it('should return true for .JPEG', () => {
      expect(Functions.isImagePath('/foo/bar.JPEG')).to.equal(true)
    })
    it('should return true for .png', () => {
      expect(Functions.isImagePath('/foo/bar.png')).to.equal(true)
    })
    it('should return true for .webp', () => {
      expect(Functions.isImagePath('/foo/bar.webp')).to.equal(true)
    })
    it('should return true for .gif', () => {
      expect(Functions.isImagePath('/foo/bar.gif')).to.equal(true)
    })
    it('should return true for .svg', () => {
      expect(Functions.isImagePath('/foo/bar.svg')).to.equal(true)
    })
    it('should return true for .tif', () => {
      expect(Functions.isImagePath('/foo/bar.tif')).to.equal(true)
    })
    it('should return true for .tiff', () => {
      expect(Functions.isImagePath('/foo/bar.tiff')).to.equal(true)
    })
    it('should return true for .bmp', () => {
      expect(Functions.isImagePath('/foo/bar.bmp')).to.equal(true)
    })
    it('should return true for .jfif', () => {
      expect(Functions.isImagePath('/foo/bar.jfif')).to.equal(true)
    })
    it('should return true for .jpe', () => {
      expect(Functions.isImagePath('/foo/bar.jpe')).to.equal(true)
    })
    it('should return false for .txt', () => {
      expect(Functions.isImagePath('/foo/bar.txt')).to.equal(false)
    })
    it('should return false for .mp4', () => {
      expect(Functions.isImagePath('/foo/bar.mp4')).to.equal(false)
    })
    it('should return false for no extension', () => {
      expect(Functions.isImagePath('/foo/bar')).to.equal(false)
    })
  })

  describe('isHiddenPath()', () => {
    it('should return true for path starting with dot segment', () => {
      expect(Functions.isHiddenPath('/.hidden/foo.jpg')).to.equal(true)
    })
    it('should return true for path with hidden directory in middle', () => {
      expect(Functions.isHiddenPath('/foo/.hidden/bar.jpg')).to.equal(true)
    })
    it('should return false for normal path', () => {
      expect(Functions.isHiddenPath('/foo/bar/baz.jpg')).to.equal(false)
    })
    it('should return false for path with dot in filename', () => {
      expect(Functions.isHiddenPath('/foo/bar.baz.jpg')).to.equal(false)
    })
  })

  describe('toRelativePath()', () => {
    it('should produce posix-style relative path with leading slash', () => {
      expect(Functions.toRelativePath('/data', '/data/comics/book/page.jpg')).to.equal('/comics/book/page.jpg')
    })
    it('should handle root-level file', () => {
      expect(Functions.toRelativePath('/data', '/data/image.jpg')).to.equal('/image.jpg')
    })
  })

  describe('isDirPath()', () => {
    it('should return true for path with no extension', () => {
      expect(Functions.isDirPath('/foo/bar')).to.equal(true)
    })
    it('should return false for path with image extension', () => {
      expect(Functions.isDirPath('/foo/bar.jpg')).to.equal(false)
    })
    it('should return false for path with non-image extension', () => {
      expect(Functions.isDirPath('/foo/bar.txt')).to.equal(false)
    })
  })

  describe('processEvents()', () => {
    it('should add create events to changeset', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'create', path: '/data/foo.jpg' }], changeset)
      expect(changeset.get('/foo.jpg')).to.equal('create')
    })
    it('should add delete events to changeset', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'delete', path: '/data/foo.jpg' }], changeset)
      expect(changeset.get('/foo.jpg')).to.equal('delete')
    })
    it('should ignore update events', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'update', path: '/data/foo.jpg' }], changeset)
      expect(changeset.size).to.equal(0)
    })
    it('should ignore hidden paths', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'create', path: '/data/.hidden/foo.jpg' }], changeset)
      expect(changeset.size).to.equal(0)
    })
    it('should ignore non-image files', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'create', path: '/data/readme.txt' }], changeset)
      expect(changeset.size).to.equal(0)
    })
    it('should process multiple events', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents(
        '/data',
        [
          { type: 'create', path: '/data/a.jpg' },
          { type: 'delete', path: '/data/b.png' },
          { type: 'update', path: '/data/c.gif' },
        ],
        changeset,
      )
      expect(changeset.size).to.equal(2)
    })
    it('should overwrite earlier event for same path with later event', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents(
        '/data',
        [
          { type: 'create', path: '/data/a.jpg' },
          { type: 'delete', path: '/data/a.jpg' },
        ],
        changeset,
      )
      expect(changeset.get('/a.jpg')).to.equal('delete')
    })
    it('should add dir-create for extensionless create event', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'create', path: '/data/comics' }], changeset)
      expect(changeset.get('/comics/')).to.equal('dir-create')
    })
    it('should add dir-delete for extensionless delete event', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'delete', path: '/data/comics' }], changeset)
      expect(changeset.get('/comics/')).to.equal('dir-delete')
    })
    it('should store directory paths with trailing slash', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'create', path: '/data/a/b' }], changeset)
      expect(changeset.has('/a/b/')).to.equal(true)
    })
    it('should ignore hidden directory events', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'create', path: '/data/.hidden' }], changeset)
      expect(changeset.size).to.equal(0)
    })
    it('should ignore update events for directories', () => {
      const changeset = new Map() as Changeset
      Functions.processEvents('/data', [{ type: 'update', path: '/data/comics' }], changeset)
      expect(changeset.size).to.equal(0)
    })
  })
})
