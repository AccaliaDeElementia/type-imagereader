'use sanity'

import { expect } from 'chai'
import { Functions } from '#sync/filewatcher.js'
import type { Changeset } from '#sync/filewatcher.js'

describe('utils/filewatcher Functions', () => {
  describe('isImagePath()', () => {
    const imageExtensions = ['jpg', 'JPEG', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff', 'bmp', 'jfif', 'jpe']
    imageExtensions.forEach((ext) => {
      it(`should return true for .${ext}`, () => {
        expect(Functions.isImagePath(`/foo/bar.${ext}`)).to.equal(true)
      })
    })

    const nonImageExtensions = ['txt', 'mp4']
    nonImageExtensions.forEach((ext) => {
      it(`should return false for .${ext}`, () => {
        expect(Functions.isImagePath(`/foo/bar.${ext}`)).to.equal(false)
      })
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
