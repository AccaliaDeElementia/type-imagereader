'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { expect } from 'chai'
import { Config, Functions } from '../../../routes/slideshow'
import type { Server as WebSocketServer } from 'socket.io'

describe('routes/slideshow function TickCountdown()', () => {
  let knexFake = StubToKnex({ knex: Math.random() })
  let ioStub = {
    of: Sinon.stub().returnsThis(),
    adapter: {},
    rooms: {},
    to: Sinon.stub().returnsThis(),
    get: Sinon.stub().returns([]),
    emit: Sinon.stub().returnsThis(),
  }
  let ioFake = Cast<WebSocketServer>(ioStub)
  let getRoomStub = Sinon.stub()
  beforeEach(() => {
    knexFake = StubToKnex({ knex: Math.random() })
    ioStub = {
      of: Sinon.stub().returnsThis(),
      adapter: {},
      rooms: {},
      to: Sinon.stub().returnsThis(),
      get: Sinon.stub().returns([]),
      emit: Sinon.stub().returnsThis(),
    }
    ioFake = Cast<WebSocketServer>(ioStub)
    ioStub.adapter = ioStub
    ioStub.rooms = ioStub
    Config.rooms = {}
    Config.countdownDuration = 60
    getRoomStub = Sinon.stub(Functions, 'GetRoomAndIncrementImage')
  })
  afterEach(() => {
    getRoomStub.restore()
  })
  it('should accept empty room list', async () => {
    await Functions.TickCountdown(knexFake, ioFake)
    expect(ioStub.of.callCount).to.equal(0)
    expect(getRoomStub.callCount).to.equal(0)
  })
  const clients = new Set(['/'])
  const tests: Array<[string, number, unknown, () => void]> = [
    ['remove expired room, no clients', -3599, null, () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['remove expired room, nil clients', -3599, undefined, () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['remove expired room, empty clients', -3599, new Set(), () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['remove expired room, with clients', -3599, clients, () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['get clients, group by of()', -5, null, () => expect(ioStub.of.callCount).to.equal(1)],
    ['get clients, filter root instance', -5, null, () => expect(ioStub.of.firstCall.args).to.deep.equal(['/'])],
    ['get clients, from rooms', -5, null, () => expect(ioStub.get.callCount).to.equal(1)],
    ['get clients, from input room', -5, null, () => expect(ioStub.get.firstCall.args).to.deep.equal(['/Room'])],
    ['update room, null clients', -5, null, () => expect(Config.rooms['/Room']?.countdown).to.equal(-6)],
    ['update room, undefined clients', -5, undefined, () => expect(Config.rooms['/Room']?.countdown).to.equal(-6)],
    ['update room, empty clients', 6, new Set(), () => expect(Config.rooms['/Room']?.countdown).to.equal(5)],
    ['update room, with clients', 7, clients, () => expect(Config.rooms['/Room']?.countdown).to.equal(6)],
    ['reset countdown newly due room', 1, clients, () => expect(Config.rooms['/Room']?.countdown).to.equal(60)],
    ['reset countdown overdue room', 0, clients, () => expect(Config.rooms['/Room']?.countdown).to.equal(60)],
    ['reset countdown near expired room', -2999, clients, () => expect(Config.rooms['/Room']?.countdown).to.equal(60)],
    ['not increment expired room, no clients', -3599, null, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment expired room, nil clients', -3599, undefined, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment expired room, empty clients', -3599, new Set(), () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment expired room, with clients', -3599, clients, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment valid room, no clients', 99, null, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment valid room, nil clients', 99, undefined, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment valid room, empty clients', 99, new Set(), () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment valid room, with clients', 99, clients, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment due room, no clients', -99, null, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment due room, nil clients', -99, undefined, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not increment due room, empty clients', -99, new Set(), () => expect(getRoomStub.callCount).to.equal(0)],
    ['increment due room, with clients', -99, clients, () => expect(getRoomStub.callCount).to.equal(1)],
    ['increment room with knex', -99, clients, () => expect(getRoomStub.firstCall.args[0]).to.equal(knexFake)],
    ['increment room with room name', -99, clients, () => expect(getRoomStub.firstCall.args[1]).to.equal('/Room')],
    ['increment by single image', -99, clients, () => expect(getRoomStub.firstCall.args[2]).to.equal(1)],
    ['not get clients  expired room, no clients', -3599, null, () => expect(ioStub.of.callCount).to.equal(0)],
    ['not get clients  expired room, nil clients', -3599, undefined, () => expect(ioStub.of.callCount).to.equal(0)],
    ['not get clients  expired room, empty clients', -3599, new Set(), () => expect(ioStub.of.callCount).to.equal(0)],
    ['not get clients  expired room, with clients', -3599, clients, () => expect(ioStub.of.callCount).to.equal(0)],
    ['get clients for valid room, no clients', 99, null, () => expect(ioStub.of.callCount).to.equal(1)],
    ['get clients for valid room, nil clients', 99, undefined, () => expect(ioStub.of.callCount).to.equal(1)],
    ['get clients for valid room, empty clients', 99, new Set(), () => expect(ioStub.of.callCount).to.equal(1)],
    ['get clients for valid room, with clients', 99, clients, () => expect(ioStub.of.callCount).to.equal(1)],
    ['not emit expired room, no clients', -3599, null, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit expired room, nil clients', -3599, undefined, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit expired room, empty clients', -3599, new Set(), () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit expired room, with clients', -3599, clients, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit valid room, no clients', 2, null, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit valid room, nil clients', 2, undefined, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit valid room, empty clients', 2, new Set(), () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit valid room, with clients', 2, clients, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit due room, no clients', 1, null, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit due room, nil clients', 1, undefined, () => expect(ioStub.to.callCount).to.equal(0)],
    ['not emit due room, empty clients', 1, new Set(), () => expect(ioStub.to.callCount).to.equal(0)],
    ['emit due room, with clients', 1, clients, () => expect(ioStub.to.callCount).to.equal(1)],
    ['emit to selected room', -99, clients, () => expect(ioStub.to.firstCall.args).to.deep.equal(['/Room'])],
    ['emit single message', -99, clients, () => expect(ioStub.emit.callCount).to.equal(1)],
    ['emit new-image message', -99, clients, () => expect(ioStub.emit.firstCall.args[0]).to.equal('new-image')],
    ['emit new image path', -99, clients, () => expect(ioStub.emit.firstCall.args[1]).to.equal('/an/image.png')],
  ]
  tests.forEach(([title, countdown, clients, validationFn]) => {
    it(`should ${title}`, async () => {
      Config.rooms['/Room'] = {
        countdown,
        path: '/Room',
        images: [],
        index: 0,
        uriSafeImage: '/an/image.png',
        pages: {
          unread: 0,
          all: 0,
          pages: 0,
          page: 0,
        },
      }
      ioStub.get.returns(clients)
      await Functions.TickCountdown(knexFake, ioFake)
      validationFn()
    })
  })
})
