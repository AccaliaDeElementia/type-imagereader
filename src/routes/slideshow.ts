'use sanity'

import { Application, Router, Request, Response } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

import { normalize, dirname } from 'path'

import persistance from '../utils/persistance'
import { setLatest } from './api'

import { Knex } from 'knex'

import debug from 'debug'
const logger = debug('type-imagereader:routes:slideshow')

interface SlideshowRoom {
  countdown: number,
  index: number,
  path: string,
  images: string[]
}

interface ImageWithPath {
  path: string
}

const rooms: {[name: string]: SlideshowRoom} = {}
const countdownDuration = 60
const lookaheadSize = 10
const lookbehindSize = 10

const getImages = async (knex:Knex, path: string, count: number): Promise<string[]> => {
  return (await knex('pictures')
    .select('path')
    .where('path', 'like', `${path}%`)
    .orderBy('seen')
    .orderByRaw('RANDOM()')
    .limit(count))
    .map((img: ImageWithPath) => img.path)
}

const getRoom = async (knex: Knex, io: WebSocketServer, roomName: string) => {
  let room = rooms[roomName]
  if (!room) {
    const images = await getImages(knex, roomName, lookaheadSize + lookbehindSize)
    room = {
      countdown: countdownDuration,
      path: roomName,
      images,
      index: images.length > lookbehindSize ? lookbehindSize : Math.floor(images.length / 2)
    }
    rooms[roomName] = room
    await changeImage(knex, io, room, 0)
  }
  return room
}

const changeImage = async (knex: Knex, io: WebSocketServer, room: SlideshowRoom, offset: number = 1) => {
  try {
    room.index += offset
    if (room.index < 0) {
      const images = await getImages(knex, room.path, lookbehindSize)
      room.images = images.concat(room.images.slice(0, lookaheadSize))
      room.index = images.length - 1
    } else if (room.index >= room.images.length) {
      const images = await getImages(knex, room.path, lookbehindSize)
      room.images = room.images.slice(-lookbehindSize).concat(images)
      room.index = lookbehindSize
    }
    room.countdown = countdownDuration
    const image: string = room.images[room.index]
    const picture = await knex('pictures')
      .select('seen')
      .where({
        seen: false,
        path: image
      })
    if (picture && picture.length) {
      const folders = []
      let path = image
      while (path && path !== '/') {
        path = dirname(path)
        folders.push(`${path}${path !== '/' ? '/' : ''}`)
      }
      await knex('folders')
        .increment('seenCount', 1)
        .whereIn('path', folders)
      await knex('pictures').update({ seen: true }).where({ path: image })
    }
    io.to(room.path).emit('new-image', image.split('/').map((part: string) => encodeURIComponent(part)).join('/'))
  } catch (e) {
    logger('error changing image')
    io.to(room.path).emit('error-selecting-image')
    logger(e)
    if (e instanceof Error) {
      logger(e.message, e.stack)
    }
  }
}

export async function getRouter (_: Application, __: Server, io: WebSocketServer) {
  const router = Router()
  const knex = await persistance.initialize()

  const rootRoute = async (req: Request, res: Response) => {
    const folder = '/' + (req.params[0] || '')
    if (normalize(folder) !== folder) {
      res.status(StatusCodes.FORBIDDEN).render('error', {
        title: 'ERROR',
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!'
      })
    }
    const room = await getRoom(knex, io, folder)
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
      image: room.images[room.index]
    })
  }
  router.get('/', rootRoute)
  router.get('/*', rootRoute)

  io.on('connection', (socket) => {
    let socketRoom : (string | null) = null
    socket.on('join-slideshow', async (roomName: string) => {
      socketRoom = roomName
      socket.join(roomName)
      const room = await getRoom(knex, io, socketRoom)
      socket.emit('new-image', room.images[room.index])
    })
    socket.on('prev-image', () => {
      if (socketRoom && rooms[socketRoom]) {
        changeImage(knex, io, rooms[socketRoom], -1)
      }
    })
    socket.on('next-image', () => {
      if (socketRoom && rooms[socketRoom]) {
        changeImage(knex, io, rooms[socketRoom], 1)
      }
    })
    socket.on('goto-image', async (callback) => {
      if (!socketRoom) return
      const room = await getRoom(knex, io, socketRoom)
      const folder = await setLatest(knex, room.images[room.index])
      callback(folder)
    })
  })
  setInterval(() => {
    Object.values(rooms).forEach(room => {
      room.countdown--
      const sockets = io.of('/').adapter.rooms.get(room.path)
      if (sockets && sockets.size && room.countdown <= 0) {
        changeImage(knex, io, room, 1)
      } else if (room.countdown <= -5 * countdownDuration) {
        delete rooms[room.path]
      }
    })
  }, 1000)

  return router
}
