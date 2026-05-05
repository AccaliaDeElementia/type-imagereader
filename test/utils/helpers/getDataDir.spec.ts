'use sanity'

import { expect } from 'chai'
import { getDataDir } from '#utils/helpers.js'

describe('utils/helpers function getDataDir()', () => {
  let originalEnv: string | undefined = undefined
  beforeEach(() => {
    originalEnv = process.env.DATA_DIR
    delete process.env.DATA_DIR
  })
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DATA_DIR
    } else {
      process.env.DATA_DIR = originalEnv
    }
  })

  it('should return /data when DATA_DIR is unset', () => {
    expect(getDataDir()).to.equal('/data')
  })

  it('should return /data when DATA_DIR is empty string', () => {
    process.env.DATA_DIR = ''
    expect(getDataDir()).to.equal('/data')
  })

  it('should return DATA_DIR value when set', () => {
    process.env.DATA_DIR = '/custom/path'
    expect(getDataDir()).to.equal('/custom/path')
  })

  it('should strip a single trailing slash', () => {
    process.env.DATA_DIR = '/custom/path/'
    expect(getDataDir()).to.equal('/custom/path')
  })

  it('should strip multiple trailing slashes', () => {
    process.env.DATA_DIR = '/custom/path///'
    expect(getDataDir()).to.equal('/custom/path')
  })

  it('should preserve a bare root slash', () => {
    process.env.DATA_DIR = '/'
    expect(getDataDir()).to.equal('/')
  })
})
