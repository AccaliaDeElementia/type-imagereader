'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import { expect } from 'chai'
import { Config, TickCountdown, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow function TickCountdown()', () => {
  let knexFake = StubToKnex({ knex: Math.random() })
  let ioStub = {
    of: sandbox.stub().returnsThis(),
    adapter: {},
    rooms: {},
    to: sandbox.stub().returnsThis(),
    get: sandbox.stub().returns([]),
    emit: sandbox.stub().returnsThis(),
  }
  let ioFake = Cast<WebSocketServer>(ioStub)
  let getRoomStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  const buildRoom = (
    countdown: number,
    path = '/Room',
    images: string[] = ['/an/image.png'],
    uriSafeImage = '/an/image.png',
  ): void => {
    Config.rooms[path] = {
      countdown,
      path,
      images,
      index: 0,
      uriSafeImage,
      pages: { unread: 0, all: 0, pages: 0, page: 0 },
    }
  }
  beforeEach(() => {
    knexFake = StubToKnex({ knex: Math.random() })
    ioStub = {
      of: sandbox.stub().returnsThis(),
      adapter: {},
      rooms: {},
      to: sandbox.stub().returnsThis(),
      get: sandbox.stub().returns([]),
      emit: sandbox.stub().returnsThis(),
    }
    ioFake = Cast<WebSocketServer>(ioStub)
    ioStub.adapter = ioStub
    ioStub.rooms = ioStub
    Config.rooms = {}
    Config.countdownDuration = 60
    getRoomStub = sandbox.stub(Internals, 'GetRoomAndIncrementImage')
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should not call io.of with empty room list', async () => {
    await TickCountdown(knexFake, ioFake)
    expect(ioStub.of.callCount).to.equal(0)
  })
  it('should not call GetRoom with empty room list', async () => {
    await TickCountdown(knexFake, ioFake)
    expect(getRoomStub.callCount).to.equal(0)
  })
  const clients = new Set(['/'])
  const tests: Array<[string, number, unknown, () => void, string[]?]> = [
    ['remove expired room, no clients', -3599, null, () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['remove expired room, nil clients', -3599, undefined, () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['remove expired room, empty clients', -3599, new Set(), () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['remove expired room, with clients', -3599, clients, () => expect(Config.rooms).to.not.have.any.keys('/Room')],
    ['keep near-expired room', -3598, null, () => expect(Config.rooms).to.have.any.keys('/Room')],
    ['check clients for near-expired room', -3598, null, () => expect(ioStub.of.callCount).to.equal(1)],
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
    ['not emit due room, with clients, no images', 1, clients, () => expect(ioStub.to.callCount).to.equal(0)],
    ['emit due room, with clients', 1, clients, () => expect(ioStub.to.callCount).to.equal(1), ['/an/image.png']],
    [
      'emit to selected room',
      -99,
      clients,
      () => expect(ioStub.to.firstCall.args).to.deep.equal(['/Room']),
      ['/an/image.png'],
    ],
    ['emit single message', -99, clients, () => expect(ioStub.emit.callCount).to.equal(1), ['/an/image.png']],
    [
      'emit image-changed message',
      -99,
      clients,
      () => expect(ioStub.emit.firstCall.args[0]).to.equal('image-changed'),
      ['/an/image.png'],
    ],
    [
      'emit new image path',
      -99,
      clients,
      () => expect(ioStub.emit.firstCall.args[1]).to.equal('/an/image.png'),
      ['/an/image.png'],
    ],
  ]
  tests.forEach(([title, countdown, clients, validationFn, images = []]) => {
    it(`should ${title}`, async () => {
      buildRoom(countdown, '/Room', images, '/an/image.png')
      ioStub.get.returns(clients)
      await TickCountdown(knexFake, ioFake)
      validationFn()
    })
  })

  describe('when GetRoomAndIncrementImage mutates the room', () => {
    beforeEach(() => {
      buildRoom(-99, '/Room', ['/old/image.png'], '/old/image.png')
      ioStub.get.returns(clients)
    })
    it('should emit updated uriSafeImage', async () => {
      getRoomStub.callsFake((_knex: unknown, name: string) => {
        const room = Config.rooms[name]
        if (room !== undefined) {
          room.uriSafeImage = '/new/image.png'
          room.images = ['/new/image.png']
        }
      })
      await TickCountdown(knexFake, ioFake)
      expect(ioStub.emit.firstCall.args[1]).to.equal('/new/image.png')
    })
    it('should not emit when GetRoomAndIncrementImage empties the image list', async () => {
      getRoomStub.callsFake((_knex: unknown, name: string) => {
        const room = Config.rooms[name]
        if (room !== undefined) {
          room.images = []
          room.uriSafeImage = ''
        }
      })
      await TickCountdown(knexFake, ioFake)
      expect(ioStub.to.callCount).to.equal(0)
    })
  })

  describe('when GetRoomAndIncrementImage rejects with an error', () => {
    const tickFailedError = new Error('TICK FAILED')
    beforeEach(() => {
      buildRoom(-99)
      ioStub.get.returns(new Set(['/']))
      getRoomStub.rejects(tickFailedError)
    })
    it('should log once', async () => {
      await TickCountdown(knexFake, ioFake)
      expect(loggerStub.callCount).to.equal(1)
    })
    it("should log with message 'TickCountdown error'", async () => {
      await TickCountdown(knexFake, ioFake)
      expect(loggerStub.firstCall.args[0]).to.equal('TickCountdown error')
    })
    it('should log the error object', async () => {
      await TickCountdown(knexFake, ioFake)
      expect(loggerStub.firstCall.args[1]).to.equal(tickFailedError)
    })
  })

  it('should not log when no error occurs', async () => {
    await TickCountdown(knexFake, ioFake)
    expect(loggerStub.callCount).to.equal(0)
  })

  describe('with two due rooms where one fails', () => {
    beforeEach(() => {
      buildRoom(-99, '/RoomA', ['/a.png'], '/a.png')
      buildRoom(-99, '/RoomB', ['/b.png'], '/b.png')
      ioStub.get.returns(clients)
    })

    describe('when the second room fails', () => {
      const roomBError = new Error('ROOM B FAILED')
      beforeEach(() => {
        getRoomStub.onFirstCall().resolves()
        getRoomStub.onSecondCall().rejects(roomBError)
      })
      it('should log once', async () => {
        await TickCountdown(knexFake, ioFake)
        expect(loggerStub.callCount).to.equal(1)
      })
      it('should log the rejecting room error', async () => {
        await TickCountdown(knexFake, ioFake)
        expect(loggerStub.firstCall.args[1]).to.equal(roomBError)
      })
      it('should emit for the successful room', async () => {
        await TickCountdown(knexFake, ioFake)
        expect(ioStub.emit.callCount).to.equal(1)
      })
    })

    describe('when the first room fails', () => {
      const roomAError = new Error('ROOM A FAILED')
      beforeEach(() => {
        getRoomStub.onFirstCall().rejects(roomAError)
        getRoomStub.onSecondCall().resolves()
      })
      it('should log once', async () => {
        await TickCountdown(knexFake, ioFake)
        expect(loggerStub.callCount).to.equal(1)
      })
      it('should log the error', async () => {
        await TickCountdown(knexFake, ioFake)
        expect(loggerStub.firstCall.args[1]).to.equal(roomAError)
      })
      it('should emit for the successful room', async () => {
        await TickCountdown(knexFake, ioFake)
        expect(ioStub.emit.callCount).to.equal(1)
      })
    })
  })

  describe('room pruning logging', () => {
    it('should log room-pruned format when countdown ticks past prune threshold', async () => {
      buildRoom(-3600, '/PrunedRoom', ['/a.png'], '/a.png')
      await TickCountdown(knexFake, ioFake)
      const hasPruneLog = loggerStub.getCalls().some((c) => c.args[0] === 'slideshow room pruned: %s (idle %ds)')
      expect(hasPruneLog).to.equal(true)
    })

    it('should log the pruned room name', async () => {
      buildRoom(-3600, '/SpecificRoom', ['/a.png'], '/a.png')
      await TickCountdown(knexFake, ioFake)
      const pruneCall = loggerStub.getCalls().find((c) => c.args[0] === 'slideshow room pruned: %s (idle %ds)')
      expect(pruneCall?.args[1]).to.equal('/SpecificRoom')
    })

    it('should not log room-pruned when room is still alive', async () => {
      buildRoom(5, '/PrunedRoom', ['/a.png'], '/a.png')
      await TickCountdown(knexFake, ioFake)
      const hasPruneLog = loggerStub.getCalls().some((c) => c.args[0] === 'slideshow room pruned: %s (idle %ds)')
      expect(hasPruneLog).to.equal(false)
    })
  })
})
