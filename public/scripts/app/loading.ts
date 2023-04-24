'use sanity'

import { Subscribe, Publish, Defer } from './pubsub'

export class Loading {
  protected static overlay: HTMLElement|null
  protected static navbar: HTMLElement|null

  static Init (): void {
    this.overlay = document.querySelector<HTMLElement>('#loadingScreen')
    this.navbar = document.querySelector<HTMLElement>('#navbar')

    Subscribe('Loading:Error', (message) => {
      if (message) {
        window.console.error(message)
      }
      this.navbar?.style.removeProperty('transition')
      this.navbar?.style.setProperty('background-color', '#FF0000')
      Defer(() => {
        this.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
        this.navbar?.style.removeProperty('background-color')
      }, 100)
      Publish('Loading:Hide')
    })
    Subscribe('Loading:Success', () => {
      console.log('success!')
      this.navbar?.style.removeProperty('transition')
      this.navbar?.style.setProperty('background-color', '#00AA00')
      Defer(() => {
        this.navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
        this.navbar?.style.removeProperty('background-color')
      }, 100)
    })
    Subscribe('Loading:Hide', () => this.overlay?.style.setProperty('display', 'none'))
    Subscribe('Loading:Show', () => this.overlay?.style.setProperty('display', 'block'))
  }

  static get IsLoading (): boolean {
    return this.overlay?.style.getPropertyValue('display') === 'block'
  }
}
