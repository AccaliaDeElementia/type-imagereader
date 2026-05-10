'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { ModCount } from '#routes/apiFunctions.js'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route POST /navigate/latest', () => {
  let requestStub = {
    body: {
      modCount: 0,
      path: '/image.png',
    },
    originalUrl: '/',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
  let isPathTraversalStub = sandbox.stub()
  let setLatestPictureStub = sandbox.stub()
  let validateAndIncrementStub = sandbox.stub()
  let getModcountStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {
        modCount: 0,
        path: '/image.png',
      },
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const postFn = sandbox.stub()
    const InitializeStub = sandbox.stub(Imports, 'initialize').resolves(stubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      cast<Router>({
        post: postFn,
        get: sandbox.stub(),
      }),
    )
    setLatestPictureStub = sandbox.stub(Imports, 'setLatestPicture').resolves()
    validateAndIncrementStub = sandbox.stub(ModCount, 'validateAndIncrement').returns(1)
    getModcountStub = sandbox.stub(ModCount, 'get').returns(69)
    ;({ loggerStub } = stubDebug(sandbox, Imports))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => cast<ExpressRequestHandler>(action))
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      postFn.getCalls().find((call) => call.args[0] === '/navigate/latest')?.args[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should set status BAD_REQUEST when modcount is invalid', async () => {
    validateAndIncrementStub.returns(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
  })
  it('should accept missing modcount and handle as invalid modcount', async () => {
    validateAndIncrementStub.returns(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should return new modcount when validate passes', async () => {
    validateAndIncrementStub.returns(5050)
    const req = cast<Request>({ body: { path: '/image.png' }, originalUrl: '/' })
    await routeHandler(req, responseFake)
    expect(responseStub.send.firstCall.args).to.deep.equal(['5050'])
  })
  it('should return Status OK when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should return invalid modcount when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should call setLatestPicture when validate is bypassed', async () => {
    validateAndIncrementStub.returns(null)
    requestStub.body.modCount = -1
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.firstCall.args).to.deep.equal([knexFake, '/foo/bar/a image.png'])
  })
  it('should not call validateAndIncrement when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(validateAndIncrementStub.callCount).to.equal(0)
  })
  it('should not call get when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(getModcountStub.callCount).to.equal(0)
  })
  it('should call setLatestPicture when validate passes', async () => {
    validateAndIncrementStub.returns(5050)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.firstCall.args).to.deep.equal([knexFake, '/foo/bar/a image.png'])
  })
  it('should set status BAD_REQUEST when validate fails', async () => {
    validateAndIncrementStub.returns(null)
    getModcountStub.returns(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
  })
  it('should return invalid when validate fails', async () => {
    validateAndIncrementStub.returns(null)
    getModcountStub.returns(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should not call setLatestPicture when validate fails', async () => {
    validateAndIncrementStub.returns(null)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.callCount).to.equal(0)
  })
  it('should not call setLatestPicture when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.callCount).to.equal(0)
  })
  it('should return status FORBIDDEN when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  })
  it('should return E_NO_TRAVERSE json error when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).to.have.nested.property('error.code', 'E_NO_TRAVERSE')
  })
  it('should log on entry to navigate/latest handler', async () => {
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('POST /navigate/latest'))
    expect(matched).to.equal(true)
  })
  it('should log when modcount validation fails', async () => {
    validateAndIncrementStub.returns(null)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('modcount mismatch'))
    expect(matched).to.equal(true)
  })
})
