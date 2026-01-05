'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { assert, expect } from 'chai'
import { type HandleSocketState, Functions } from '../../../routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import { AlwaysFails } from '../../testutils/Errors'

describe('routes/slideshow socket join-slideshow()', () => {
  let knexFake = StubToKnex({})
  let serverFake = Cast<WebSocketServer>({})
  let socketStub = { on: Sinon.stub(), join: Sinon.stub().resolves(), emit: Sinon.stub() }
  let socketFake = Cast<Socket>(socketStub)
  let handlerFn = AlwaysFails<(_: string | null | undefined) => Promise<void>>('Should be overwritten in beforeEach!')
  let socketState: HandleSocketState = { roomName: null }
  let roomData = {
    uriSafeImage: '/foo/bar/quux.png',
  }
  let getRoomStub = Sinon.stub().resolves(roomData)
  beforeEach(() => {
    knexFake = StubToKnex({})
    serverFake = Cast<WebSocketServer>({})
    socketStub = { on: Sinon.stub(), join: Sinon.stub().resolves(), emit: Sinon.stub() }
    socketFake = Cast<Socket>(socketStub)
    socketState = Functions.HandleSocket(knexFake, serverFake, socketFake)
    socketState.roomName = 'NO_ROOM' // assign sentical value to test against later
    const fn = socketStub.on
      .getCalls()
      .filter((call) => call.args[0] === 'join-slideshow')
      .map((call) => call.args[1] as unknown)[0]
    assert.isFunction(fn)
    handlerFn = Cast<(_: string | null | undefined) => Promise<void>>(fn)
    roomData = {
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = Sinon.stub(Functions, 'GetRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
  })
  afterEach(() => {
    getRoomStub.restore()
  })
  const tests: Array<[string, string | null | undefined, () => void]> = [
    ['not join missing room name', undefined, () => expect(socketStub.join.callCount).to.equal(0)],
    ['not join null room name', null, () => expect(socketStub.join.callCount).to.equal(0)],
    ['not join emtpy room name', '', () => expect(socketStub.join.callCount).to.equal(0)],
    ['join socket', '/foo', () => expect(socketStub.join.callCount).to.equal(1)],
    ['join socket with room name', '/foo', () => expect(socketStub.join.firstCall.args).to.deep.equal(['/foo'])],
    ['not save missing room name to state', undefined, () => expect(socketState.roomName).to.equal('NO_ROOM')],
    ['not save null room name to state', null, () => expect(socketState.roomName).to.equal('NO_ROOM')],
    ['not save empty room name to state', '', () => expect(socketState.roomName).to.equal('NO_ROOM')],
    ['save room name to state', '/foo', () => expect(socketState.roomName).to.equal('/foo')],
    ['not get room for missing room name', undefined, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not get room for null room name', null, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not get room for empty room name', '', () => expect(getRoomStub.callCount).to.equal(0)],
    ['get room for room name', '/foo', () => expect(getRoomStub.callCount).to.equal(1)],
    ['get room with knex', '/foo', () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['get room with room name', '/foo', () => expect(getRoomStub.firstCall.args[1]).to.equal('/foo')],
    ['get room without increment', '/foo', () => expect(getRoomStub.firstCall.args).to.have.lengthOf(2)],
    ['not emit message for missing room name', undefined, () => expect(socketStub.emit.callCount).to.equal(0)],
    ['not emit message for null room name', null, () => expect(socketStub.emit.callCount).to.equal(0)],
    ['not emit message for empty room name', '', () => expect(socketStub.emit.callCount).to.equal(0)],
    ['not emit message for valid room name', '/foo', () => expect(socketStub.emit.callCount).to.equal(1)],
    ["emit 'new-image' message", '/foo', () => expect(socketStub.emit.firstCall.args[0]).to.equal('new-image')],
    ['emit message with image path', '/foo', () => expect(socketStub.emit.firstCall.args[1]).to.equal('/foo/quux.png')],
  ]
  tests.forEach(([title, room, validationFn]) => {
    it(`should ${title}`, async () => {
      await handlerFn(room)
      validationFn()
    })
  })
})
