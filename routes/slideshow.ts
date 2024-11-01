'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize, dirname } from 'path'

import persistance from '../utils/persistance'
import { UriSafePath, Functions as api } from './apiFunctions'

import type { Knex } from 'knex'

interface SlideshowPages {
  pages: number
  page: number
  unread: number
  all: number
}
interface SlideshowRoom {
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

export class Config {
  public static rooms: { [name: string]: SlideshowRoom } = {}
  public static countdownDuration = 60
  public static memorySize = 100
  public static launchId = -1
}

export class Imports {
  public static setLatest = async (knex: Knex, path: string): Promise< string | null> => await api.SetLatestPicture(knex, path)
  public static setInterval = setInterval
  public static Router = Router
}

export class Functions {
  public static async GetUnreadImageCount (knex: Knex, path: string): Promise<number> {
    const counts = await knex('pictures')
      .count({ count: 'path' })
      .where('path', 'like', `${path}%`)
      .andWhere('seen', '=', false)
    if (counts[0]?.count != null) {
      return +counts[0].count
    }
    return 0
  }

  public static async GetImageCount (knex: Knex, path: string): Promise<number> {
    const counts = await knex('pictures')
      .count({ count: 'path' })
      .where('path', 'like', `${path}%`)
    if (counts[0]?.count != null) {
      return +counts[0].count
    }
    return 0
  }

  public static async GetCounts (knex: Knex, path: string, currentPage: number | undefined = undefined, mutator = (page: number): number => page): Promise<SlideshowPages> {
    const unreadcount = await Functions.GetUnreadImageCount(knex, path)
    const allcount = await Functions.GetImageCount(knex, path)
    let pages = Math.ceil(allcount / Config.memorySize)
    if (unreadcount > 0) {
      pages = Math.ceil(unreadcount / Config.memorySize)
      currentPage = 0
    } else if (currentPage == null) {
      currentPage = Math.floor(Math.random() * pages)
    } else {
      currentPage = mutator(currentPage)
      if (currentPage < 0) {
        currentPage = pages - 1
      } else if (currentPage >= pages) {
        currentPage = 0
      }
    }
    return {
      unread: unreadcount,
      all: allcount,
      pages,
      page: currentPage
    }
  }

  public static async GetImages (knex: Knex, path: string, page: number, count: number): Promise<string[]> {
    return (await knex('pictures')
      .select('path')
      .where('path', 'like', `${path}%`)
      .orderBy('seen')
      .orderBy('pathHash')
      .offset(page * count)
      .limit(count))
      .map((img: ImageWithPath) => img.path)
  }

  public static async MarkImageRead (knex: Knex, image: string): Promise<void> {
    const picture = await knex('pictures').select('seen').where({
      seen: false,
      path: image
    })
    if (picture == null || picture.length <= 0) {
      return
    }
    const folders = []
    let path = image
    while (path != null && path !== '/') {
      path = dirname(path)
      folders.push(`${path}${path !== '/' ? '/' : ''}`)
    }
    await knex('folders').increment('seenCount', 1).whereIn('path', folders)
    await knex('pictures').update({ seen: true }).where({ path: image })
  }

  public static async GetRoomAndIncrementImage (knex: Knex, name: string, increment: number = 0): Promise<SlideshowRoom> {
    let room = Config.rooms[name]
    if (room == null) {
      const pages = await Functions.GetCounts(knex, name)
      room = {
        countdown: Config.countdownDuration,
        path: name,
        pages,
        images: await Functions.GetImages(knex, name, pages.page, Config.memorySize),
        index: 0,
        uriSafeImage: undefined
      }
      Config.rooms[name] = room
    } else {
      room.index += increment
      if (room.index < 0) {
        room.pages = await Functions.GetCounts(knex, name, room.pages.page, x => x - 1)
        room.images = await Functions.GetImages(knex, name, room.pages.page, Config.memorySize)
        room.index = room.images.length - 1
      } else if (room.index >= room.images.length) {
        room.pages = await Functions.GetCounts(knex, name, room.pages.page, x => x + 1)
        room.index = 0
        room.images = await Functions.GetImages(knex, name, room.pages.page, Config.memorySize)
      }
    }
    const image = room.images[room.index]
    if (image != null) {
      await Functions.MarkImageRead(knex, image)
    }
    room.uriSafeImage = UriSafePath.encode(room.images[room.index] ?? '')
    if (increment !== 0) {
      room.countdown = Config.countdownDuration
    }
    return room
  }

