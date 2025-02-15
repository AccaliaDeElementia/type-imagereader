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

export function isFolder(obj: unknown): obj is Folder {
  if (obj == null || typeof obj !== 'object') return false
  if (!('name' in obj) || !(typeof obj.name === 'string')) return false
  if (!('path' in obj) || !(typeof obj.path === 'string')) return false
  if (!('cover' in obj) || !(typeof obj.cover === 'string' || obj.cover === null)) return false
  if (!('totalSeen' in obj) || !(typeof obj.totalSeen === 'number')) return false
  if (!('totalCount' in obj) || !(typeof obj.totalCount === 'number')) return false
  return true
}

export function isData(obj: unknown): obj is Data {
  if (obj == null || typeof obj !== 'object') return false
  if ('children' in obj) {
    if (obj.children == null || !(obj.children instanceof Array)) return false
    for (const child of obj.children as unknown[]) {
      if (!isFolder(child)) return false
    }
  }
  if ('pictures' in obj) {
    if (obj.pictures == null || !(obj.pictures instanceof Array)) return false
    for (const picture of obj.pictures as unknown[]) {
      if (!isPicture(picture)) return false
    }
  }
  return true
}

export class Folders {
  static FolderCard: DocumentFragment | null = null

  public static BuildCard (folder: Folder): HTMLElement | null {
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
    const percentSeen = 100 * folder.totalSeen / folder.totalCount

    const header = card.querySelector('h5')
    if (header != null) header.innerText = folder.name
    const progress = card.querySelector<HTMLDivElement>('div.text')
    if (progress != null) progress.innerText = `${txtSeen}/${txtCount}`
    const slider = card.querySelector<HTMLDivElement>('div.slider')
    if (slider != null) slider.style.width = `${percentSeen.toFixed(2)}%`
    card.addEventListener('click', () => { Publish('Navigate:Load', folder.path) })
    return card
  }

  public static BuildFolders (data: Data): void {
    for (const folder of document.querySelectorAll('#tabFolders .folders')) {
      folder.remove()
    }
    if (data.children == null || data.children.length < 1) {
      document.querySelector('a[href="#tabFolders')?.parentElement?.classList.add('hidden')
      return
    }
    if (data.pictures == null || data.pictures.length < 1) {
      Publish('Tab:Select', 'Folders')
    }
    document.querySelector('a[href="#tabFolders')?.parentElement?.classList.remove('hidden')

    const container: HTMLElement = document.createElement('div')
    container.classList.add('folders')
    document.querySelector('#tabFolders')?.appendChild(container)

    for (const folder of data.children) {
      const card = this.BuildCard(folder)
      if (card == null) continue
      container.appendChild(card)
    }
  }

  public static Init (): void {
    this.FolderCard = document.querySelector<HTMLTemplateElement>('#FolderCard')?.content ?? null

    Subscribe('Navigate:Data', (data) => { 
      if (isData(data)) this.BuildFolders(data)
    })
  }
}
