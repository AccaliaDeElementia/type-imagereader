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

function handleKeys(event: KeyboardEvent, socket: WebSocket | undefined): void {
  if (!hasValue(socket)) return
  if (event.key.toUpperCase() === 'ARROWRIGHT') {
    socket.emit(SocketEvents.NextImage)
  } else if (event.key.toUpperCase() === 'ARROWLEFT') {
    socket.emit(SocketEvents.PrevImage)
  }
}

function handleClick(event: MouseEvent, socket: WebSocket | undefined, initialScale: number): void {
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

function showBackingImageByType(path: string): void {
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

function parseRoomName(): string {
  let uri = window.location.pathname.replace(/^\/[^\/]+/v, '')
  if (!stringishHasValue(uri)) {
    uri = '/'
  }
  return decodeURIComponent(uri)
}

function handleGetLaunchId(launchId: unknown): void {
  if (typeof launchId !== 'number' || !Number.isFinite(launchId)) return
  if (WebSockets.launchId === undefined) {
    WebSockets.launchId = launchId
  } else if (WebSockets.launchId !== launchId) {
    WebSockets.locationReload()
  }
}

function uninitializedLocationAssign(_: string | URL): void {
  throw new Error('locationAssign called before connect()')
}

function uninitializedLocationReload(): void {
  throw new Error('locationReload called before connect()')
}

export const WebSockets = {
  socket: undefined as WebSocket | undefined,
  launchId: undefined as unknown,
  locationAssign: uninitializedLocationAssign,
  locationReload: uninitializedLocationReload,
}

export function connect(): void {
  WebSockets.launchId = undefined
  WebSockets.locationAssign = window.location.assign.bind(window.location)
  WebSockets.locationReload = window.location.reload.bind(window.location)
  WebSockets.socket = Imports.io(new URL(window.location.href).origin)
  const room = Internals.parseRoomName()
  WebSockets.socket.on('connect', () => {
    WebSockets.socket?.emit(SocketEvents.JoinSlideshow, room)
    WebSockets.socket?.emit(SocketEvents.GetLaunchId, Internals.handleGetLaunchId)
  })
  WebSockets.socket.on(SocketEvents.ImageChanged, Internals.showBackingImageByType)
  const initialScale = hasValue(window.visualViewport) ? window.visualViewport.scale : DEFAULT_ZOOM
  document.body.addEventListener('click', (event) => {
    Internals.handleClick(event, WebSockets.socket, initialScale)
  })
  document.body.addEventListener('keyup', (event) => {
    Internals.handleKeys(event, WebSockets.socket)
  })
}

export function disconnect(): void {
  WebSockets.socket?.disconnect()
  WebSockets.socket = undefined
  WebSockets.launchId = undefined
  WebSockets.locationAssign = Internals.uninitializedLocationAssign
  WebSockets.locationReload = Internals.uninitializedLocationReload
}

export const Internals = {
  handleKeys,
  handleClick,
  showBackingImageByType,
  parseRoomName,
  handleGetLaunchId,
  uninitializedLocationAssign,
  uninitializedLocationReload,
}
