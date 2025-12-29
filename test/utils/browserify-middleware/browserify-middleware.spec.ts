'use sanity'

import { expect } from 'chai'
import browserifyMiddleware, { Functions } from '../../../utils/browserify-middleware'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'
import { StatusCodes } from 'http-status-codes'
import type { Request, Response } from 'express'
import { Delay } from '../../testutils/Utils'

describe('utils/browserify-middleware default function()', () => {
  let stubRequest = {
    method: 'GET',
    path: '/',
  }
  let stubResponse = {
    status: Sinon.stub().returnsThis(),
    render: Sinon.stub().returnsThis(),
  }
  let fakeRequest = Cast<Request>(stubRequest)
  let fakeResponse = Cast<Response>(stubResponse)
  let watchAllFoldersStub = Sinon.stub()
  let sendScriptStub = Sinon.stub()
  beforeEach(() => {
    stubRequest = {
      method: 'GET',
      path: '/',
    }
    stubResponse = {
      status: Sinon.stub().returnsThis(),
      render: Sinon.stub().returnsThis(),
    }
    fakeRequest = Cast<Request>(stubRequest)
    fakeResponse = Cast<Response>(stubResponse)
    watchAllFoldersStub = Sinon.stub(Functions, 'WatchAllFolders').resolves()
    sendScriptStub = Sinon.stub(Functions, 'SendScript')
  })
  afterEach(() => {
    sendScriptStub.restore()
    watchAllFoldersStub.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should return a callable', () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    expect(result).to.be.a('function')
  })
  it('should not watch when paths not specified', () => {
    browserifyMiddleware({
      basePath: '/',
    })
    expect(watchAllFoldersStub.called).to.equal(false)
  })
  it('should not watch when paths empty', () => {
    browserifyMiddleware({
      basePath: '/',
      watchPaths: [],
    })
    expect(watchAllFoldersStub.called).to.equal(false)
  })
  it('should watch when paths provided', () => {
    browserifyMiddleware({
      basePath: '/foo',
      watchPaths: ['/bar', '/baz'],
    })
    expect(watchAllFoldersStub.calledWith('/foo', ['/bar', '/baz'])).to.equal(true)
  })
  it('should tolerate WatchAllFolders rejecting', async () => {
    watchAllFoldersStub.rejects(new Error('FOO!'))
    browserifyMiddleware({
      basePath: '/foo',
      watchPaths: ['/bar', '/baz'],
    })
    await Delay(1)
    expect(watchAllFoldersStub.calledWith('/foo', ['/bar', '/baz'])).to.equal(true)
  })
  it('should pass request to next for POST request', async () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'POST'
    stubRequest.path = '/script.js'
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(stubResponse.status.called).to.equal(false)
    expect(sendScriptStub.called).to.equal(false)
  })
  it('should pass request to next for HEAD request', async () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'HEAD'
    stubRequest.path = '/script.js'
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(stubResponse.status.called).to.equal(false)
    expect(sendScriptStub.called).to.equal(false)
  })
  it('should pass request to next for PATCH request', async () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'PATCH'
    stubRequest.path = '/script.js'
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(stubResponse.status.called).to.equal(false)
    expect(sendScriptStub.called).to.equal(false)
  })
  it('should pass request to next for DELETE request', async () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'DELETE'
    stubRequest.path = '/script.js'
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(stubResponse.status.called).to.equal(false)
    expect(sendScriptStub.called).to.equal(false)
  })
  it('should pass request to next for non compileable request', async () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'GET'
    stubRequest.path = '/script.txt'
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(true)
    expect(stubResponse.status.called).to.equal(false)
    expect(sendScriptStub.called).to.equal(false)
  })
  it('should pass render forbidden error for directory traversal', async () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'GET'
    stubRequest.path = '/../script.js'
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(stubResponse.status.calledWith(StatusCodes.FORBIDDEN)).to.equal(true)
    expect(
      stubResponse.render.calledWith('error', {
        message: 'Directory Traversal Not Allowed!',
      }),
    ).to.equal(true)
    expect(sendScriptStub.called).to.equal(false)
  })
  it('should send file for valid request', async () => {
    const result = browserifyMiddleware({
      basePath: '/foo',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'GET'
    stubRequest.path = '/script.js'
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(stubResponse.status.called).to.equal(false)
    expect(sendScriptStub.calledWith('/foo', '/script.js', fakeResponse)).to.equal(true)
  })
  it('should pass render Internal Server error for send file failure', async () => {
    const result = browserifyMiddleware({
      basePath: '/',
    })
    const spy = Sinon.stub()
    stubRequest.method = 'GET'
    stubRequest.path = '/script.js'
    sendScriptStub.rejects('SOMETHING BAD')
    await result(fakeRequest, fakeResponse, spy)
    expect(spy.called).to.equal(false)
    expect(stubResponse.status.called).to.equal(true)
    expect(stubResponse.status.calledWith(StatusCodes.INTERNAL_SERVER_ERROR)).to.equal(true)
    expect(
      stubResponse.render.calledWith('error', {
        message: 'INTERNAL_SERVER_ERROR',
      }),
    ).to.equal(true)
    expect(sendScriptStub.called).to.equal(true)
  })
})
