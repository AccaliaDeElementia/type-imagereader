'use sanity'

import { assert, expect } from 'chai'
import { ImageData } from '../../../routes/images'

describe('routes/images class ImageData', () => {
  describe('fromImage()', () => {
    it('should return instance of ImageData', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      expect(result).to.be.an.instanceOf(ImageData)
    })
    it('should not set error code', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      expect(result.code).to.equal(null)
    })
    it('should not set statusCode', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      assert.isNaN(result.statusCode)
    })
    it('should not set error message', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      expect(result.message).to.equal(null)
    })
    it('should set data', () => {
      const data = Buffer.from('FOO')
      const result = ImageData.fromImage(data, 'blep', 'foo.blep')
      expect(result.data).to.equal(data)
    })
    it('should set file extension', () => {
      const ext = `.mkv-${Math.random()}`
      const result = ImageData.fromImage(Buffer.from('foo'), ext, 'foo.blep')
      expect(result.extension).to.equal(ext)
    })
    it('should set path', () => {
      const path = `/foo/bar/bax/quux/${Math.random()}`
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', path)
      expect(result.path).to.equal(path)
    })
  })
  describe('fromError()', () => {
    it('should return instance of ImageData', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result).to.be.an.instanceOf(ImageData)
    })
    it('should set error code', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.code).to.equal('ERR123')
    })
    it('should set statusCode', () => {
      const code = 500 + Math.random()
      const result = ImageData.fromError('ERR123', code, 'ERR: Message', 'foo.blep')
      expect(result.statusCode).to.equal(code)
    })
    it('should set error message', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.message).to.equal('ERR: Message')
    })
    it('should set data to default value', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.data).to.equal(ImageData.defaultData)
    })
    it('should not set file extension', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.extension).to.equal(null)
    })
    it('should set path', () => {
      const path = `/foo/bar/bax/quux/${Math.random()}`
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', path)
      expect(result.path).to.equal(path)
    })
  })
})
