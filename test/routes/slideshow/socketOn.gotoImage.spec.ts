'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { assert, expect } from 'chai'
import { type HandleSocketState, Functions, Imports } from '../../../routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import { AlwaysFails } from '../../testutils/Errors'

describe('routes/slideshow socket goto-image', () => {
  let knexFake = StubToKnex({})
  let ioStub = {}
  let serverFake = Cast<WebSocketServer>(ioStub)
  let socketStub = { on: Sinon.stub() }
  let socketFake = Cast<Socket>(socketStub)
  let handlerFn = AlwaysFails<(_: (_: string | null) => void) => Promise<void>>('Should be overwritten in beforeEach!')
  let socketState: HandleSocketState = { roomName: null }
  let folder = { path: '/foo/bar' }
  let roomData = { images: [folder], index: -1 }
  let getRoomStub = Sinon.stub().resolves(roomData)
  let picturePath = ''
  let setLatestStub = Sinon.stub().resolves(picturePath)
  beforeEach(() => {
    knexFake = StubToKnex({})
    ioStub = {}
    serverFake = Cast<WebSocketServer>(ioStub)
    socketStub = { on: Sinon.stub() }
    socketFake = Cast<Socket>(socketStub)
    socketState = Functions.HandleSocket(knexFake, serverFake, socketFake)
    const fn = socketStub.on
      .getCalls()
      .filter((call) => call.args[0] === 'goto-image')
      .map((call) => call.args[1] as unknown)[0]
    assert.isFunction(fn)
    handlerFn = Cast<(callback: (path: string | null) => void) => Promise<void>>(fn)
    folder = { path: '/foo/bar' }
    roomData = { images: [folder], index: -1 }
    getRoomStub = Sinon.stub(Functions, 'GetRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
    picturePath = `Picture-${Math.random()}.png`
    setLatestStub = Sinon.stub(Imports, 'setLatest').resolves(picturePath)
  })
  afterEach(() => {
    setLatestStub.restore()
    getRoomStub.restore()
  })
  const tests: Array<[string, string | null, number, (_: Sinon.SinonStub) => void]> = [
    ['not get room for null room', null, 0, () => expect(getRoomStub.callCount).to.equal(0)],
    ['get room for bad index', '/foo', -1, () => expect(getRoomStub.callCount).to.equal(1)],
    ['get room with knex for bad index', '/foo', -1, () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['get room with room for bad index', '/foo', -1, () => expect(getRoomStub.firstCall.args[1]).to.equal('/foo')],
    ['get room with knex for good index', '/foo', 0, () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['get room with room for good index', '/foo', 0, () => expect(getRoomStub.firstCall.args[1]).to.equal('/foo')],
    ['not provide callback path for null room', null, 0, (spy) => expect(spy.firstCall.args).to.deep.equal([null])],
    ['not provide callback path for bad index', '/foo', -1, (spy) => expect(spy.firstCall.args).to.deep.equal([null])],
    ['send callback path when valid', '/foo', 0, (spy) => expect(spy.firstCall.args[0]).to.equal(picturePath)],
    ['not set latest for null room', null, 0, () => expect(setLatestStub.callCount).to.equal(0)],
    ['not set latest for invalid index', '/foo', 12, () => expect(setLatestStub.callCount).to.equal(0)],
    ['set latest when valid', '/foo', 0, () => expect(setLatestStub.callCount).to.equal(1)],
    ['set latest with knex when valid', '/foo', 0, () => expect(setLatestStub.firstCall.args[0]).to.equal(knexFake)],
    ['set latest with path when valid', '/foo', 0, () => expect(setLatestStub.firstCall.args[1]).to.equal(folder)],
  ]
  tests.forEach(([title, room, index, validationFn]) => {
    it(`should ${title}`, async () => {
      socketState.roomName = room
      roomData.index = index
      const spy = Sinon.stub()
      await handlerFn(spy)
      validationFn(spy)
    })
  })
})
