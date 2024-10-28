'use sanity'

import { io, type Socket } from 'socket.io-client'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'
type WebSocket = Socket<DefaultEventsMap, DefaultEventsMap>

const handleKeys = (event: KeyboardEvent, socket: WebSocket): void => {
  if (event.key.toUpperCase() === 'ARROWRIGHT') {
    socket.emit('next-image')
  } else if (event.key.toUpperCase() === 'ARROWLEFT') {
    socket.emit('prev-image')
  } else {
    socket.emit('notify-done')
  }
}

const handleClick = (event: MouseEvent, socket: WebSocket, initialScale: number): void => {
  if (window.visualViewport != null && window.visualViewport.scale > initialScale) {
    socket.emit('notify-done')
    return
  }
  const pageWidth = window.innerWidth
  const x = event.clientX
  if (x < pageWidth / 3) {
    socket.emit('prev-image')
  } else if (x > pageWidth * 2 / 3) {
    socket.emit('next-image')
  } else {
    if (new URLSearchParams(window.location.search).has('kiosk')) {
      socket.emit('next-image')
    } else {
      socket.emit('goto-image', (folder: string) => {
        WebSockets.LocationAssign?.call(window.location, `/show${folder}?noMenu`)
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

export class WebSockets {
  protected static socket: WebSocket
  protected static launchId: unknown = undefined
  public static LocationAssign?: (url: string | URL) => void
  public static LocationReload?: () => void
  static connect (): void {
    WebSockets.launchId = undefined
    // eslint-disable-next-line @typescript-eslint/unbound-method
    WebSockets.LocationAssign = window.location.assign
    // eslint-disable-next-line @typescript-eslint/unbound-method
    WebSockets.LocationReload = window.location.reload
    this.socket = io(new URL(window.location.href).origin)
    let uri = window.location.pathname.replace(/^\/[^/]+/, '')
    if (uri.length < 1) {
      uri = '/'
    }
    const room = decodeURI(uri)
    this.socket.on('connect', () => {
      this.socket.emit('join-slideshow', room)
      this.socket.emit('get-launchId', (launchId: unknown) => {
        if (WebSockets.launchId === undefined) {
          WebSockets.launchId = launchId
        } else if (launchId !== WebSockets.launchId) {
          WebSockets.launchId = launchId
          WebSockets.LocationReload?.call(window.location)
        }
        this.socket.emit('notify-done')
      })
    })
    this.socket.on('new-image', (path: string) => {
      doNewImage(path)
      this.socket.emit('notify-done')
    })
    const initialScale = window.visualViewport != null ? window.visualViewport.scale : 1
    document.body.addEventListener('click', event => { handleClick(event, this.socket, initialScale) })
    document.body.addEventListener('keyup', event => { handleKeys(event, this.socket) })
  }

  protected static disconnect (): void {
    this.socket?.disconnect()
  }
}
