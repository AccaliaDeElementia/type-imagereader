'use sanity'

import { io, type Socket } from 'socket.io-client'
import { hasValue, stringishHasValue } from '#utils/helpers.js'
import { SocketEvents } from '#contracts/socketEvents.js'
export type WebSocket = Socket

export const Imports = {
  io,
}

const LEFT_THIRD = 0.3333333333333333
const RIGHT_THIRD = 0.6666666666666666
const DEFAULT_ZOOM = 1

function HandleKeys(event: KeyboardEvent, socket: WebSocket | undefined): void {
  if (!hasValue(socket)) return
  if (event.key.toUpperCase() === 'ARROWRIGHT') {
    socket.emit(SocketEvents.NextImage)
  } else if (event.key.toUpperCase() === 'ARROWLEFT') {
    socket.emit(SocketEvents.PrevImage)
  }
}

function HandleClick(event: MouseEvent, socket: WebSocket | undefined, initialScale: number): void {
  if (!hasValue(socket)) return
  if (hasValue(window.visualViewport) && window.visualViewport.scale > initialScale) {
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
      WebSockets.locationAssign(`/show${folder}?noMenu`)
    })
  }
}

function ShowBackingImageByType(path: string): void {
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
}

function ParseRoomName(): string {
  let uri = window.location.pathname.replace(/^\/[^\/]+/v, '')
  if (!stringishHasValue(uri)) {
    uri = '/'
  }
  return decodeURIComponent(uri)
}

function HandleGetLaunchId(launchId: unknown): void {
  if (typeof launchId !== 'number' || !Number.isFinite(launchId)) return
  if (WebSockets.launchId === undefined) {
    WebSockets.launchId = launchId
  } else if (WebSockets.launchId !== launchId) {
    WebSockets.LocationReload()
  }
}

function UninitializedLocationAssign(_: string | URL): void {
  throw new Error('locationAssign called before Connect()')
}

function UninitializedLocationReload(): void {
  throw new Error('LocationReload called before Connect()')
}

export const WebSockets = {
  socket: undefined as WebSocket | undefined,
  launchId: undefined as unknown,
  locationAssign: UninitializedLocationAssign as (url: string | URL) => void,
  LocationReload: UninitializedLocationReload as () => void,
}

export function Connect(): void {
  WebSockets.launchId = undefined
  WebSockets.locationAssign = window.location.assign.bind(window.location)
  WebSockets.LocationReload = window.location.reload.bind(window.location)
  WebSockets.socket = Imports.io(new URL(window.location.href).origin)
  const room = Internals.ParseRoomName()
  WebSockets.socket.on('connect', () => {
    WebSockets.socket?.emit(SocketEvents.JoinSlideshow, room)
    WebSockets.socket?.emit(SocketEvents.GetLaunchId, Internals.HandleGetLaunchId)
  })
  WebSockets.socket.on(SocketEvents.ImageChanged, Internals.ShowBackingImageByType)
  const initialScale = hasValue(window.visualViewport) ? window.visualViewport.scale : DEFAULT_ZOOM
  document.body.addEventListener('click', (event) => {
    Internals.HandleClick(event, WebSockets.socket, initialScale)
  })
  document.body.addEventListener('keyup', (event) => {
    Internals.HandleKeys(event, WebSockets.socket)
  })
}

export function Disconnect(): void {
  WebSockets.socket?.disconnect()
  WebSockets.socket = undefined
  WebSockets.launchId = undefined
  WebSockets.locationAssign = Internals.UninitializedLocationAssign
  WebSockets.LocationReload = Internals.UninitializedLocationReload
}

export const Internals = {
  HandleKeys,
  HandleClick,
  ShowBackingImageByType,
  ParseRoomName,
  HandleGetLaunchId,
  UninitializedLocationAssign,
  UninitializedLocationReload,
}
