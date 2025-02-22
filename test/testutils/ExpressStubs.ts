import type { Application } from 'express'
import type { Server } from 'http'
import type { Server as WebSocketServer } from 'socket.io'
import { Cast } from './TypeGuards'

export function CreateExpressFakes(): [Application, Server, WebSocketServer] {
  return [
    Cast({ application: Math.random() }, (_): _ is Application => true),
    Cast({ server: Math.random() }, (_): _ is Server => true),
    Cast({ websocketserver: Math.random() }, (_): _ is WebSocketServer => true),
  ]
}
