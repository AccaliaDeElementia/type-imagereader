'use sanity'

import { Application, Router, Request, Response } from 'express'
import { Server as WebSocketServer, Socket } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize, dirname } from 'path'

import persistance from '../utils/persistance'
import { UriSafePath, Functions as api } from './apiFunctions'

import { Knex } from 'knex'

interface SlideshowRoom {
  countdown: number,
  index: number,
  path: string,
  images: string[],
  uriSafeImage: string|undefined
}

interface ImageWithPath {
  path: string
}

export class Config {
  public static rooms: {[name: string]: SlideshowRoom} = {}
  public static countdownDuration = 60
  public static memorySize = 100
}

export class Imports {
  public static setLatest = api.SetLatestPicture
  public static setInterval = setInterval
  public static Router = Router
}

export class Functions {
  public static async GetImages (knex: Knex, path: string, count: number): Promise<string[]> {
    return (await knex('pictures')
      .select('path')
      .where('path', 'like', `${path}%`)
      .orderBy('seen')
      .orderByRaw('RANDOM()')
      .limit(count))
      .map((img: ImageWithPath) => img.path)
  }

  public static async MarkImageRead (knex: Knex, image: string): Promise<void> {
    const picture = await knex('pictures').select('seen').where({
      seen: false,
      path: image
    })
    if (!picture || !picture.length) {
      return
    }
    const folders = []
    let path = image
    while (path && path !== '/') {
      path = dirname(path)
      folders.push(`${path}${path !== '/' ? '/' : ''}`)
    }
    await knex('folders').increment('seenCount', 1).whereIn('path', folders)
    await knex('pictures').update({ seen: true }).where({ path: image })
  }

  public static async GetRoomAndIncrementImage (knex: Knex, name: string, increment: number = 0): Promise<SlideshowRoom> {
    let room = Config.rooms[name]
    if (!room) {
      room = {
        countdown: Config.countdownDuration,
        path: name,
        images: await Functions.GetImages(knex, name, Config.memorySize * 2),
        index: Config.memorySize - 1 - increment,
        uriSafeImage: undefined
      }
      Config.rooms[name] = room
    }
    room.index += increment
    if (room.index < 0) {
      const after = room.images.slice(0, Config.memorySize)
      room.images = await Functions.GetImages(knex, name, Config.memorySize)
      room.index = room.images.length - 1
      room.images = room.images.concat(after)
    } else if (room.index >= room.images.length) {
      room.images = room.images.slice(-Config.memorySize)
      room.index = room.images.length
      room.images = room.images.concat(await Functions.GetImages(knex, name, Config.memorySize))
    }
    const image = room.images[room.index]
    if (image) {
      await Functions.MarkImageRead(knex, image)
    }
    room.uriSafeImage = UriSafePath.encode(room.images[room.index] || '')
    return room
  }

  public static async TickCountdown (knex: Knex, io: WebSocketServer) {
    for (const room of Object.values(Config.rooms)) {
      room.countdown--
      if (room.countdown <= -60 * Config.countdownDuration) {
        delete Config.rooms[room.path]
        continue
      }
      const sockets = io.of('/').adapter.rooms.get(room.path)
      if (!sockets || sockets.size < 1) {
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
    socket.on('join-slideshow', async (roomName: string) => {
      socketRoom = roomName
      socket.join(roomName)
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom)
      socket.emit('new-image', room.uriSafeImage)
    })
    socket.on('prev-image', async () => {
      if (!socketRoom) return
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom, -1)
      io.to(room.path).emit('new-image', room.uriSafeImage)
    })
    socket.on('next-image', async () => {
      if (!socketRoom) return
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom, 1)
      io.to(room.path).emit('new-image', room.uriSafeImage)
    })
    socket.on('goto-image', async (callback) => {
      if (!socketRoom) {
        callback(null)
        return
      }
      const room = await Functions.GetRoomAndIncrementImage(knex, socketRoom)
      const picture = room.images[room.index]
      if (!picture) {
        callback(null)
        return
      }
      const folder = await Imports.setLatest(knex, picture)
      callback(folder)
    })
  }
}

export async function getRouter (_: Application, __: Server, io: WebSocketServer) {
  const router = Imports.Router()
  const knex = await persistance.initialize()

  const rootRoute = async (req: Request, res: Response) => {
    const folder = '/' + (req.params[0] || '')
    if (normalize(folder) !== folder) {
      res.status(StatusCodes.FORBIDDEN).render('error', {
        title: 'ERROR',
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!'
      })
      return
    }
    const room = await Functions.GetRoomAndIncrementImage(knex, folder)
    if (!room || !room.images.length) {
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
  }
  router.get('/', rootRoute)
  router.get('/*', rootRoute)

  io.on('connection', (socket) => Functions.HandleSocket(knex, io, socket))
  Imports.setInterval(async () => await Functions.TickCountdown(knex, io), 1000)

  return router
}
