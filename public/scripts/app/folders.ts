'use sanity'

import { Publish, Subscribe } from './pubsub'

import type { Picture } from './pictures'

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

export class Folders {
  static FolderCard: DocumentFragment | null = null

  public static BuildCard (folder: Folder): HTMLElement | null {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: Clone but typesafe?
    const card = (this.FolderCard?.cloneNode(true) as HTMLElement | undefined)?.firstElementChild as HTMLElement | null | undefined
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: Redo with typesafe PubSub
    Subscribe('Navigate:Data', (data) => { this.BuildFolders(data as Data) })
  }
}
