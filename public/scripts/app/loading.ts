'use sanity'

import { Subscribe, Publish, Defer } from './pubsub'

export const Loading = {
  overlay: ((): HTMLElement | null => null)(),
  navbar: ((): HTMLElement | null => null)(),
  Init: (): void => {
    Loading.overlay = document.querySelector<HTMLElement>('#loadingScreen')
    Loading.navbar = document.querySelector<HTMLElement>('#navbar')

    Subscribe('Loading:Error', (message) => {
      if (message != null) {
        window.console.error(message)
      }
      Loading.navbar?.style.removeProperty('transition')
      Loading.navbar?.style.setProperty('background-color', '#FF0000')
      Defer(() => {
        Loading.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
        Loading.navbar?.style.removeProperty('background-color')
      }, 100)
      Publish('Loading:Hide')
    })
    Subscribe('Loading:Success', () => {
      Loading.navbar?.style.removeProperty('transition')
      Loading.navbar?.style.setProperty('background-color', '#00AA00')
      Defer(() => {
        Loading.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
        Loading.navbar?.style.removeProperty('background-color')
      }, 100)
    })
    Subscribe('Loading:Hide', () => Loading.overlay?.style.setProperty('display', 'none'))
    Subscribe('Loading:Show', () => Loading.overlay?.style.setProperty('display', 'block'))
  },
  IsLoading: (): boolean => Loading.overlay?.style.getPropertyValue('display') === 'block',
}
