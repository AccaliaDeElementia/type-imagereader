'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { Functions, ModCount } from '#routes/apiFunctions'
import { getRouter, Imports } from '#routes/api'
import persistance from '#utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'
import { createResponseFake } from '#testutils/Express'

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
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(Sinon.stub().throws('WRONG CALL'))
  let isPathTraversalStub = Sinon.stub()
  let setLatestPictureStub = Sinon.stub()
  let validateModcountStub = Sinon.stub()
  let incrementModcountStub = Sinon.stub()
  let getModcountStub = Sinon.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {
        modCount: 0,
        path: '/image.png',
      },
      originalUrl: '/',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const postFn = Sinon.stub()
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        post: postFn,
        get: Sinon.stub(),
      }),
    )
    setLatestPictureStub = sandbox.stub(Functions, 'SetLatestPicture').resolves()
    validateModcountStub = sandbox.stub(ModCount, 'Validate').returns(true)
    incrementModcountStub = sandbox.stub(ModCount, 'Increment').returns(1)
    getModcountStub = sandbox.stub(ModCount, 'Get').returns(69)
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(Sinon.stub()))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
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
    validateModcountStub.returns(false)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
  })
  it('should accept missing modcount and handle as invalid modcount', async () => {
    validateModcountStub.returns(false)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should return new modcount when validate passes', async () => {
    validateModcountStub.returns(true)
    incrementModcountStub.returns(5050)
    const req = Cast<Request>({ body: { path: '/image.png' }, originalUrl: '/' })
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
  it('should call SetLatestPicture when validate is bypassed', async () => {
    validateModcountStub.returns(false)
    requestStub.body.modCount = -1
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.firstCall.args).to.deep.equal([knexFake, '/foo/bar/a image.png'])
  })
  it('should not call Validate when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(validateModcountStub.callCount).to.equal(0)
  })
  it('should not call Get when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(getModcountStub.callCount).to.equal(0)
  })
  it('should not call Increment when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(incrementModcountStub.callCount).to.equal(0)
  })
  it('should call SetLatestPicture when validate passes', async () => {
    validateModcountStub.returns(true)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.firstCall.args).to.deep.equal([knexFake, '/foo/bar/a image.png'])
  })
  it('should set status BAD_REQUEST when validate fails', async () => {
    validateModcountStub.returns(false)
    getModcountStub.returns(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
  })
  it('should return invalid when validate fails', async () => {
    validateModcountStub.returns(false)
    getModcountStub.returns(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should not call SetLatestPicture when validate fails', async () => {
    validateModcountStub.returns(false)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.callCount).to.equal(0)
  })
  it('should not call SetLatestPicture when isPathTraversal returns true', async () => {
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
})
