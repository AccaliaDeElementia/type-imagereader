'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'

import { normalize, dirname } from 'node:path'

import persistance from '../utils/persistance'
import { UriSafePath, Functions as api } from './apiFunctions'

import type { Knex } from 'knex'
import { ReqParamToString } from '../utils/helpers'

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

export const Config = {
  rooms: ((): Record<string, SlideshowRoom> => ({}))(),
  countdownDuration: 60,
  memorySize: 100,
  launchId: -1,
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
    if (roomName === null || roomName === undefined || roomName.length < 1) return
    state.SetName(roomName)
    await socket.join(roomName)
    const room = await Functions.GetRoomAndIncrementImage(knex, roomName)
    socket.emit('new-image', room.uriSafeImage)
  },
  prevImage: async (state: HandleSocketState, io: WebSocketServer, knex: Knex) => {
    if (state.roomName === null) return
    const room = await Functions.GetRoomAndIncrementImage(knex, state.roomName, -1)
    io.to(room.path).emit('new-image', room.uriSafeImage)
  },
  nextImage: async (state: HandleSocketState, io: WebSocketServer, knex: Knex) => {
    if (state.roomName === null) return
    const room = await Functions.GetRoomAndIncrementImage(knex, state.roomName, 1)
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
      .where('path', 'like', `${path}%`)
      .andWhere('seen', '=', false)
    try {
      if (counts[0]?.count !== undefined) {
        return +counts[0].count
      }
    } catch {}
    return 0
  },
  GetImageCount: async (knex: Knex, path: string): Promise<number> => {
    const counts = await knex('pictures').count({ count: 'path' }).where('path', 'like', `${path}%`)
    try {
      if (counts[0]?.count !== undefined) {
        return +counts[0].count
      }
    } catch {}
    return 0
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
    let resultPage = currentPage ?? Math.floor(Math.random() * pages)
    if (unreadcount > 0) {
      pages = Math.ceil(unreadcount / Config.memorySize)
      resultPage = 0
    } else if (currentPage !== undefined) {
      resultPage = mutator(currentPage)
      if (resultPage < 0) {
        resultPage = pages - 1
      } else if (resultPage >= pages) {
        resultPage = 0
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
        .where('path', 'like', `${path}%`)
        .orderBy('seen')
        .orderBy('pathHash')
        .offset(page * count)
        .limit(count)
    ).map((img: ImageWithPath) => img.path),
  MarkImageRead: async (knex: Knex, image: string): Promise<void> => {
    const picture = (await knex('pictures').select('seen').where({
      seen: false,
      path: image,
    })) as string[] | undefined | null
    if (picture === null || picture === undefined || picture.length <= 0) {
      return
    }
    const folders = []
    let path = image
    while (path !== '/') {
      path = dirname(path)
      folders.push(`${path}${path === '/' ? '' : '/'}`)
    }
    await knex('folders').increment('seenCount', 1).whereIn('path', folders)
    await knex('pictures').update({ seen: true }).where({ path: image })
  },
  GetRoomAndIncrementImage: async (knex: Knex, name: string, increment = 0): Promise<SlideshowRoom> => {
    let room = Config.rooms[name]
    if (room === undefined) {
      const pages = await Functions.GetCounts(knex, name)
      room = {
        countdown: Config.countdownDuration,
        path: name,
        pages,
        images: await Functions.GetImages(knex, name, pages.page, Config.memorySize),
        index: 0,
        uriSafeImage: undefined,
      }
      Config.rooms[name] = room
    } else {
      room.index += increment
      if (room.index < 0) {
        room.pages = await Functions.GetCounts(knex, name, room.pages.page, (x) => x - 1)
        room.images = await Functions.GetImages(knex, name, room.pages.page, Config.memorySize)
        room.index = room.images.length - 1
      } else if (room.index >= room.images.length) {
        room.pages = await Functions.GetCounts(knex, name, room.pages.page, (x) => x + 1)
        room.index = 0
        room.images = await Functions.GetImages(knex, name, room.pages.page, Config.memorySize)
      }
    }
    const image = room.images[room.index]
    if (image !== undefined) {
      await Functions.MarkImageRead(knex, image)
    }
    room.uriSafeImage = UriSafePath.encode(room.images[room.index] ?? '')
    if (increment !== 0) {
      room.countdown = Config.countdownDuration
    }
    return room
  },
  TickCountdown: async (knex: Knex, io: WebSocketServer): Promise<void> => {
    try {
      const roomsToUpdate: SlideshowRoom[] = []
      const newRooms: Record<string, SlideshowRoom> = {}
      for (const room of Object.values(Config.rooms)) {
        room.countdown -= 1
        if (room.countdown <= -60 * Config.countdownDuration) {
          continue
        }
        newRooms[room.path] = room
        const sockets = io.of('/').adapter.rooms.get(room.path)
        if ((sockets?.size ?? 0) < 1) {
          continue
        }
        if (room.countdown <= 0) {
          roomsToUpdate.push(room)
          room.countdown = Config.countdownDuration
        }
      }
      Config.rooms = newRooms
      await Promise.all(
        roomsToUpdate.map(async (room) => {
          await Functions.GetRoomAndIncrementImage(knex, room.path, 1)
          io.to(room.path).emit('new-image', room.uriSafeImage)
        }),
      )
    } catch {}
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
        if (room.images.length < 1) {
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
  }, 1000)

  return router
}
