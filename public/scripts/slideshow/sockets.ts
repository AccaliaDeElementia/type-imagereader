'use sanity'

import { io, type Socket } from 'socket.io-client'
import type { DefaultEventsMap } from 'socket.io/dist/typed-events'
type WebSocket = Socket<DefaultEventsMap, DefaultEventsMap>

export const handleKeys = (event: KeyboardEvent, socket: WebSocket | undefined): void => {
  if (socket == null) return
  if (event.key.toUpperCase() === 'ARROWRIGHT') {
    socket.emit('next-image')
  } else if (event.key.toUpperCase() === 'ARROWLEFT') {
    socket.emit('prev-image')
  } else {
    socket.emit('notify-done')
  }
}

export const handleClick = (event: MouseEvent, socket: WebSocket | undefined, initialScale: number): void => {
  if (socket == null) return
  if (window.visualViewport != null && window.visualViewport.scale > initialScale) {
    socket.emit('notify-done')
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
        WebSockets.LocationAssign.call(window.location, `/show${folder}?noMenu`)
        socket.emit('notify-done')
      })
    }
  }
}

const doNewImage = (path: string): void => {
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
  connect: (): void => {
    WebSockets.launchId = undefined
    WebSockets.LocationAssign = window.location.assign.bind(window.location)
    WebSockets.LocationReload = window.location.reload.bind(window.location)
    WebSockets.socket = io(new URL(window.location.href).origin)
    let uri = window.location.pathname.replace(/^\/[^/]+/, '')
    if (uri.length < 1) {
      uri = '/'
    }
    const room = decodeURIComponent(uri)
    WebSockets.socket.on('connect', () => {
      WebSockets.socket?.emit('join-slideshow', room)
      WebSockets.socket?.emit('get-launchId', (launchId: unknown) => {
        if (WebSockets.launchId === undefined) {
          WebSockets.launchId = launchId
        } else if (launchId !== WebSockets.launchId) {
          WebSockets.launchId = launchId
          WebSockets.LocationReload.call(window.location)
        }
        WebSockets.socket?.emit('notify-done')
      })
    })
    WebSockets.socket.on('new-image', (path: string) => {
      doNewImage(path)
      WebSockets.socket?.emit('notify-done')
    })
    const initialScale = window.visualViewport != null ? window.visualViewport.scale : 1
    document.body.addEventListener('click', (event) => {
      handleClick(event, WebSockets.socket, initialScale)
    })
    document.body.addEventListener('keyup', (event) => {
      handleKeys(event, WebSockets.socket)
    })
  },
  disconnect: (): void => {
    WebSockets.socket?.disconnect()
  },
}
