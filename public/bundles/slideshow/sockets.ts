// use sanity

import { io } from 'socket.io-client'

const room = decodeURI(window.location.pathname.replace(/^\/[^/]+/, '') || '/')

const socket = io()
socket.on('connect', () => {
  console.log('conencted!')
  socket.emit('join-slideshow', room)
})

socket.on('new-image', (path) => {
  if (/[.]gif$/.test(path)) {
    for (const elem of document.querySelectorAll('img.bottomImage')) {
      elem.classList.add('hide')
      elem.setAttribute('src', '')
    }
    const img = document.querySelector('img.topImage')
    if (img) {
      img.setAttribute('src', `/images/kiosk${path}`)
    }
    return
  }
  for (const elem of document.querySelectorAll('img.mainImage')) {
    elem.classList.remove('hide')
    elem.setAttribute('src', `/images/kiosk${path}`)
  }
})

const initialScale = window.visualViewport ? window.visualViewport.scale : 1
const body = document.querySelector('body') || { addEventListener: (_: string, __: Function) => 0 }
body.addEventListener('click', event => {
  if (window.visualViewport && window.visualViewport.scale > initialScale) {
    return
  }
  const pageWidth = window.innerWidth || document.body.clientWidth
  const x = event.pageX
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
      })
    }
  }
})

document.onkeyup = evt => {
  if (evt.key.toUpperCase() === 'ARROWRIGHT') {
    socket.emit('next-image')
  } else if (evt.key.toUpperCase() === 'ARROWLEFT') {
    socket.emit('prev-image')
  }
}
