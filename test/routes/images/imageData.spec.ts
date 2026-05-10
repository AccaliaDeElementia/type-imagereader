'use sanity'

import { ImageData } from '#routes/images.js'

describe('routes/images ImageData', () => {
  describe('fromImage()', () => {
    it('should return instance of ImageData', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      expect(result).toBeInstanceOf(ImageData)
    })
    it('should not set error code', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      expect(result.code).toBe(null)
    })
    it('should not set statusCode', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      expect(result.statusCode).toBe(0)
    })
    it('should not set error message', () => {
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', 'foo.blep')
      expect(result.message).toBe(null)
    })
    it('should set data', () => {
      const data = Buffer.from('FOO')
      const result = ImageData.fromImage(data, 'blep', 'foo.blep')
      expect(result.data).toBe(data)
    })
    it('should set file extension', () => {
      const ext = `.mkv-${Math.random()}`
      const result = ImageData.fromImage(Buffer.from('foo'), ext, 'foo.blep')
      expect(result.extension).toBe(ext)
    })
    it('should set path', () => {
      const path = `/foo/bar/bax/quux/${Math.random()}`
      const result = ImageData.fromImage(Buffer.from('foo'), 'blep', path)
      expect(result.path).toBe(path)
    })
  })
  describe('fromError()', () => {
    it('should return instance of ImageData', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result).toBeInstanceOf(ImageData)
    })
    it('should set error code', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.code).toBe('ERR123')
    })
    it('should set statusCode', () => {
      const code = 500 + Math.random()
      const result = ImageData.fromError('ERR123', code, 'ERR: Message', 'foo.blep')
      expect(result.statusCode).toBe(code)
    })
    it('should set error message', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.message).toBe('ERR: Message')
    })
    it('should set data to default value', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.data).toBe(ImageData.defaultData)
    })
    it('should not set file extension', () => {
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', 'foo.blep')
      expect(result.extension).toBe(null)
    })
    it('should set path', () => {
      const path = `/foo/bar/bax/quux/${Math.random()}`
      const result = ImageData.fromError('ERR123', 500, 'ERR: Message', path)
      expect(result.path).toBe(path)
    })
  })
})
