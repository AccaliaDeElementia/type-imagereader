'use sanity'

import { HasValue } from '#utils/helpers'
import { Subscribe, Publish, Defer } from './pubsub'

const ANIMATION_RESET_DELAY = 100
export const Loading = {
  overlay: ((): HTMLElement | null => null)(),
  navbar: ((): HTMLElement | null => null)(),
  Init: (): void => {
    Loading.overlay = document.querySelector<HTMLElement>('#loadingScreen')
    Loading.navbar = document.querySelector<HTMLElement>('#navbar')

    Subscribe('Loading:Error', async (message) => {
      if (HasValue(message) && message !== '') {
        window.console.error(message)
      }
      Loading.navbar?.style.removeProperty('transition')
      Loading.navbar?.style.setProperty('background-color', '#FF0000')
      await Promise.resolve()
      Defer(() => {
        Loading.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
        Loading.navbar?.style.removeProperty('background-color')
      }, ANIMATION_RESET_DELAY)
      Publish('Loading:Hide')
    })
    Subscribe('Loading:Success', async () => {
      Loading.navbar?.style.removeProperty('transition')
      Loading.navbar?.style.setProperty('background-color', '#00AA00')
      await Promise.resolve()
      Defer(() => {
        Loading.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
        Loading.navbar?.style.removeProperty('background-color')
      }, ANIMATION_RESET_DELAY)
    })
    Subscribe('Loading:Hide', async () => {
      Loading.overlay?.style.setProperty('display', 'none')
      await Promise.resolve()
    })
    Subscribe('Loading:Show', async () => {
      Loading.overlay?.style.setProperty('display', 'block')
      await Promise.resolve()
    })
  },
  IsLoading: (): boolean => Loading.overlay?.style.getPropertyValue('display') === 'block',
}
