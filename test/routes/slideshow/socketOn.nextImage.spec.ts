'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import { expect } from 'chai'
import { HandleSocketState, Functions, SocketHandlers } from '#routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket next-image', () => {
  let knexFake = StubToKnex({})
  let ioStub = { emit: sandbox.stub(), to: sandbox.stub().returnsThis() }
  let serverFake = Cast<WebSocketServer>(ioStub)
  let socketStub = { on: sandbox.stub() }
  let socketFake = Cast<Socket>(socketStub)
  let socketState = new HandleSocketState()
  let roomData = { path: '', uriSafeImage: '' }
  let getRoomStub = sandbox.stub().resolves(roomData)
  beforeEach(() => {
    knexFake = StubToKnex({})
    ioStub = { emit: sandbox.stub(), to: sandbox.stub().returnsThis() }
    serverFake = Cast<WebSocketServer>(ioStub)
    socketStub = { on: sandbox.stub() }
    socketFake = Cast<Socket>(socketStub)
    socketState = Functions.HandleSocket(knexFake, serverFake, socketFake)
    roomData = {
      path: '/foo/bar',
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = sandbox.stub(Functions, 'GetRoomAndIncrementImage')
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
    ['increment image by exactly one image', '/foo', () => expect(getRoomStub.firstCall.args[2]).to.equal(1)],
    ['broadcast message for valid room', '/foo', () => expect(ioStub.to.callCount).to.equal(1)],
    ['broadcast message to room name', '/foo', () => expect(ioStub.to.firstCall.args).to.deep.equal(['/foo/bar'])],
    ['emit message for valid room', '/foo', () => expect(ioStub.emit.callCount).to.equal(1)],
    ["emit 'image-changed' message", '/foo', () => expect(ioStub.emit.firstCall.args[0]).to.equal('image-changed')],
    ['emit message for image', '/foo', () => expect(ioStub.emit.firstCall.args[1]).to.equal('/foo/quux.png')],
  ]
  tests.forEach(([title, room, validationFn]) => {
    it(`should ${title}`, async () => {
      socketState.roomName = room
      await SocketHandlers.nextImage(socketState, serverFake, knexFake)
      validationFn()
    })
  })
})
