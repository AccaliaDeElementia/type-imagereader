'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'
import debug from 'debug'

import { normalize, dirname } from 'node:path'

import persistance from '#utils/persistance'
import { UriSafePath, Functions as api } from './apiFunctions'

import type { Knex } from 'knex'
import {
  ALTER_COUNTER,
  HasSetValues,
  HasValue,
  HasValues,
  EscapeLikeWildcards,
  ReqParamToString,
  StringishHasValue,
  ZERO_COUNT,
} from '#utils/helpers'

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
const DEFAULT_COUNTDOWN_DURATION = 60
const ABANDONED_ROOM_PRUNE_THRESHOLD = 3_600
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
    state.SetName(roomName)
    await socket.join(roomName)
    const room = await Functions.GetRoomAndIncrementImage(knex, roomName)
    socket.emit('new-image', room.uriSafeImage)
  },
  prevImage: async (state: HandleSocketState, io: WebSocketServer, knex: Knex) => {
    if (state.roomName === null) return
    const room = await Functions.GetRoomAndIncrementImage(knex, state.roomName, ALTER_COUNTER.DECREMENT)
    io.to(room.path).emit('new-image', room.uriSafeImage)
  },
  nextImage: async (state: HandleSocketState, io: WebSocketServer, knex: Knex) => {
    if (state.roomName === null) return
    const room = await Functions.GetRoomAndIncrementImage(knex, state.roomName, ALTER_COUNTER.INCREMENT)
    io.to(room.path).emit('new-image', room.uriSafeImage)
  },
  gotoImage: async (callback: SocketCallback, state: HandleSocketState, knex: Knex) => {
    if (state.roomName === null) {
      callback(null)
      return
    }
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
  GetUnreadImageCount: async (knex: Knex, path: string): Promise<number> => {
    const counts = await knex('pictures')
      .count({ count: 'path' })
      .where('path', 'like', `${EscapeLikeWildcards(path)}%`)
      .andWhere('seen', '=', false)
    try {
      const count = counts.shift()?.count
      if (HasValue(count)) {
        return Number.parseInt(`${count}`, 10)
      }
    } catch {}
    return ZERO_COUNT
  },
  GetImageCount: async (knex: Knex, path: string): Promise<number> => {
    const counts = await knex('pictures')
      .count({ count: 'path' })
      .where('path', 'like', `${EscapeLikeWildcards(path)}%`)
    try {
      const count = counts.shift()?.count
      if (HasValue(count)) {
        return Number.parseInt(`${count}`, 10)
      }
    } catch {}
    return ZERO_COUNT
  },
  GetCounts: async (
    knex: Knex,
    path: string,
    currentPage?: number,
    mutator = (page: number): number => page,
  ): Promise<SlideshowPages> => {
    const unreadcount = await Functions.GetUnreadImageCount(knex, path)
    const allcount = await Functions.GetImageCount(knex, path)
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
        resultPage = pages + ALTER_COUNTER.DECREMENT
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
    const picture = (await knex('pictures').select('seen').where({
      seen: false,
      path: image,
    })) as string[] | undefined | null
    if (!HasValues(picture)) {
      return
    }
    const folders = []
    let path = image
    while (path !== '/') {
      path = dirname(path)
      folders.push(`${path}${path === '/' ? '' : '/'}`)
    }
    await knex('folders').increment('seenCount', ALTER_COUNTER.INCREMENT).whereIn('path', folders)
    await knex('pictures').update({ seen: true }).where({ path: image })
  },
  GetRoomAndIncrementImage: async (
    knex: Knex,
    name: string,
    increment = ALTER_COUNTER.NONE as number,
  ): Promise<SlideshowRoom> => {
    const advancePage = async (
      currentPage: number,
      currentUnread: number,
      direction: ALTER_COUNTER,
    ): Promise<{ pages: SlideshowPages; images: string[] }> => {
      const wasUnread = currentUnread > ZERO_COUNT
      let pages = await Functions.GetCounts(knex, name, currentPage, (x) => x + direction)
      if (wasUnread && pages.unread === ZERO_COUNT) {
        pages = await Functions.GetCounts(knex, name)
      }
      const images = await Functions.GetImages(knex, name, pages.page, Config.memorySize)
      return { pages, images }
    }
    let room = Config.rooms[name]
    if (room === undefined) {
      const pages = await Functions.GetCounts(knex, name)
      room = {
        countdown: Config.countdownDuration,
        path: name,
        pages,
        images: await Functions.GetImages(knex, name, pages.page, Config.memorySize),
        index: ZERO_COUNT,
        uriSafeImage: undefined,
      }
      Config.rooms[name] ??= room
    } else {
      room.index += increment
      if (room.images.length === ZERO_COUNT) {
        room.index = ZERO_COUNT
      } else if (room.index < ZERO_COUNT) {
        const result = await advancePage(room.pages.page, room.pages.unread, ALTER_COUNTER.DECREMENT)
        room.pages = result.pages
        room.images = result.images
        room.index = Math.max(room.images.length + ALTER_COUNTER.DECREMENT, ZERO_COUNT)
      } else if (room.index >= room.images.length) {
        const result = await advancePage(room.pages.page, room.pages.unread, ALTER_COUNTER.INCREMENT)
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
    if (increment !== (ALTER_COUNTER.NONE as number)) {
      room.countdown = Config.countdownDuration
    }
    return room
  },
  TickCountdown: async (knex: Knex, io: WebSocketServer): Promise<void> => {
    try {
      const roomsToUpdate: SlideshowRoom[] = []
      const newRooms: Record<string, SlideshowRoom> = {}
      for (const room of Object.values(Config.rooms)) {
        room.countdown += ALTER_COUNTER.DECREMENT
        if (room.countdown <= -ABANDONED_ROOM_PRUNE_THRESHOLD) {
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
          await Functions.GetRoomAndIncrementImage(knex, room.path, ALTER_COUNTER.INCREMENT)
          if (HasValues(room.images)) {
            io.to(room.path).emit('new-image', room.uriSafeImage)
          }
        }),
      )
    } catch (err) {
      Imports.logger('TickCountdown error', err)
    }
  },
  HandleSocket: (knex: Knex, io: WebSocketServer, socket: Socket): HandleSocketState => {
    const state = new HandleSocketState()
    socket.on('get-launchId', (callback: SocketCallback) => {
      SocketHandlers.getLaunchId(callback)
    })
    socket.on('join-slideshow', (roomName?: string) => {
      void SocketHandlers.joinSlideshow(roomName, state, socket, knex)
    })
    socket.on('prev-image', () => {
      void SocketHandlers.prevImage(state, io, knex)
    })
    socket.on('next-image', () => {
      void SocketHandlers.nextImage(state, io, knex)
    })
    socket.on('goto-image', (callback: SocketCallback) => {
      void SocketHandlers.gotoImage(callback, state, knex)
    })
    return state
  },
  RootRoute: async (knex: Knex, req: Request, res: Response): Promise<void> => {
    const folder = `/${ReqParamToString(req.params.path)}`
    if (normalize(folder) !== folder || folder.startsWith('/~')) {
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
