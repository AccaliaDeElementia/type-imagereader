'use sanity'

import { io, type Socket } from 'socket.io-client'
import type { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { HasValue, StringishHasValue } from '#utils/helpers'
import { SocketEvents } from '#contracts/socketEvents'
export type WebSocket = Socket<DefaultEventsMap, DefaultEventsMap>

export const Imports = {
  io,
}

const LEFT_THIRD = 0.3333333333333333
const RIGHT_THIRD = 0.6666666666666666
const DEFAULT_ZOOM = 1

export const Functions = {
  HandleKeys: (event: KeyboardEvent, socket: WebSocket | undefined): void => {
    if (!HasValue(socket)) return
    if (event.key.toUpperCase() === 'ARROWRIGHT') {
      socket.emit(SocketEvents.NextImage)
    } else if (event.key.toUpperCase() === 'ARROWLEFT') {
      socket.emit(SocketEvents.PrevImage)
    }
  },
  HandleClick: (event: MouseEvent, socket: WebSocket | undefined, initialScale: number): void => {
    if (!HasValue(socket)) return
    if (HasValue(window.visualViewport) && window.visualViewport.scale > initialScale) {
      return
    }
    const pageWidth = window.innerWidth
    const x = event.clientX
    if (x < pageWidth * LEFT_THIRD) {
      socket.emit(SocketEvents.PrevImage)
    } else if (x > pageWidth * RIGHT_THIRD) {
      socket.emit(SocketEvents.NextImage)
    } else if (new URLSearchParams(window.location.search).has('kiosk')) {
      socket.emit(SocketEvents.NextImage)
    } else {
      socket.emit(SocketEvents.GotoImage, (folder: string | null) => {
        if (folder === null) return
        WebSockets.LocationAssign(`/show${folder}?noMenu`)
      })
    }
  },
  ShowBackingImageByType: (path: string): void => {
    if (/[.]gif$/iv.test(path)) {
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
    let uri = window.location.pathname.replace(/^\/[^\/]+/v, '')
    if (!StringishHasValue(uri)) {
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
    WebSockets.socket?.emit(SocketEvents.JoinSlideshow, room)
    WebSockets.socket?.emit(SocketEvents.GetLaunchId, Functions.HandleGetLaunchId)
  })
  WebSockets.socket.on(SocketEvents.ImageChanged, Functions.ShowBackingImageByType)
  const initialScale = HasValue(window.visualViewport) ? window.visualViewport.scale : DEFAULT_ZOOM
  document.body.addEventListener('click', (event) => {
    Functions.HandleClick(event, WebSockets.socket, initialScale)
  })
  document.body.addEventListener('keyup', (event) => {
    Functions.HandleKeys(event, WebSockets.socket)
  })
}

export function UninitializedLocationAssign(_: string | URL): void {
  throw new Error('LocationAssign called before Connect()')
}
export function UninitializedLocationReload(): void {
  throw new Error('LocationReload called before Connect()')
}
export const WebSockets = {
  socket: undefined as WebSocket | undefined,
  launchId: undefined as unknown,
  LocationAssign: UninitializedLocationAssign,
  LocationReload: UninitializedLocationReload,
  connect: Connect,
  disconnect: (): void => {
    WebSockets.socket?.disconnect()
    WebSockets.socket = undefined
    WebSockets.launchId = undefined
    WebSockets.LocationAssign = UninitializedLocationAssign
    WebSockets.LocationReload = UninitializedLocationReload
  },
}
