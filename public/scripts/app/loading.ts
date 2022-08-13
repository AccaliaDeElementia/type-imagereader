'use sanity'

import { Subscribe, Publish, Defer } from './pubsub'

const screen = document.querySelector<HTMLElement>('#loadingScreen')
const navbar = document.querySelector<HTMLElement>('#navbar')

Subscribe('Loading:Error', (message) => {
  if (message) {
    console.error(message)
  }
  navbar?.style.removeProperty('transition')
  navbar?.style.setProperty('background-color', '#FF0000')
  Defer(() => {
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    navbar?.style.removeProperty('background-color')
  }, 100)
  Publish('Loading:Hide')
})
Subscribe('Loading:Hide', () => screen?.style.setProperty('display', 'none'))
Subscribe('Loading:Show', () => screen?.style.setProperty('display', 'block'))

export const IsLoading = () => screen?.style.getPropertyValue('display') === 'block'
