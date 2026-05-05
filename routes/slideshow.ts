'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'
import debug from 'debug'

import { isPathTraversal as _isPathTraversal, GetParentFolders as _GetParentFolders } from '#utils/Path.js'

import persistance from '#utils/persistance.js'
import { UriSafePath, Functions as api } from './apiFunctions.js'
import { SocketEvents } from '#contracts/socketEvents.js'

import type { Knex } from 'knex'
import {
  STEP,
  HasSetValues,
  HasValue,
  HasValues,
  EscapeLikeWildcards,
  ReqParamToString,
  StringishHasValue,
  ZERO_COUNT,
} from '#utils/helpers.js'

interface SlideshowPages {
  pages: number
  page: number
  unread: number
  all: number
}
export interface SlideshowRoom {
  countdown: number
  pages: SlideshowPages
  index: number
  path: string
  images: string[]
  uriSafeImage: string | undefined
}

interface ImageWithPath {
  path: string
}

type SocketCallback = (value: string | number | null) => void

const logger = debug('type-imagereader:slideshow')

const DEFAULT_LAUNCH_ID = -1
const DEFAULT_MEMORY_SIZE = 100
const DEFAULT_COUNTDOWN_DURATION = 60 // ticks (1 tick = 1 second at TICK_COUNTDOWN_INTERVAL)
const ABANDONED_ROOM_PRUNE_THRESHOLD = 3_600 // ticks (3600 = 1 hour)
const COUNTDOWN_TICK = -1 // countdown decrements by 1 each interval
const TICK_COUNTDOWN_INTERVAL = 1000 // one second in Millis

export const Config = {
  rooms: ((): Record<string, SlideshowRoom> => ({}))(),
  countdownDuration: DEFAULT_COUNTDOWN_DURATION,
  memorySize: DEFAULT_MEMORY_SIZE,
  launchId: DEFAULT_LAUNCH_ID,
}

export const SocketHandlers = {
  getLaunchId: (callback: SocketCallback) => {
    callback(Config.launchId)
  },
  joinSlideshow: async (
    roomName: string | undefined | null,
    state: HandleSocketState,
    socket: Socket,
    knex: Knex,
  ): Promise<void> => {
    if (!StringishHasValue(roomName)) return
    Imports.logger('joinSlideshow %s (socket=%s)', roomName, socket.id)
    state.SetName(roomName)
    await socket.join(roomName)
    const room = await Functions.GetRoomAndIncrementImage(knex, roomName)
    socket.emit(SocketEvents.ImageChanged, room.uriSafeImage)
  },
  prevImage: async (state: HandleSocketState, io: WebSocketServer, knex: Knex) => {
    if (state.roomName === null) return
    Imports.logger('prevImage in %s', state.roomName)
    const room = await Functions.GetRoomAndIncrementImage(knex, state.roomName, STEP.BACK)
    io.to(room.path).emit(SocketEvents.ImageChanged, room.uriSafeImage)
  },
  nextImage: async (state: HandleSocketState, io: WebSocketServer, knex: Knex) => {
    if (state.roomName === null) return
    Imports.logger('nextImage in %s', state.roomName)
    const room = await Functions.GetRoomAndIncrementImage(knex, state.roomName, STEP.FORWARD)
    io.to(room.path).emit(SocketEvents.ImageChanged, room.uriSafeImage)
  },
  gotoImage: async (callback: SocketCallback, state: HandleSocketState, knex: Knex) => {
    if (state.roomName === null) {
      callback(null)
      return
    }
    Imports.logger('gotoImage in %s', state.roomName)
    const room = await Functions.GetRoomAndIncrementImage(knex, state.roomName)
    const picture = room.images[room.index]
    if (picture === undefined) {
      callback(null)
      return
    }
    const folder = await Imports.setLatest(knex, picture)
    callback(folder)
  },
}

