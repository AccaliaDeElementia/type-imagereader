'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { Functions, ModCount } from '../../../routes/apiFunctions'
import { getRouter, Imports } from '../../../routes/api'
import persistance from '../../../utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

type RequestHandler = (req: Request, res: Response) => Promise<void>

describe('routes/api route POST /navigate/latest', () => {
  let requestStub = {
    body: {
      modCount: 0,
      path: '/image.png',
    },
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let responseStub = {
    status: Sinon.stub().returnsThis(),
    json: Sinon.stub().returnsThis(),
    send: Sinon.stub().returnsThis(),
    end: Sinon.stub().returnsThis(),
  }
  let responseFake = Cast<Response>(responseStub)
  let routeHandler = Cast<RequestHandler>(Sinon.stub().throws('WRONG CALL'))
  let loggerStub = Sinon.stub()
  let debuggerStub = Sinon.stub()
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
    responseStub = {
      status: Sinon.stub().returnsThis(),
      json: Sinon.stub().returnsThis(),
      send: Sinon.stub().returnsThis(),
      end: Sinon.stub().returnsThis(),
    }
    responseFake = Cast<Response>(responseStub)
    knexFake = { Knex: Math.random() }
    const postFn = Sinon.stub()
    const InitializeStub = Sinon.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = Sinon.stub(Imports, 'Router').returns(
      Cast<Router>({
        post: postFn,
        get: Sinon.stub(),
      }),
    )
    setLatestPictureStub = Sinon.stub(Functions, 'SetLatestPicture').resolves()
    validateModcountStub = Sinon.stub(ModCount, 'Validate').returns(true)
    incrementModcountStub = Sinon.stub(ModCount, 'Increment').returns(1)
    getModcountStub = Sinon.stub(ModCount, 'Get').returns(69)
    loggerStub = Sinon.stub()
    debuggerStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
      postFn.getCalls().find((call) => call.args[0] === '/navigate/latest')?.args[1],
      (fn): fn is RequestHandler => fn != null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    setLatestPictureStub.restore()
    validateModcountStub.restore()
    incrementModcountStub.restore()
    getModcountStub.restore()
    debuggerStub.restore()
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should accept missing modcount and handle as invalid modcount', async () => {
    validateModcountStub.returns(false)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(responseStub.send.callCount).to.equal(1)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should return new modcount when validate passes', async () => {
    validateModcountStub.returns(true)
    incrementModcountStub.returns(5050)
    const req = Cast<Request>({
      body: {
        path: '/image.png',
      },
      originalUrl: '/',
    })
    await routeHandler(req, responseFake)
    expect(responseStub.send.callCount).to.equal(1)
    expect(responseStub.send.firstCall.args).to.deep.equal(['5050'])
  })
  it('should return Status OK when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should return invalid modcount when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.callCount).to.equal(1)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should call SetLatestPicture when validate is bypassed', async () => {
    validateModcountStub.returns(false)
    requestStub.body.modCount = -1
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.callCount).to.equal(1)
    expect(setLatestPictureStub.firstCall.args).to.have.lengthOf(2)
    expect(setLatestPictureStub.firstCall.args[0]).to.equal(knexFake)
    expect(setLatestPictureStub.firstCall.args[1]).to.equal('/foo/bar/a image.png')
  })
  it('should ignore modcount when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(validateModcountStub.callCount).to.equal(0)
    expect(getModcountStub.callCount).to.equal(0)
    expect(incrementModcountStub.callCount).to.equal(0)
  })
  it('should call SetLatestPicture when validate passes', async () => {
    validateModcountStub.returns(true)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.callCount).to.equal(1)
    expect(setLatestPictureStub.firstCall.args).to.have.lengthOf(2)
    expect(setLatestPictureStub.firstCall.args[0]).to.equal(knexFake)
    expect(setLatestPictureStub.firstCall.args[1]).to.equal('/foo/bar/a image.png')
  })
  it('should set status BAD_REQUEST when validate fails', async () => {
    validateModcountStub.returns(false)
    getModcountStub.returns(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
  })
  it('should return invalid when validate fails', async () => {
    validateModcountStub.returns(false)
    getModcountStub.returns(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.callCount).to.equal(1)
    expect(responseStub.send.firstCall.args).to.deep.equal(['-1'])
  })
  it('should not call SetLatestPicture when validate fails', async () => {
    validateModcountStub.returns(false)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.callCount).to.equal(0)
  })
  it('should not retrieve listing directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar/'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.callCount).to.equal(0)
  })
  it('should return status FORBIDDEN for directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar/'
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  })
  it('should json error for directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/',
      },
    }
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(responseStub.json.firstCall.args[0]).to.deep.equal(err)
  })
  it('should respond with error message on error', async () => {
    const err = new Error('Evil Error!')
    setLatestPictureStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(responseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(responseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  })
  it('should log message on error', async () => {
    const err = new Error('Evil Error!')
    setLatestPictureStub.rejects(err)
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(loggerStub.firstCall.args[1]).to.equal(requestStub.body)
  })
  it('should log error on error', async () => {
    const err = new Error('Evil Error!')
    setLatestPictureStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
})
