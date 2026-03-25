'use sanity'

import { Pictures } from '.'
import { StringishHasValue } from '#utils/helpers'
import { Publish } from '../pubsub'

export function ResetMarkup(): void {
  Pictures.mainImage = document.querySelector<HTMLImageElement>('#bigImage img')
  Pictures.imageCard = document.querySelector<HTMLTemplateElement>('#ImageCard')
  for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
    existing.parentElement?.removeChild(existing)
  }
  for (const bar of ['top', 'bottom']) {
    for (const position of ['left', 'center', 'right']) {
      document.querySelector(`.statusBar.${bar} .${position}`)?.replaceChildren('')
    }
  }
  Pictures.mainImage?.setAttribute('src', '')
  Pictures.mainImage?.addEventListener('load', () => {
    Publish('Loading:Hide')
  })
  Pictures.mainImage?.addEventListener('error', () => {
    const src = Pictures.mainImage?.getAttribute('src')
    if (StringishHasValue(src)) {
      Publish('Loading:Error', `Main Image Failed to Load: ${Pictures.current?.name}`)
    }
  })
}
