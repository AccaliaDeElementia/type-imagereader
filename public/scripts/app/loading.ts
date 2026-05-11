'use sanity'

import { hasValue } from '#utils/helpers.js'
import { subscribe as _subscribe, publish as _publish, defer } from './pubsub.js'

export const Imports = {
  subscribe: _subscribe,
  publish: _publish,
}

const ANIMATION_RESET_DELAY = 100
const DISPLAY_VISIBLE = 'block'
const DISPLAY_HIDDEN = 'none'

export const Loading = {
  overlay: null as HTMLElement | null,
  navbar: null as HTMLElement | null,
}

export function init(): void {
  Loading.overlay = document.querySelector<HTMLElement>('#loadingScreen')
  Loading.navbar = document.querySelector<HTMLElement>('#navbar')

  Imports.subscribe('Loading:Error', async (message) => {
    if (hasValue(message) && message !== '') {
      window.console.error(message)
    }
    Loading.navbar?.style.removeProperty('transition')
    Loading.navbar?.style.setProperty('background-color', '#FF0000')
    await Promise.resolve()
    defer(() => {
      Loading.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
      Loading.navbar?.style.removeProperty('background-color')
    }, ANIMATION_RESET_DELAY)
    Imports.publish('Loading:Hide')
  })
  Imports.subscribe('Loading:Success', async () => {
    Loading.navbar?.style.removeProperty('transition')
    Loading.navbar?.style.setProperty('background-color', '#00AA00')
    await Promise.resolve()
    defer(() => {
      Loading.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
      Loading.navbar?.style.removeProperty('background-color')
    }, ANIMATION_RESET_DELAY)
  })
  Imports.subscribe('Loading:Hide', async () => {
    Loading.overlay?.style.setProperty('display', DISPLAY_HIDDEN)
    await Promise.resolve()
  })
  Imports.subscribe('Loading:show', async () => {
    Loading.overlay?.style.setProperty('display', DISPLAY_VISIBLE)
    await Promise.resolve()
  })
}

export function isLoading(): boolean {
  return Loading.overlay?.style.getPropertyValue('display') === DISPLAY_VISIBLE
}
