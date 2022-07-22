'use sanity'

const pubsub = require('./pubsub')

const screen = document.querySelector('#loadingScreen')
const navbar = document.querySelector('#navbar')

let loading = false
const doError = (message) => {
  if (message) {
    console.error(message)
  }
  navbar.style.transition = null
  navbar.style.backgroundColor = '#FF0000'
  pubsub.defer(() => {
    navbar.style.backgroundColor = null
    navbar.style.transition = 'background-color 2s ease-in-out'
  }, 100)
  pubsub.publish('loading.hide')
}

pubsub.subscribe('error', doError)
pubsub.subscribe('loading.hide', () => {
  loading = false
  screen.style.display = 'none'
})
pubsub.subscribe('loading.show', () => {
  loading = true
  screen.style.display = 'block'
})

module.exports = {
  isLoading: () => loading
}
