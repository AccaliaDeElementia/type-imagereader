'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/browserify-middleware'
import Sinon from 'sinon'

class ErrorWithCode extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}
describe('utils/browserify-middleware function WatchAllFolders()', () => {
  let loggerStub = Sinon.stub()
  let watchFolderStub = Sinon.stub()
  let readDirStub = Sinon.stub().resolves([])
  let compileAndCacheStub = Sinon.stub()

  beforeEach(() => {
    loggerStub = Sinon.stub(Functions, 'logger')
    watchFolderStub = Sinon.stub(Functions, 'WatchFolder').resolves(undefined)
    readDirStub = Sinon.stub(Imports, 'readdir').resolves([])
    compileAndCacheStub = Sinon.stub(Functions, 'CompileAndCache').resolves()
    Functions.browserified = {}
  })
  afterEach(() => {
    compileAndCacheStub.restore()
    readDirStub.restore()
    watchFolderStub.restore()
    loggerStub.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should read each folder in the list of watchdirs', async () => {
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(readDirStub.calledWith('/foo/bar', { withFileTypes: true })).to.equal(true)
    expect(readDirStub.calledWith('/foo/baz', { withFileTypes: true })).to.equal(true)
    expect(loggerStub.called).to.equal(false)
  })
  it('should watch each folder in the list of watchdirs', async () => {
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(watchFolderStub.calledWith('/foo', '/bar', false)).to.equal(true)
    expect(watchFolderStub.calledWith('/foo', '/baz', false)).to.equal(true)
    expect(loggerStub.called).to.equal(false)
  })
  it('should ignore dotfiles when scanning for scripts to compile', async () => {
    readDirStub.resolves([
      {
        name: '.eslintrc.js',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(compileAndCacheStub.called).to.equal(false)
    expect(loggerStub.called).to.equal(false)
  })
  it('should ignore dotfolders when scanning for scripts to compile', async () => {
    readDirStub.resolves([
      {
        name: '.tmp',
        isDirectory: () => true,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(compileAndCacheStub.called).to.equal(false)
    expect(loggerStub.called).to.equal(false)
  })
  it('should ignore file without compileable extension when scanning for scripts to compile', async () => {
    readDirStub.resolves([
      {
        name: 'eslintrc.yaml',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(compileAndCacheStub.called).to.equal(false)
    expect(loggerStub.called).to.equal(false)
  })
  it('should compile .js file when scanning for scripts to compile', async () => {
    readDirStub.resolves([
      {
        name: 'application.js',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(compileAndCacheStub.calledWith('/foo', '/bar/application.js')).to.equal(true)
    expect(loggerStub.called).to.equal(false)
  })
  it('should compile .ts file when scanning for scripts to compile', async () => {
    readDirStub.resolves([
      {
        name: 'application.ts',
        isDirectory: () => false,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(compileAndCacheStub.calledWith('/foo', '/bar/application.ts')).to.equal(true)
    expect(loggerStub.called).to.equal(false)
  })
  it('should compile folder when scanning for scripts to compile', async () => {
    readDirStub.resolves([
      {
        name: 'application',
        isDirectory: () => true,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(compileAndCacheStub.calledWith('/foo', '/bar/application')).to.equal(true)
    expect(loggerStub.called).to.equal(false)
  })
  it('should watch contents of folders when scanning for scripts to compile', async () => {
    readDirStub.resolves([
      {
        name: 'application',
        isDirectory: () => true,
      },
    ])
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(watchFolderStub.calledWith('/foo', '/bar/application', true)).to.equal(true)
    expect(loggerStub.called).to.equal(false)
  })
  it('should complain about folder not existing when erroring with MODULE_NOT_FOUND', async () => {
    readDirStub.rejects(new ErrorWithCode('OOPS', 'MODULE_NOT_FOUND'))
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(loggerStub.calledWith('/bar does not exist to precompile scripts')).to.equal(true)
  })
  it('should complain about folder not existing when erroring with ENOENT', async () => {
    readDirStub.rejects(new ErrorWithCode('OOPS', 'ENOENT'))
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(loggerStub.calledWith('/bar does not exist to precompile scripts')).to.equal(true)
  })
  it('should handle unexpected error gracefully', async () => {
    readDirStub.rejects('SOMETHING BAD')
    await Functions.WatchAllFolders('/foo', ['/bar'])
    expect(loggerStub.calledWith('Unexpected Error while precompiling /bar scripts')).to.equal(true)
  })
  it('should continue processing other folders after getting one error', async () => {
    readDirStub.onFirstCall().rejects('SOMETHING_BAD')
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(readDirStub.calledWith('/foo/bar', { withFileTypes: true })).to.equal(true)
    expect(readDirStub.calledWith('/foo/baz', { withFileTypes: true })).to.equal(true)
  })
  it('should continue processing when CompileAndCache rejects', async () => {
    readDirStub.resolves([
      {
        name: 'application.ts',
        isDirectory: () => false,
      },
    ])
    compileAndCacheStub.rejects(new Error('FOO!'))
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(loggerStub.called).to.equal(false)
  })
  it('should continue processing when WatchFolder rejects', async () => {
    readDirStub.resolves([
      {
        name: 'application',
        isDirectory: () => true,
      },
    ])
    watchFolderStub.rejects(new Error('FOO!'))
    await Functions.WatchAllFolders('/foo', ['/bar', '/baz'])
    expect(loggerStub.called).to.equal(false)
  })
})