  public static async TickCountdown (knex: Knex, io: WebSocketServer): Promise<void> {
    for (const room of Object.values(Config.rooms)) {
      room.countdown--
      if (room.countdown <= -60 * Config.countdownDuration) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete Config.rooms[room.path]
        continue
      }
      const sockets = io.of('/').adapter.rooms.get(room.path)
      if ((sockets?.size ?? 0) < 1) {
        continue
      }
      if (room.countdown <= 0) {
        room.countdown = Config.countdownDuration
        await Functions.GetRoomAndIncrementImage(knex, room.path, 1)
        io.to(room.path).emit('new-image', room.uriSafeImage)
      }
    }
  }

  public static HandleSocket (knex: Knex, io: WebSocketServer, socket: Socket): void {
    let socketRoom : (string | null) = null

    socket.on('get-launchId', (callback) => callback(Config.launchId))
    socket.on('join-slideshow', async (roomName: string) => {
      socketRoom = roomName
      await socket.join(roomName)
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom)
      socket.emit('new-image', room.uriSafeImage)
    })
    socket.on('prev-image', async () => {
      if (socketRoom == null) return
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom, -1)
      io.to(room.path).emit('new-image', room.uriSafeImage)
    })
    socket.on('next-image', async () => {
      if (socketRoom == null) return
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom, 1)
      io.to(room.path).emit('new-image', room.uriSafeImage)
    })
    socket.on('goto-image', async (callback) => {
      if (socketRoom == null) {
        callback(null)
        return
      }
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom)
      const picture = room.images[room.index]
      if (picture == null) {
        callback(null)
        return
      }
      const folder = await Imports.setLatest(knex, picture)
      callback(folder)
    })
  }

  public static async RootRoute (knex: Knex, req: Request, res: Response): Promise<void> {
    const folder = '/' + (req.params[0] ?? '')
    if (normalize(folder) !== folder) {
      res.status(StatusCodes.FORBIDDEN).render('error', {
        title: 'ERROR',
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!'
      })
      return
    }
    await Functions.GetRoomAndIncrementImage(knex, folder)
      .then(room => {
        if (room?.images == null || room?.images.length < 1) {
          res.status(StatusCodes.NOT_FOUND).render('error', {
            title: 'ERROR',
            code: 'E_NOT_FOUND',
            message: 'Not Found'
          })
          return
        }
        res.render('slideshow', {
          title: folder,
          folder,
          image: room.uriSafeImage
        })
      }, err => {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', {
          title: 'ERROR',
          code: 'INTERNAL_SERVER_ERROR',
          message: err
        })
      })
  }
}

export async function getRouter (_: Application, __: Server, io: WebSocketServer): Promise<Router> {
  const router = Imports.Router()
  const knex = await persistance.initialize()

  Config.launchId = Date.now()

  router.get('/launchId', (_, res) => res.json({ launchId: Config.launchId }))

  const handler = (req: Request, res: Response): void => { Functions.RootRoute(knex, req, res).catch(() => {}) }
  router.get('/', handler)
  router.get('/*', handler)

  io.on('connection', (socket) => { Functions.HandleSocket(knex, io, socket) })
  Imports.setInterval(() => { Functions.TickCountdown(knex, io).catch(() => {}) }, 1000)

  return router
}
