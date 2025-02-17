'use sanity'

import { Publish, Subscribe } from './pubsub'

import { isPicture, type Picture } from './pictures'
import { isHTMLElement, CloneNode } from './utils'

export interface Folder {
  name: string
  path: string
  cover: string | null
  totalSeen: number
  totalCount: number
}
export interface Data {
  children?: Folder[]
  pictures?: Picture[]
}

function hasKeyAndIsNumber(obj: object, key: string): boolean {
  const entries = Object.entries(obj)
  const e = entries.find(([k]) => k === key)
  return e != null && typeof e[1] === 'number'
}

function hasKeyAndIsString(obj: object, key: string): boolean {
  const entries = Object.entries(obj)
  const e = entries.find(([k]) => k === key)
  return e != null && typeof e[1] === 'string'
}

export function isFolder(obj: unknown): obj is Folder {
  if (obj == null || typeof obj !== 'object') return false
  if (!hasKeyAndIsString(obj, 'name')) return false
  if (!hasKeyAndIsString(obj, 'path')) return false
  if (!('cover' in obj) || !(typeof obj.cover === 'string' || obj.cover === null)) return false
  return hasKeyAndIsNumber(obj, 'totalSeen') && hasKeyAndIsNumber(obj, 'totalCount')
}

function hasValidChildren(obj: object): boolean {
  if ('children' in obj) {
    if (obj.children == null || !(obj.children instanceof Array)) return false
    for (const child of obj.children as unknown[]) {
      if (!isFolder(child)) return false
    }
  }
  return true
}

function hasValidPictures(obj: object): boolean {
  if ('pictures' in obj) {
    if (obj.pictures == null || !(obj.pictures instanceof Array)) return false
    for (const picture of obj.pictures as unknown[]) {
      if (!isPicture(picture)) return false
    }
  }
  return true
}

export function isData(obj: unknown): obj is Data {
  if (obj == null || typeof obj !== 'object') return false
  return hasValidChildren(obj) && hasValidPictures(obj)
}

function buildCards(data: Data): void {
  if (data.children === undefined) return
  const container: HTMLElement = document.createElement('div')
  container.classList.add('folders')
  document.querySelector('#tabFolders')?.appendChild(container)

  for (const folder of data.children) {
    const card = Folders.BuildCard(folder)
    if (card == null) continue
    container.appendChild(card)
  }
}

function hideTab(selector: string): void {
  document.querySelector(selector)?.parentElement?.classList.add('hidden')
}
function unhideTab(selector: string): void {
  document.querySelector(selector)?.parentElement?.classList.remove('hidden')
}

export class Folders {
  static FolderCard: DocumentFragment | null = null

  public static BuildCard(folder: Folder): HTMLElement | null {
    const card = CloneNode(this.FolderCard, isHTMLElement)
    if (card == null) {
      return null
    }
    if (folder.cover != null && folder.cover.length > 0) {
      card.querySelector('i')?.remove()
      card.style.backgroundImage = `url("/images/preview${folder.cover}-image.webp")`
    }
    if (folder.totalSeen >= folder.totalCount) {
      card.classList.add('seen')
    }

    const txtSeen = folder.totalSeen.toLocaleString()
    const txtCount = folder.totalCount.toLocaleString()
    const percentSeen = (100 * folder.totalSeen) / folder.totalCount

    const header = card.querySelector('h5')
    if (header != null) header.innerText = folder.name
    const progress = card.querySelector<HTMLDivElement>('div.text')
    if (progress != null) progress.innerText = `${txtSeen}/${txtCount}`
    const slider = card.querySelector<HTMLDivElement>('div.slider')
    if (slider != null) slider.style.width = `${percentSeen.toFixed(2)}%`
    card.addEventListener('click', () => {
      Publish('Navigate:Load', folder.path)
    })
    return card
  }

  public static BuildFolders(data: Data): void {
    for (const folder of document.querySelectorAll('#tabFolders .folders')) {
      folder.remove()
    }
    const hasChildren = (data.children?.length ?? -1) > 0
    const hasPictures = (data.pictures?.length ?? -1) > 0
    if (hasChildren) {
      unhideTab('a[href="#tabFolders')
      if (!hasPictures) {
        Publish('Tab:Select', 'Folders')
      }
    } else {
      hideTab('a[href="#tabFolders')
    }
    buildCards(data)
  }

  public static Init(): void {
    this.FolderCard = document.querySelector<HTMLTemplateElement>('#FolderCard')?.content ?? null

    Subscribe('Navigate:Data', (data) => {
      if (isData(data)) this.BuildFolders(data)
    })
  }
}
