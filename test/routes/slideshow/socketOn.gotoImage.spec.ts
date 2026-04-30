'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import { expect } from 'chai'
import { HandleSocketState, Functions, Imports, SocketHandlers } from '#routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket goto-image', () => {
  let knexFake = StubToKnex({})
  let ioStub = {}
  let serverFake = Cast<WebSocketServer>(ioStub)
  let socketStub = { on: sandbox.stub() }
  let socketFake = Cast<Socket>(socketStub)
  let socketState = new HandleSocketState()
  let folder = { path: '/foo/bar' }
  let roomData = { images: [folder], index: -1 }
  let getRoomStub = sandbox.stub().resolves(roomData)
  let picturePath = ''
  let setLatestStub = sandbox.stub().resolves(picturePath)
  beforeEach(() => {
    knexFake = StubToKnex({})
    ioStub = {}
    serverFake = Cast<WebSocketServer>(ioStub)
    socketStub = { on: sandbox.stub() }
    socketFake = Cast<Socket>(socketStub)
    socketState = Functions.HandleSocket(knexFake, serverFake, socketFake)
    folder = { path: '/foo/bar' }
    roomData = { images: [folder], index: -1 }
    getRoomStub = sandbox.stub(Functions, 'GetRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
    picturePath = `Picture-${Math.random()}.png`
    setLatestStub = sandbox.stub(Imports, 'setLatest').resolves(picturePath)
  })
  afterEach(() => {
    sandbox.restore()
  })
  const tests: Array<[string, string | null, number, (_: Sinon.SinonStub) => void]> = [
    ['not get room for null room', null, 0, () => expect(getRoomStub.callCount).to.equal(0)],
    ['get room for bad index', '/foo', -1, () => expect(getRoomStub.callCount).to.equal(1)],
    ['get room with knex for bad index', '/foo', -1, () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['get room with room for bad index', '/foo', -1, () => expect(getRoomStub.firstCall.args[1]).to.equal('/foo')],
    [
      'get room with no increment for bad index',
      '/foo',
      -1,
      () => expect(getRoomStub.firstCall.args).to.have.lengthOf(2),
    ],
    ['get room with knex for good index', '/foo', 0, () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['get room with room for good index', '/foo', 0, () => expect(getRoomStub.firstCall.args[1]).to.equal('/foo')],
    [
      'get room with no increment for good index',
      '/foo',
      0,
      () => expect(getRoomStub.firstCall.args).to.have.lengthOf(2),
    ],
    ['not provide callback path for null room', null, 0, (spy) => expect(spy.firstCall.args).to.deep.equal([null])],
    ['not provide callback path for bad index', '/foo', -1, (spy) => expect(spy.firstCall.args).to.deep.equal([null])],
    ['send callback path when valid', '/foo', 0, (spy) => expect(spy.firstCall.args[0]).to.equal(picturePath)],
    ['not set latest for null room', null, 0, () => expect(setLatestStub.callCount).to.equal(0)],
    ['not set latest for invalid index', '/foo', 12, () => expect(setLatestStub.callCount).to.equal(0)],
    ['set latest when valid', '/foo', 0, () => expect(setLatestStub.callCount).to.equal(1)],
    ['set latest with knex when valid', '/foo', 0, () => expect(setLatestStub.firstCall.args[0]).to.equal(knexFake)],
    [
      'set latest with folder object when valid',
      '/foo',
      0,
      () => expect(setLatestStub.firstCall.args[1]).to.equal(folder),
    ],
  ]
  tests.forEach(([title, room, index, validationFn]) => {
    it(`should ${title}`, async () => {
      socketState.roomName = room
      roomData.index = index
      const spy = sandbox.stub()
      await SocketHandlers.gotoImage(spy, socketState, knexFake)
      validationFn(spy)
    })
  })
  it('should send null callback path when setLatest returns null', async () => {
    setLatestStub.resolves(null)
    socketState.roomName = '/foo'
    roomData.index = 0
    const spy = sandbox.stub()
    await SocketHandlers.gotoImage(spy, socketState, knexFake)
    expect(spy.firstCall.args[0]).to.equal(null)
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should log gotoImage format on valid invocation', async () => {
      socketState.roomName = '/foo'
      roomData.index = 0
      await SocketHandlers.gotoImage(sandbox.stub(), socketState, knexFake)
      expect(loggerStub.firstCall.args[0]).to.equal('gotoImage in %s')
    })

    it('should log the room name on valid invocation', async () => {
      socketState.roomName = '/foo'
      roomData.index = 0
      await SocketHandlers.gotoImage(sandbox.stub(), socketState, knexFake)
      expect(loggerStub.firstCall.args[1]).to.equal('/foo')
    })

    it('should not log when room name is null', async () => {
      socketState.roomName = null
      await SocketHandlers.gotoImage(sandbox.stub(), socketState, knexFake)
      expect(loggerStub.callCount).to.equal(0)
    })
  })
})
