'use sanity'

import { io, type Socket } from 'socket.io-client'
import type { DefaultEventsMap } from 'socket.io/dist/typed-events'
export type WebSocket = Socket<DefaultEventsMap, DefaultEventsMap>

export const Imports = {
  io,
}

export const Functions = {
  HandleKeys: (event: KeyboardEvent, socket: WebSocket | undefined): void => {
    if (socket == null) return
    if (event.key.toUpperCase() === 'ARROWRIGHT') {
      socket.emit('next-image')
    } else if (event.key.toUpperCase() === 'ARROWLEFT') {
      socket.emit('prev-image')
    }
  },
  HandleClick: (event: MouseEvent, socket: WebSocket | undefined, initialScale: number): void => {
    if (socket == null) return
    if (window.visualViewport != null && window.visualViewport.scale > initialScale) {
      return
    }
    const pageWidth = window.innerWidth
    const x = event.clientX
    if (x < pageWidth / 3) {
      socket.emit('prev-image')
    } else if (x > (pageWidth * 2) / 3) {
      socket.emit('next-image')
    } else {
      if (new URLSearchParams(window.location.search).has('kiosk')) {
        socket.emit('next-image')
      } else {
        socket.emit('goto-image', (folder: string) => {
          WebSockets.LocationAssign(`/show${folder}?noMenu`)
        })
      }
    }
  },
  DoNewImage: (path: string): void => {
    if (/[.]gif$/i.test(path)) {
      for (const elem of document.querySelectorAll('img.bottomImage')) {
        elem.classList.add('hide')
        elem.removeAttribute('src')
      }
      const img = document.querySelector('img.topImage')
      img?.classList.remove('hide')
      img?.setAttribute('src', `/images/kiosk${path}-image.webp`)
      return
    }
    for (const elem of document.querySelectorAll('img.mainImage')) {
      elem.classList.remove('hide')
      elem.setAttribute('src', `/images/kiosk${path}-image.webp`)
    }
  },
  ParseRoomName: (): string => {
    let uri = window.location.pathname.replace(/^\/[^/]+/, '')
    if (uri.length < 1) {
      uri = '/'
    }
    return decodeURIComponent(uri)
  },
  HandleGetLaunchId: (launchId: unknown): void => {
    if (WebSockets.launchId === undefined) {
      WebSockets.launchId = launchId
    } else if (WebSockets.launchId !== launchId) {
      WebSockets.LocationReload()
    }
  },
}
function Connect(): void {
  WebSockets.launchId = undefined
  WebSockets.LocationAssign = window.location.assign.bind(window.location)
  WebSockets.LocationReload = window.location.reload.bind(window.location)
  WebSockets.socket = Imports.io(new URL(window.location.href).origin)
  const room = Functions.ParseRoomName()
  WebSockets.socket.on('connect', () => {
    WebSockets.socket?.emit('join-slideshow', room)
    WebSockets.socket?.emit('get-launchId', Functions.HandleGetLaunchId)
  })
  WebSockets.socket.on('new-image', Functions.DoNewImage)
  const initialScale = window.visualViewport != null ? window.visualViewport.scale : 1
  document.body.addEventListener('click', (event) => {
    Functions.HandleClick(event, WebSockets.socket, initialScale)
  })
  document.body.addEventListener('keyup', (event) => {
    Functions.HandleKeys(event, WebSockets.socket)
  })
}

export function DefaultLocationAssign(_: string | URL): void {
  throw new Error('Should not call default value!')
}
export function DefaultLocationReload(): void {
  throw new Error('Should not call default value!')
}
export const WebSockets = {
  socket: ((): WebSocket | undefined => undefined)(),
  launchId: ((): unknown => undefined)(),
  LocationAssign: DefaultLocationAssign,
  LocationReload: DefaultLocationReload,
  connect: Connect,
  disconnect: (): void => {
    WebSockets.socket?.disconnect()
    WebSockets.socket = undefined
    WebSockets.launchId = undefined
    WebSockets.LocationAssign = DefaultLocationAssign
    WebSockets.LocationReload = DefaultLocationReload
  },
}
