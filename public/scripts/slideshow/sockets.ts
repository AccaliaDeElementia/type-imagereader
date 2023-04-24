'use sanity'

import { io, Socket } from 'socket.io-client'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
type WebSocket = Socket<DefaultEventsMap, DefaultEventsMap>

const handleKeys = (event: KeyboardEvent, socket: WebSocket) => {
  if (event.key.toUpperCase() === 'ARROWRIGHT') {
    socket.emit('next-image')
  } else if (event.key.toUpperCase() === 'ARROWLEFT') {
    socket.emit('prev-image')
  } else {
    socket.emit('notify-done')
  }
}

const handleClick = (event: MouseEvent, socket: WebSocket, initialScale: number) => {
  if (window.visualViewport && window.visualViewport.scale > initialScale) {
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
        window.location.assign(`/show${folder}?noMenu`)
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
    img?.setAttribute('src', `/images/kiosk${path}`)
    return
  }
  for (const elem of document.querySelectorAll('img.mainImage')) {
    elem.classList.remove('hide')
    elem.setAttribute('src', `/images/kiosk${path}`)
  }
}

export class WebSockets {
  protected static socket: WebSocket
  static connect (): void {
    this.socket = io(new URL(window.location.href).origin)
    const room = decodeURI(window.location.pathname.replace(/^\/[^/]+/, '') || '/')
    this.socket.on('connect', () => {
      this.socket.emit('join-slideshow', room)
    })
    this.socket.on('new-image', (path: string) => {
      doNewImage(path)
      this.socket.emit('notify-done')
    })
    const initialScale = window.visualViewport ? window.visualViewport.scale : 1
    document.body.addEventListener('click', event => handleClick(event, this.socket, initialScale))
    document.body.addEventListener('keyup', event => handleKeys(event, this.socket))
  }

  protected static disconnect (): void {
    this.socket?.disconnect()
  }
}
