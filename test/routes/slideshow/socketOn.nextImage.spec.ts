'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { assert, expect } from 'chai'
import { type HandleSocketState, Functions } from '../../../routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import { AlwaysFails } from '../../testutils/Errors'

describe('routes/slideshow socket prev-image', () => {
  let knexFake = StubToKnex({})
  let ioStub = { emit: Sinon.stub(), to: Sinon.stub().returnsThis() }
  let serverFake = Cast<WebSocketServer>(ioStub)
  let socketStub = { on: Sinon.stub() }
  let socketFake = Cast<Socket>(socketStub)
  let handlerFn = AlwaysFails<() => Promise<void>>('Should be overwritten in beforeEach!')
  let socketState: HandleSocketState = { roomName: null }
  let roomData = { path: '', uriSafeImage: '' }
  let getRoomStub = Sinon.stub().resolves(roomData)
  beforeEach(() => {
    knexFake = StubToKnex({})
    ioStub = { emit: Sinon.stub(), to: Sinon.stub().returnsThis() }
    serverFake = Cast<WebSocketServer>(ioStub)
    socketStub = { on: Sinon.stub() }
    socketFake = Cast<Socket>(socketStub)
    socketState = Functions.HandleSocket(knexFake, serverFake, socketFake)
    const fn = socketStub.on
      .getCalls()
      .filter((call) => call.args[0] === 'next-image')
      .map((call) => call.args[1] as unknown)[0]
    assert.isFunction(fn)
    handlerFn = Cast<() => Promise<void>>(fn)
    roomData = {
      path: '/foo/bar',
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = Sinon.stub(Functions, 'GetRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
  })
  afterEach(() => {
    getRoomStub.restore()
  })
  const tests: Array<[string, string | null, () => void]> = [
    ['not decrement image for null room', null, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not broadcast message for null room', null, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit message for null room', null, () => expect(ioStub.emit.callCount).to.equal(0)],
    ['decrement image for valid room', '/foo', () => expect(getRoomStub.callCount).to.equal(1)],
    ['decrement image with knex', '/foo', () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['decrement image with room name', '/foo', () => expect(getRoomStub.firstCall.args[1]).to.equal('/foo')],
    ['decrement image by exactly one image', '/foo', () => expect(getRoomStub.firstCall.args[2]).to.equal(1)],
    ['broadcast message for valid room', '/foo', () => expect(ioStub.to.callCount).to.equal(1)],
    ['broadcast message to room name', '/foo', () => expect(ioStub.to.firstCall.args).to.deep.equal(['/foo/bar'])],
    ['emit message for valid room', '/foo', () => expect(ioStub.emit.callCount).to.equal(1)],
    ["emit 'new-image' message", '/foo', () => expect(ioStub.emit.firstCall.args[0]).to.equal('new-image')],
    ['emit message for image', '/foo', () => expect(ioStub.emit.firstCall.args[1]).to.equal('/foo/quux.png')],
  ]
  tests.forEach(([title, room, validationFn]) => {
    it(`should ${title}`, async () => {
      socketState.roomName = room
      await handlerFn()
      validationFn()
    })
  })
})