export const Imports = {
  logger,
  setLatest: async (knex: Knex, path: string): Promise<string | null> => await api.SetLatestPicture(knex, path),
  GetParentFolders: _GetParentFolders,
  isPathTraversal: _isPathTraversal,
  Router,
}
export class HandleSocketState {
  roomName: string | null
  constructor() {
    this.roomName = null
  }
  SetName(name: string): void {
    this.roomName = name
  }
}
export const Functions = {
  GetImageCount: async (knex: Knex, path: string, filter: 'all' | 'unread' = 'all'): Promise<number> => {
    let query = knex('pictures')
      .count({ count: 'path' })
      .where('path', 'like', `${EscapeLikeWildcards(path)}%`)
    if (filter === 'unread') {
      query = query.andWhere('seen', '=', false)
    }
    try {
      const count = (await query).shift()?.count
      if (HasValue(count)) {
        return Number.parseInt(`${count}`, 10)
      }
    } catch (err) {
      Imports.logger('GetImageCount query error', err)
    }
    return ZERO_COUNT
  },
  GetCounts: async (
    knex: Knex,
    path: string,
    currentPage?: number,
    mutator = (page: number): number => page,
  ): Promise<SlideshowPages> => {
    const [unreadcount, allcount] = await Promise.all([
      Functions.GetImageCount(knex, path, 'unread'),
      Functions.GetImageCount(knex, path),
    ])
    let pages = Math.ceil(allcount / Config.memorySize)
    if (pages === ZERO_COUNT) {
      return { unread: unreadcount, all: allcount, pages: ZERO_COUNT, page: ZERO_COUNT }
    }
    let resultPage = currentPage ?? Math.floor(Math.random() * pages)
    if (unreadcount > ZERO_COUNT) {
      pages = Math.ceil(unreadcount / Config.memorySize)
      // Always anchor to page 0 for unread images. As images are viewed they are
      // marked seen and drop out of the unread ordering, shifting remaining unseen
      // images toward page 0. Applying a page mutator here would skip those images.
      resultPage = ZERO_COUNT
    } else if (currentPage !== undefined) {
      resultPage = mutator(currentPage)
      if (resultPage < ZERO_COUNT) {
        resultPage = pages + STEP.BACK
      } else if (resultPage >= pages) {
        resultPage = ZERO_COUNT
      }
    }
    return {
      unread: unreadcount,
      all: allcount,
      pages,
      page: resultPage,
    }
  },
  GetImages: async (knex: Knex, path: string, page: number, count: number): Promise<string[]> =>
    (
      await knex('pictures')
        .select('path')
        .where('path', 'like', `${EscapeLikeWildcards(path)}%`)
        .orderBy('seen')
        .orderBy('pathHash') // pseudo-random but stable order across pages and restarts
        .offset(page * count)
        .limit(count)
    ).map((img: ImageWithPath) => img.path),
  MarkImageRead: async (knex: Knex, image: string): Promise<void> => {
    // Atomic conditional flip: the seen=false guard means only one concurrent UPDATE matches a row;
    // the others see a zero rowcount and skip the seenCount increment. PostgreSQL serializes via row
    // locks; SQLite via its whole-database write lock — same end-state either way.
    const flipped = await knex('pictures').update({ seen: true }).where({ path: image, seen: false })
    if (flipped <= ZERO_COUNT) return
    await knex('folders').increment('seenCount', STEP.FORWARD).whereIn('path', Imports.GetParentFolders(image))
  },
  GetRoomAndIncrementImage: async (knex: Knex, name: string, increment: STEP = STEP.NONE): Promise<SlideshowRoom> => {
    const advancePage = async (
      currentPage: number,
      currentUnread: number,
      direction: STEP,
    ): Promise<{ pages: SlideshowPages; images: string[] }> => {
      const hadUnread = currentUnread > ZERO_COUNT
      let pages = await Functions.GetCounts(knex, name, currentPage, (x) => x + direction)
      if (hadUnread && pages.unread === ZERO_COUNT) {
        pages = await Functions.GetCounts(knex, name)
      }
      const images = await Functions.GetImages(knex, name, pages.page, Config.memorySize)
      return { pages, images }
    }
    let room = Config.rooms[name]
    if (room === undefined) {
      const pages = await Functions.GetCounts(knex, name)
      Imports.logger('slideshow room created: %s (pages=%d unread=%d)', name, pages.pages, pages.unread)
      const newRoom: SlideshowRoom = {
        countdown: Config.countdownDuration,
        path: name,
        pages,
        images: await Functions.GetImages(knex, name, pages.page, Config.memorySize),
        index: ZERO_COUNT,
        uriSafeImage: undefined,
      }
      // If a concurrent call already populated the room, surrender to it so all callers share state
      Config.rooms[name] ??= newRoom
      room = Config.rooms[name]
    } else {
      room.index += increment
      if (room.images.length === ZERO_COUNT) {
        room.index = ZERO_COUNT // no images on this page — stay at zero
      } else if (room.index < ZERO_COUNT) {
        // stepped before first image — load previous page and land on its last image
        const result = await advancePage(room.pages.page, room.pages.unread, STEP.BACK)
        room.pages = result.pages
        room.images = result.images
        room.index = Math.max(room.images.length + STEP.BACK, ZERO_COUNT)
      } else if (room.index >= room.images.length) {
        // stepped past last image — load next page and land on its first image
        const result = await advancePage(room.pages.page, room.pages.unread, STEP.FORWARD)
        room.pages = result.pages
        room.images = result.images
        room.index = ZERO_COUNT
      }
    }
    const image = room.images[room.index]
    if (image !== undefined) {
      await Functions.MarkImageRead(knex, image)
    }
    room.uriSafeImage = UriSafePath.encode(room.images[room.index] ?? '')
    if (increment !== STEP.NONE) {
      room.countdown = Config.countdownDuration
    }
    return room
  },
  TickCountdown: async (knex: Knex, io: WebSocketServer): Promise<void> => {
    try {
      const roomsToUpdate: SlideshowRoom[] = []
      const newRooms: Record<string, SlideshowRoom> = {}
      for (const room of Object.values(Config.rooms)) {
        room.countdown += COUNTDOWN_TICK
        if (room.countdown <= -ABANDONED_ROOM_PRUNE_THRESHOLD) {
          Imports.logger('slideshow room pruned: %s (idle %ds)', room.path, ABANDONED_ROOM_PRUNE_THRESHOLD)
          continue
        }
        newRooms[room.path] = room
        const sockets = io.of('/').adapter.rooms.get(room.path)
        if (!HasSetValues(sockets)) {
          continue
        }
        if (room.countdown <= ZERO_COUNT) {
          roomsToUpdate.push(room)
          room.countdown = Config.countdownDuration
        }
      }
      Config.rooms = newRooms
      await Promise.all(
        roomsToUpdate.map(async (room) => {
          await Functions.GetRoomAndIncrementImage(knex, room.path, STEP.FORWARD)
          if (HasValues(room.images)) {
            io.to(room.path).emit(SocketEvents.ImageChanged, room.uriSafeImage)
          }
        }),
      )
    } catch (err) {
      Imports.logger('TickCountdown error', err)
    }
  },
  HandleSocket: (knex: Knex, io: WebSocketServer, socket: Socket): HandleSocketState => {
    const state = new HandleSocketState()
    socket.on(SocketEvents.GetLaunchId, (callback: SocketCallback) => {
      SocketHandlers.getLaunchId(callback)
    })
    socket.on(SocketEvents.JoinSlideshow, (roomName?: string) => {
      SocketHandlers.joinSlideshow(roomName, state, socket, knex).catch((err: unknown) => {
        Imports.logger('joinSlideshow error', err)
      })
    })
    socket.on(SocketEvents.PrevImage, () => {
      SocketHandlers.prevImage(state, io, knex).catch((err: unknown) => {
        Imports.logger('prevImage error', err)
      })
    })
    socket.on(SocketEvents.NextImage, () => {
      SocketHandlers.nextImage(state, io, knex).catch((err: unknown) => {
        Imports.logger('nextImage error', err)
      })
    })
    socket.on(SocketEvents.GotoImage, (callback: SocketCallback) => {
      SocketHandlers.gotoImage(callback, state, knex).catch((err: unknown) => {
        Imports.logger('gotoImage error', err)
        callback(null)
      })
    })
    return state
  },
  RootRoute: async (knex: Knex, req: Request, res: Response): Promise<void> => {
    const folder = `/${ReqParamToString(req.params.path)}`
    Imports.logger('GET /slideshow %s', folder)
    if (Imports.isPathTraversal(folder)) {
      Imports.logger('path traversal blocked: %s', folder)
      res.status(StatusCodes.FORBIDDEN).render('error', {
        title: 'ERROR',
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
      })
      return
    }
    await Functions.GetRoomAndIncrementImage(knex, folder).then(
      (room) => {
        if (!HasValues(room.images)) {
          Imports.logger('slideshow folder empty: %s', folder)
          res.status(StatusCodes.NOT_FOUND).render('error', {
            title: 'ERROR',
            code: 'E_NOT_FOUND',
            message: 'Not Found',
          })
          return
        }
        res.render('slideshow', {
          title: folder,
          folder,
          image: room.uriSafeImage,
        })
      },
      (err: unknown) => {
        Imports.logger('slideshow render error: %s', err instanceof Error ? err.message : String(err))
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', {
          title: 'ERROR',
          code: 'INTERNAL_SERVER_ERROR',
          message: err,
        })
      },
    )
  },
}

export async function getRouter(_: Application, __: Server, io: WebSocketServer): Promise<Router> {
  const router = Imports.Router()
  const knex = await persistance.initialize()

  Config.launchId = Date.now()

  router.get('/launchId', (_, res) => res.json({ launchId: Config.launchId }))

  const handler = (req: Request, res: Response): void => {
    void Functions.RootRoute(knex, req, res)
  }
  router.get('/', handler)
  router.get('/*path', handler)

  io.on('connection', (socket) => {
    Functions.HandleSocket(knex, io, socket)
  })
  setInterval(() => {
    void Functions.TickCountdown(knex, io)
  }, TICK_COUNTDOWN_INTERVAL)

  return router
}
