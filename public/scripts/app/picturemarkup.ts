'use sanity'

import { isHTMLElement } from './utils'
import { Publish } from './pubsub'

export interface Picture {
  path: string
  name: string
  seen: boolean
  index?: number
  page?: number
  element?: HTMLElement
}
export interface DataWithPictures {
  pictures?: Picture[]
  modCount?: number
  cover?: string
  noMenu?: boolean
}

function isApiPicture(obj: object): boolean {
  if (!('path' in obj) || typeof obj.path !== 'string') return false
  if (!('name' in obj) || typeof obj.name !== 'string') return false
  if (!('seen' in obj) || typeof obj.seen !== 'boolean') return false
  return true
}

function isUIPicture(obj: object): boolean {
  if ('index' in obj && !(obj.index === undefined || typeof obj.index === 'number')) return false
  if ('page' in obj && !(obj.page === undefined || typeof obj.page === 'number')) return false
  if ('element' in obj && !(obj.element === undefined || isHTMLElement(obj.element))) return false
  return true
}

export function isPicture(obj: unknown): obj is Picture {
  if (obj == null || typeof obj !== 'object') return false
  return isApiPicture(obj) && isUIPicture(obj)
}

function hasPictureArray(obj: object): boolean {
  if ('pictures' in obj && obj.pictures !== undefined) {
    if (obj.pictures === null || !(obj.pictures instanceof Array)) return false
    for (const pic of obj.pictures as unknown[]) {
      if (!isPicture(pic)) return false
    }
  }
  return true
}
function hasBaseAttributes(obj: object): boolean {
  if ('modCount' in obj && typeof obj.modCount !== 'number') return false
  if ('cover' in obj && !(typeof obj.cover === 'string' || obj.cover == null)) return false
  if ('noMenu' in obj && typeof obj.noMenu !== 'boolean') return false
  return true
}

export function isDataWithPictures(obj: unknown): obj is DataWithPictures {
  if (obj == null || typeof obj !== 'object') return false
  return hasPictureArray(obj) && hasBaseAttributes(obj)
}

export class PictureMarkup {
  protected static pictures: Picture[]
  protected static current: Picture | null
  protected static mainImage: HTMLImageElement | null
  protected static imageCard: HTMLTemplateElement | null
  protected static pageSize = 32

  public static Init(): void {
    this.mainImage?.addEventListener('load', () => {
      Publish('Loading:Hide')
    })
    this.mainImage?.addEventListener('error', () => {
      const src = this.mainImage?.getAttribute('src')
      if (src != null && src !== '') {
        Publish('Loading:Error', `Main Image Failed to Load: ${this.current?.name}`)
      }
    })
  }

  protected static ResetMarkup(): void {
    this.mainImage = document.querySelector<HTMLImageElement>('#bigImage img')
    this.imageCard = document.querySelector<HTMLTemplateElement>('#ImageCard')
    for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
      existing.parentElement?.removeChild(existing)
    }
    for (const bar of ['top', 'bottom']) {
      for (const position of ['left', 'center', 'right']) {
        document.querySelector(`.statusBar.${bar} .${position}`)?.replaceChildren('')
      }
    }
    this.mainImage?.setAttribute('src', '')
  }
}
