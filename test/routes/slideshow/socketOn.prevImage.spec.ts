'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { expect } from 'chai'
import { HandleSocketState, handleSocket, prevImage, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket prev-image', () => {
  let knexFake = stubToKnex({})
  let ioStub = { emit: sandbox.stub(), to: sandbox.stub().returnsThis() }
  let serverFake = cast<WebSocketServer>(ioStub)
  let socketStub = { on: sandbox.stub() }
  let socketFake = cast<Socket>(socketStub)
  let socketState = new HandleSocketState()
  let roomData = { path: '', uriSafeImage: '' }
  let getRoomStub = sandbox.stub().resolves(roomData)
  beforeEach(() => {
    knexFake = stubToKnex({})
    ioStub = { emit: sandbox.stub(), to: sandbox.stub().returnsThis() }
    serverFake = cast<WebSocketServer>(ioStub)
    socketStub = { on: sandbox.stub() }
    socketFake = cast<Socket>(socketStub)
    socketState = handleSocket(knexFake, serverFake, socketFake)
    roomData = {
      path: '/foo/bar',
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = sandbox.stub(Internals, 'getRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
  })
  afterEach(() => {
    sandbox.restore()
  })
  const tests: Array<[string, string | null, () => void]> = [
    ['not decrement image for null room', null, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not broadcast message for null room', null, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit message for null room', null, () => expect(ioStub.emit.callCount).to.equal(0)],
    ['decrement image for valid room', '/foo', () => expect(getRoomStub.callCount).to.equal(1)],
    ['decrement image with knex', '/foo', () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['decrement image with room name', '/foo', () => expect(getRoomStub.firstCall.args[1]).to.equal('/foo')],
    ['decrement image by exactly one image', '/foo', () => expect(getRoomStub.firstCall.args[2]).to.equal(-1)],
    ['broadcast message for valid room', '/foo', () => expect(ioStub.to.callCount).to.equal(1)],
    ['broadcast message to room name', '/foo', () => expect(ioStub.to.firstCall.args).to.deep.equal(['/foo/bar'])],
    ['emit message for valid room', '/foo', () => expect(ioStub.emit.callCount).to.equal(1)],
    ["emit 'image-changed' message", '/foo', () => expect(ioStub.emit.firstCall.args[0]).to.equal('image-changed')],
    ['emit message for image', '/foo', () => expect(ioStub.emit.firstCall.args[1]).to.equal('/foo/quux.png')],
  ]
  tests.forEach(([title, room, validationFn]) => {
    it(`should ${title}`, async () => {
      socketState.roomName = room
      await prevImage(socketState, serverFake, knexFake)
      validationFn()
    })
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should log prevImage format on valid invocation', async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.firstCall.args[0]).to.equal('prevImage in %s')
    })

    it('should log the room name on valid invocation', async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.firstCall.args[1]).to.equal('/foo')
    })

    it('should not log when room name is null', async () => {
      socketState.roomName = null
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.callCount).to.equal(0)
    })
  })
})
