'use sanity'

import { Publish, Subscribe } from './pubsub'

export interface Folder {
  name: string
  path: string
  cover: string|null
  totalSeen: number
  totalCount: number
}
export interface Data {
  children?: Folder[]
  pictures?: any[]
}

export class Folders {
  static FolderCard: DocumentFragment|null = null

  public static BuildCard (folder: Folder): HTMLElement|null {
    const card = (this.FolderCard?.cloneNode(true) as HTMLElement)?.firstElementChild as HTMLElement
    if (!card) {
      return null
    }
    if (folder.cover) {
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
    if (header) header.innerText = folder.name
    const progress = card.querySelector<HTMLDivElement>('div.text')
    if (progress) progress.innerText = `${txtSeen}/${txtCount}`
    const slider = card.querySelector<HTMLDivElement>('div.slider')
    if (slider) slider.style.width = `${percentSeen.toFixed(2)}%`
    card.addEventListener('click', () => Publish('Navigate:Load', folder.path))
    return card
  }

  public static BuildFolders (data: Data): void {
    for (const folder of document.querySelectorAll('#tabFolders .folders')) {
      folder.remove()
    }
    if (!data.children || !data.children?.length) {
      document.querySelector('a[href="#tabFolders')?.parentElement?.classList.add('hidden')
      return
    }
    if (!data.pictures || !data.pictures?.length) {
      Publish('Tab:Select', 'Folders')
    }
    document.querySelector('a[href="#tabFolders')?.parentElement?.classList.remove('hidden')

    const container: HTMLElement = document.createElement('div')
    container.classList.add('folders')
    document.querySelector('#tabFolders')?.appendChild(container)

    for (const folder of data.children) {
      const card = this.BuildCard(folder)
      if (!card) continue
      container.appendChild(card)
    }
  }

  public static Init () {
    this.FolderCard = (document.querySelector('#FolderCard') as HTMLTemplateElement).content

    Subscribe('Navigate:Data', (data) => this.BuildFolders(data))
  }
}
