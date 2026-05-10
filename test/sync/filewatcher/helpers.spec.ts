'use sanity'

import { isImagePath, isHiddenPath, toRelativePath, isDirPath, processEvents } from '#sync/filewatcher.js'
import type { Changeset } from '#sync/filewatcher.js'

describe('sync/filewatcher helpers', () => {
  describe('isImagePath()', () => {
    const imageExtensions = ['jpg', 'JPEG', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff', 'bmp', 'jfif', 'jpe']
    imageExtensions.forEach((ext) => {
      it(`should return true for .${ext}`, () => {
        expect(isImagePath(`/foo/bar.${ext}`)).toBe(true)
      })
    })

    const nonImageExtensions = ['txt', 'mp4']
    nonImageExtensions.forEach((ext) => {
      it(`should return false for .${ext}`, () => {
        expect(isImagePath(`/foo/bar.${ext}`)).toBe(false)
      })
    })

    it('should return false for no extension', () => {
      expect(isImagePath('/foo/bar')).toBe(false)
    })
  })

  describe('isHiddenPath()', () => {
    it('should return true for path starting with dot segment', () => {
      expect(isHiddenPath('/.hidden/foo.jpg')).toBe(true)
    })
    it('should return true for path with hidden directory in middle', () => {
      expect(isHiddenPath('/foo/.hidden/bar.jpg')).toBe(true)
    })
    it('should return false for normal path', () => {
      expect(isHiddenPath('/foo/bar/baz.jpg')).toBe(false)
    })
    it('should return false for path with dot in filename', () => {
      expect(isHiddenPath('/foo/bar.baz.jpg')).toBe(false)
    })
  })

  describe('toRelativePath()', () => {
    it('should produce posix-style relative path with leading slash', () => {
      expect(toRelativePath('/data', '/data/comics/book/page.jpg')).toBe('/comics/book/page.jpg')
    })
    it('should handle root-level file', () => {
      expect(toRelativePath('/data', '/data/image.jpg')).toBe('/image.jpg')
    })
  })

  describe('isDirPath()', () => {
    it('should return true for path with no extension', () => {
      expect(isDirPath('/foo/bar')).toBe(true)
    })
    it('should return false for path with image extension', () => {
      expect(isDirPath('/foo/bar.jpg')).toBe(false)
    })
    it('should return false for path with non-image extension', () => {
      expect(isDirPath('/foo/bar.txt')).toBe(false)
    })
  })

  describe('processEvents()', () => {
    it('should add create events to changeset', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'create', path: '/data/foo.jpg' }], changeset)
      expect(changeset.get('/foo.jpg')).toBe('create')
    })
    it('should add delete events to changeset', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'delete', path: '/data/foo.jpg' }], changeset)
      expect(changeset.get('/foo.jpg')).toBe('delete')
    })
    it('should ignore update events', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'update', path: '/data/foo.jpg' }], changeset)
      expect(changeset.size).toBe(0)
    })
    it('should ignore hidden paths', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'create', path: '/data/.hidden/foo.jpg' }], changeset)
      expect(changeset.size).toBe(0)
    })
    it('should ignore non-image files', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'create', path: '/data/readme.txt' }], changeset)
      expect(changeset.size).toBe(0)
    })
    it('should process multiple events', () => {
      const changeset = new Map() as Changeset
      processEvents(
        '/data',
        [
          { type: 'create', path: '/data/a.jpg' },
          { type: 'delete', path: '/data/b.png' },
          { type: 'update', path: '/data/c.gif' },
        ],
        changeset,
      )
      expect(changeset.size).toBe(2)
    })
    it('should overwrite earlier event for same path with later event', () => {
      const changeset = new Map() as Changeset
      processEvents(
        '/data',
        [
          { type: 'create', path: '/data/a.jpg' },
          { type: 'delete', path: '/data/a.jpg' },
        ],
        changeset,
      )
      expect(changeset.get('/a.jpg')).toBe('delete')
    })
    it('should add dir-create for extensionless create event', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'create', path: '/data/comics' }], changeset)
      expect(changeset.get('/comics/')).toBe('dir-create')
    })
    it('should add dir-delete for extensionless delete event', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'delete', path: '/data/comics' }], changeset)
      expect(changeset.get('/comics/')).toBe('dir-delete')
    })
    it('should store directory paths with trailing slash', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'create', path: '/data/a/b' }], changeset)
      expect(changeset.has('/a/b/')).toBe(true)
    })
    it('should ignore hidden directory events', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'create', path: '/data/.hidden' }], changeset)
      expect(changeset.size).toBe(0)
    })
    it('should ignore update events for directories', () => {
      const changeset = new Map() as Changeset
      processEvents('/data', [{ type: 'update', path: '/data/comics' }], changeset)
      expect(changeset.size).toBe(0)
    })
  })
})
