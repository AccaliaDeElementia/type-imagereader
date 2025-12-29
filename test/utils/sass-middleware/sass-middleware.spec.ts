'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { StatusCodes } from 'http-status-codes'
import type { Request, Response } from 'express'
import sassMiddleware, { Functions } from '../../../utils/sass-middleware'
import { Cast } from '../../testutils/TypeGuards'

describe('utils/sass-middleware default function()', () => {
  let stubRequest = {
    method: 'GET',
    path: '/styles.css',
  }
  let stubResponse = {
    json: Sinon.stub().returnsThis(),
    set: Sinon.stub().returnsThis(),
    status: Sinon.stub().returnsThis(),
    send: Sinon.stub().returnsThis(),
  }
  let fakeRequest = Cast<Request>(stubRequest)
  let fakeResponse = Cast<Response>(stubResponse)
  let compileAndCacheStub = Sinon.stub()
  let compileFolderStub = Sinon.stub()
  let watchFolderStub = Sinon.stub()
  beforeEach(() => {
    stubRequest = {
      method: 'GET',
      path: '/styles.css',
    }
    stubResponse = {
      json: Sinon.stub().returnsThis(),
      set: Sinon.stub().returnsThis(),
      status: Sinon.stub().returnsThis(),
      send: Sinon.stub().returnsThis(),
    }
    fakeRequest = Cast<Request>(stubRequest)
    fakeResponse = Cast<Response>(stubResponse)
    compileAndCacheStub = Sinon.stub(Functions, 'CompileAndCache').resolves(true)
    compileFolderStub = Sinon.stub(Functions, 'CompileFolder').resolves(undefined)
    watchFolderStub = Sinon.stub(Functions, 'WatchFolder').resolves(undefined)
  })
  afterEach(() => {
    compileAndCacheStub.restore()
    compileFolderStub.restore()
    watchFolderStub.restore()
  })
  it('should watch the configured folder', () => {
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    expect(watchFolderStub.calledWith('/foo', '/bar')).to.equal(true)
  })
  it('should tolerate WatchFolder rejecting', async () => {
    const awaiter = Promise.resolve(true)
    const rejecter = async (): Promise<boolean> => await Promise.reject(new Error('FOO'))
    watchFolderStub.callsFake(async () => await awaiter.then(rejecter))
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    await awaiter
    expect(watchFolderStub.calledWith('/foo', '/bar')).to.equal(true)
  })
  it('should toplerate CompileFolder rejecting', async () => {
    const awaiter = Promise.resolve(true)
    const rejecter = async (): Promise<boolean> => await Promise.reject(new Error('FOO'))
    compileFolderStub.callsFake(async () => await awaiter.then(rejecter))
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    await awaiter
    expect(compileFolderStub.calledWith('/foo', '/bar')).to.equal(true)
  })
  it('should compile the configured folder', () => {
    sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    expect(compileFolderStub.calledWith('/foo', '/bar')).to.equal(true)
  })
  it('should return a function', () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    expect(sass).to.be.a('function')
  })
  it('should ignore a POST request', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    fakeRequest.method = 'POST'
    await sass(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
  })
  it('should ignore a non css request', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/styles.txt'
    await sass(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
  })
  it('should ignore a dotfile request', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/.styles.css'
    await sass(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
  })
  it('should reject a directory traversal request', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/../styles.css.map'
    await sass(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(stubResponse.status.calledWith(StatusCodes.FORBIDDEN)).to.equal(true)
    expect(stubResponse.send.calledWith('Directory Traversal Not Allowed!')).to.equal(true)
    expect(stubResponse.set.called).to.equal(false)
  })
  it('should reject a file that is not found', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/styles.css.map'
    await sass(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(stubResponse.status.calledWith(StatusCodes.NOT_FOUND)).to.equal(true)
    expect(stubResponse.send.calledWith('NOT FOUND')).to.equal(true)
    expect(stubResponse.set.called).to.equal(false)
  })
  it('should compile sass for a file that is not in the cache', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/styles.css.map'
    await sass(fakeRequest, fakeResponse, spy)
    expect(compileAndCacheStub.calledWith('/foo', '/styles.sass')).to.equal(true)
    expect(compileAndCacheStub.calledWith('/foo', '/styles.scss')).to.equal(false)
  })
  it('should compile scss when sass is not found for a file that is not in the cache', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/styles.css.map'
    compileAndCacheStub.onFirstCall().resolves(false)
    await sass(fakeRequest, fakeResponse, spy)
    expect(compileAndCacheStub.calledWith('/foo', '/styles.sass')).to.equal(true)
    expect(compileAndCacheStub.calledWith('/foo', '/styles.scss')).to.equal(true)
  })
  it('should send css map when requested', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/styles.css.map'
    const map = {
      version: 0,
      file: '/style.css',
      names: [],
      sources: [],
      mappings: 'SOME MAPPINGS!',
    }
    Functions.cache['/styles.css'] = Promise.resolve({
      map,
      css: 'SOME CSS!',
    })
    await sass(fakeRequest, fakeResponse, spy)
    expect(stubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
    expect(stubResponse.set.calledWith('Content-Type', 'application/json')).to.equal(true)
    expect(stubResponse.json.calledWith(map)).to.equal(true)
  })
  it('should send css when requested', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/styles.css'
    const map = {
      version: 0,
      file: '/style.css',
      names: [],
      sources: [],
      mappings: 'SOME MAPPINGS!',
    }
    Functions.cache['/styles.css'] = Promise.resolve({
      map,
      css: 'SOME CSS!',
    })
    await sass(fakeRequest, fakeResponse, spy)
    expect(stubResponse.status.calledWith(StatusCodes.OK)).to.equal(true)
    expect(stubResponse.set.calledWith('Content-Type', 'text/css')).to.equal(true)
    expect(stubResponse.send.calledWith('SOME CSS!')).to.equal(true)
  })
  it('should reject with internal server error when error happens', async () => {
    const sass = sassMiddleware({
      mountPath: '/foo',
      watchdir: '/bar',
    })
    const spy = Sinon.stub()
    stubRequest.path = '/styles.css'
    Functions.cache['/styles.css'] = Promise.reject(new Error('FOO IS BAR!'))
    await sass(fakeRequest, fakeResponse, spy)
    expect(stubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(stubResponse.send.calledWith('FOO IS BAR!')).to.equal(true)
  })
})
