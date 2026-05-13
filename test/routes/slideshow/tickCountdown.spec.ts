'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { Config, tickCountdown, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer } from 'socket.io'
import type { MockInstance } from 'vitest'

const CLIENTS_WITH_ONE = new Set(['/'])

// Client-presence variants that exercise every branch of "do we have viewers?":
// null/undefined/empty-set all read as "no viewers"; CLIENTS_WITH_ONE reads as
// "viewers present". Most scenarios behave identically across all four.
const ALL_CLIENT_VALUES: Array<[string, unknown]> = [
  ['no clients', null],
  ['nil clients', undefined],
  ['empty clients', new Set()],
  ['with clients', CLIENTS_WITH_ONE],
]

// Client-presence variants that should be equivalent to "no viewers". Used
// where the "with viewers" branch differs and is tested separately.
const CLIENT_VALUES_WITHOUT_VIEWERS: Array<[string, unknown]> = [
  ['no clients', null],
  ['nil clients', undefined],
  ['empty clients', new Set()],
]

describe('routes/slideshow tickCountdown()', () => {
  let knexFake = stubToKnex({ knex: Math.random() })
  let ioStub = {
    of: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    adapter: {},
    rooms: {},
    to: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    get: vi.fn().mockReturnValue([]),
    emit: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
  }
  let ioFake = cast<WebSocketServer>(ioStub)
  let getRoomStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
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
    knexFake = stubToKnex({ knex: Math.random() })
    ioStub = {
      of: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      adapter: {},
      rooms: {},
      to: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      get: vi.fn().mockReturnValue([]),
      emit: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
    }
    ioFake = cast<WebSocketServer>(ioStub)
    ioStub.adapter = ioStub
    ioStub.rooms = ioStub
    Config.rooms = {}
    Config.countdownDuration = 60
    getRoomStub = vi.spyOn(Internals, 'getRoomAndIncrementImage').mockResolvedValue(cast(undefined))
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('with empty room list', () => {
    beforeEach(async () => {
      await tickCountdown(knexFake, ioFake)
    })
    it('should not call ioStub.of', () => {
      expect(ioStub.of.mock.calls.length).toBe(0)
    })
    it('should not call getRoomAndIncrementImage', () => {
      expect(getRoomStub.mock.calls.length).toBe(0)
    })
    it('should not log', () => {
      expect(loggerStub.mock.calls.length).toBe(0)
    })
  })

  describe('with expired room (countdown -3599)', () => {
    ALL_CLIENT_VALUES.forEach(([label, clientsValue]) => {
      describe(`and ${label}`, () => {
        beforeEach(async () => {
          buildRoom(-3599)
          ioStub.get.mockReturnValue(clientsValue)
          await tickCountdown(knexFake, ioFake)
        })
        it('should remove the room from Config.rooms', () => {
          expect(Object.keys(Config.rooms)).not.toContain('/Room')
        })
        it('should not call getRoomAndIncrementImage', () => {
          expect(getRoomStub.mock.calls.length).toBe(0)
        })
        it('should not call ioStub.of', () => {
          expect(ioStub.of.mock.calls.length).toBe(0)
        })
        it('should not emit', () => {
          expect(ioStub.to.mock.calls.length).toBe(0)
        })
      })
    })
  })

  describe('with near-expired room (countdown -3598)', () => {
    beforeEach(async () => {
      buildRoom(-3598)
      ioStub.get.mockReturnValue(null)
      await tickCountdown(knexFake, ioFake)
    })
    it('should keep the room in Config.rooms', () => {
      expect(Object.keys(Config.rooms)).toContain('/Room')
    })
    it('should call ioStub.of to check for clients', () => {
      expect(ioStub.of.mock.calls.length).toBe(1)
    })
  })

  describe('with active room (countdown -5) and null clients', () => {
    beforeEach(async () => {
      buildRoom(-5)
      ioStub.get.mockReturnValue(null)
      await tickCountdown(knexFake, ioFake)
    })
    it('should call ioStub.of once', () => {
      expect(ioStub.of.mock.calls.length).toBe(1)
    })
    it('should call ioStub.of with root namespace', () => {
      expect(ioStub.of.mock.calls[0]).toEqual(['/'])
    })
    it('should call ioStub.get once', () => {
      expect(ioStub.get.mock.calls.length).toBe(1)
    })
    it('should call ioStub.get with the room name', () => {
      expect(ioStub.get.mock.calls[0]).toEqual(['/Room'])
    })
    it('should decrement countdown by 1', () => {
      expect(Config.rooms['/Room']?.countdown).toBe(-6)
    })
  })

  describe('with active room (countdown -5) and undefined clients', () => {
    it('should decrement countdown by 1', async () => {
      buildRoom(-5)
      ioStub.get.mockReturnValue(undefined)
      await tickCountdown(knexFake, ioFake)
      expect(Config.rooms['/Room']?.countdown).toBe(-6)
    })
  })

  describe('countdown decrement at higher values', () => {
    const decrementCases: Array<[string, number, unknown, number]> = [
      ['countdown 6 with empty clients', 6, new Set(), 5],
      ['countdown 7 with clients', 7, CLIENTS_WITH_ONE, 6],
    ]
    decrementCases.forEach(([label, from, clientsValue, expected]) => {
      it(`should decrement (${label}) ${from} → ${expected}`, async () => {
        buildRoom(from)
        ioStub.get.mockReturnValue(clientsValue)
        await tickCountdown(knexFake, ioFake)
        expect(Config.rooms['/Room']?.countdown).toBe(expected)
      })
    })
  })

  describe('countdown reset when due/overdue/near-expired with clients', () => {
    const resetCases: Array<[string, number]> = [
      ['newly due', 1],
      ['overdue', 0],
      ['near expired', -2999],
    ]
    resetCases.forEach(([label, countdown]) => {
      it(`should reset countdown to 60 (${label})`, async () => {
        buildRoom(countdown)
        ioStub.get.mockReturnValue(CLIENTS_WITH_ONE)
        await tickCountdown(knexFake, ioFake)
        expect(Config.rooms['/Room']?.countdown).toBe(60)
      })
    })
  })

  describe('with valid room (countdown 99)', () => {
    ALL_CLIENT_VALUES.forEach(([label, clientsValue]) => {
      describe(`and ${label}`, () => {
        beforeEach(async () => {
          buildRoom(99)
          ioStub.get.mockReturnValue(clientsValue)
          await tickCountdown(knexFake, ioFake)
        })
        it('should not call getRoomAndIncrementImage', () => {
          expect(getRoomStub.mock.calls.length).toBe(0)
        })
        it('should call ioStub.of once', () => {
          expect(ioStub.of.mock.calls.length).toBe(1)
        })
      })
    })
  })

  describe('with not-yet-due room (countdown 2)', () => {
    ALL_CLIENT_VALUES.forEach(([label, clientsValue]) => {
      it(`should not emit with ${label}`, async () => {
        buildRoom(2)
        ioStub.get.mockReturnValue(clientsValue)
        await tickCountdown(knexFake, ioFake)
        expect(ioStub.to.mock.calls.length).toBe(0)
      })
    })
  })

  describe('with newly-due room (countdown 1)', () => {
    describe('without images', () => {
      ALL_CLIENT_VALUES.forEach(([label, clientsValue]) => {
        it(`should not emit with ${label}`, async () => {
          buildRoom(1, '/Room', [])
          ioStub.get.mockReturnValue(clientsValue)
          await tickCountdown(knexFake, ioFake)
          expect(ioStub.to.mock.calls.length).toBe(0)
        })
      })
    })
    it('should emit once when room has images and clients', async () => {
      buildRoom(1)
      ioStub.get.mockReturnValue(CLIENTS_WITH_ONE)
      await tickCountdown(knexFake, ioFake)
      expect(ioStub.to.mock.calls.length).toBe(1)
    })
  })

  describe('with due room (countdown -99)', () => {
    describe('without viewers', () => {
      CLIENT_VALUES_WITHOUT_VIEWERS.forEach(([label, clientsValue]) => {
        it(`should not call getRoomAndIncrementImage with ${label}`, async () => {
          buildRoom(-99)
          ioStub.get.mockReturnValue(clientsValue)
          await tickCountdown(knexFake, ioFake)
          expect(getRoomStub.mock.calls.length).toBe(0)
        })
      })
    })
    describe('with clients and images', () => {
      beforeEach(async () => {
        buildRoom(-99)
        ioStub.get.mockReturnValue(CLIENTS_WITH_ONE)
        await tickCountdown(knexFake, ioFake)
      })
      it('should call getRoomAndIncrementImage once', () => {
        expect(getRoomStub.mock.calls.length).toBe(1)
      })
      it('should pass knex to getRoomAndIncrementImage', () => {
        expect(getRoomStub.mock.calls[0]?.[0]).toBe(knexFake)
      })
      it('should pass the room name to getRoomAndIncrementImage', () => {
        expect(getRoomStub.mock.calls[0]?.[1]).toBe('/Room')
      })
      it('should increment by 1 image', () => {
        expect(getRoomStub.mock.calls[0]?.[2]).toBe(1)
      })
      it('should emit to the room', () => {
        expect(ioStub.to.mock.calls[0]).toEqual(['/Room'])
      })
      it('should emit one message', () => {
        expect(ioStub.emit.mock.calls.length).toBe(1)
      })
      it('should emit image-changed event', () => {
        expect(ioStub.emit.mock.calls[0]?.[0]).toBe('image-changed')
      })
      it('should emit the new image path', () => {
        expect(ioStub.emit.mock.calls[0]?.[1]).toBe('/an/image.png')
      })
    })
  })

  describe('when getRoomAndIncrementImage mutates the room', () => {
    beforeEach(() => {
      buildRoom(-99, '/Room', ['/old/image.png'], '/old/image.png')
      ioStub.get.mockReturnValue(CLIENTS_WITH_ONE)
    })
    it('should emit updated uriSafeImage', async () => {
      getRoomStub.mockImplementation((_knex: unknown, name: string) => {
        const room = Config.rooms[name]
        if (room !== undefined) {
          room.uriSafeImage = '/new/image.png'
          room.images = ['/new/image.png']
        }
      })
      await tickCountdown(knexFake, ioFake)
      expect(ioStub.emit.mock.calls[0]?.[1]).toBe('/new/image.png')
    })
    it('should not emit when getRoomAndIncrementImage empties the image list', async () => {
      getRoomStub.mockImplementation((_knex: unknown, name: string) => {
        const room = Config.rooms[name]
        if (room !== undefined) {
          room.images = []
          room.uriSafeImage = ''
        }
      })
      await tickCountdown(knexFake, ioFake)
      expect(ioStub.to.mock.calls.length).toBe(0)
    })
  })

  describe('when getRoomAndIncrementImage rejects with an error', () => {
    const tickFailedError = new Error('TICK FAILED')
    beforeEach(() => {
      buildRoom(-99)
      ioStub.get.mockReturnValue(new Set(['/']))
      getRoomStub.mockRejectedValue(tickFailedError)
    })
    it('should log once', async () => {
      await tickCountdown(knexFake, ioFake)
      expect(loggerStub.mock.calls.length).toBe(1)
    })
    it("should log with message 'tickCountdown error'", async () => {
      await tickCountdown(knexFake, ioFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('tickCountdown error')
    })
    it('should log the error object', async () => {
      await tickCountdown(knexFake, ioFake)
      expect(loggerStub.mock.calls[0]?.[1]).toBe(tickFailedError)
    })
  })

  describe('with two due rooms where one fails', () => {
    beforeEach(() => {
      buildRoom(-99, '/RoomA', ['/a.png'], '/a.png')
      buildRoom(-99, '/RoomB', ['/b.png'], '/b.png')
      ioStub.get.mockReturnValue(CLIENTS_WITH_ONE)
    })

    describe('when the second room fails', () => {
      const roomBError = new Error('ROOM B FAILED')
      beforeEach(() => {
        getRoomStub.mockResolvedValueOnce(cast(undefined))
        getRoomStub.mockRejectedValueOnce(roomBError)
      })
      it('should log once', async () => {
        await tickCountdown(knexFake, ioFake)
        expect(loggerStub.mock.calls.length).toBe(1)
      })
      it('should log the rejecting room error', async () => {
        await tickCountdown(knexFake, ioFake)
        expect(loggerStub.mock.calls[0]?.[1]).toBe(roomBError)
      })
      it('should emit for the successful room', async () => {
        await tickCountdown(knexFake, ioFake)
        expect(ioStub.emit.mock.calls.length).toBe(1)
      })
    })

    describe('when the first room fails', () => {
      const roomAError = new Error('ROOM A FAILED')
      beforeEach(() => {
        getRoomStub.mockRejectedValueOnce(roomAError)
        getRoomStub.mockResolvedValueOnce(cast(undefined))
      })
      it('should log once', async () => {
        await tickCountdown(knexFake, ioFake)
        expect(loggerStub.mock.calls.length).toBe(1)
      })
      it('should log the error', async () => {
        await tickCountdown(knexFake, ioFake)
        expect(loggerStub.mock.calls[0]?.[1]).toBe(roomAError)
      })
      it('should emit for the successful room', async () => {
        await tickCountdown(knexFake, ioFake)
        expect(ioStub.emit.mock.calls.length).toBe(1)
      })
    })
  })

  describe('room pruning logging', () => {
    it('should log room-pruned format when countdown ticks past prune threshold', async () => {
      buildRoom(-3600, '/PrunedRoom', ['/a.png'], '/a.png')
      await tickCountdown(knexFake, ioFake)
      const hasPruneLog = loggerStub.mock.calls.some((c) => c[0] === 'slideshow room pruned: %s (idle %ds)')
      expect(hasPruneLog).toBe(true)
    })

    it('should log the pruned room name', async () => {
      buildRoom(-3600, '/SpecificRoom', ['/a.png'], '/a.png')
      await tickCountdown(knexFake, ioFake)
      const pruneCall = loggerStub.mock.calls.find((c) => c[0] === 'slideshow room pruned: %s (idle %ds)')
      expect(pruneCall?.[1]).toBe('/SpecificRoom')
    })

    it('should not log room-pruned when room is still alive', async () => {
      buildRoom(5, '/PrunedRoom', ['/a.png'], '/a.png')
      await tickCountdown(knexFake, ioFake)
      const hasPruneLog = loggerStub.mock.calls.some((c) => c[0] === 'slideshow room pruned: %s (idle %ds)')
      expect(hasPruneLog).toBe(false)
    })
  })
})
