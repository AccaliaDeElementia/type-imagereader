/* global io, SlideshowRoom, location */
(function () {
  const timeRefresh = 1000
  // const weatherRefresh = 10 * 60 * 1000

  const socket = io()
  socket.on('connect', () => {
    socket.emit('join-slideshow', SlideshowRoom)
  })
  socket.on('new-image', (path) => {
    for (const elem of document.querySelectorAll('img')) {
      elem.src = `/images/full${path}`
    }
  })

  const updateTime = () => {
    const now = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    document.querySelector('.time').innerHTML = `${('00' + now.getHours()).slice(-2)}:${('00' + now.getMinutes()).slice(-2)}`
    document.querySelector('.date').innerHTML = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
  }
  updateTime()
  setInterval(() => {
    updateTime()
  }, timeRefresh)

  function MouseFingers () {
    const initialScale = window.visualViewport ? window.visualViewport.scale : 1
    document.querySelector('body').onclick = event => {
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
        socket.emit('goto-image', (folder) => {
          location.pathname = `/show${folder}`
        })
      }
    }
  }
  MouseFingers()

  function Keebs () {
    document.onkeyup = evt => {
      const keys = {
        ARROWRIGHT: () => socket.emit('next-image'),
        ARROWLEFT: () => socket.emit('prev-image')
      }
      const key = (evt.ctrlKey ? '<CTRL>' : '') +
          (evt.altKey ? '<ALT>' : '') +
          (evt.shiftKey ? '<SHIFT>' : '') +
          evt.key.toUpperCase()
      const action = keys[key] || (() => true)
      action()
    }
  }
  Keebs()
})()
