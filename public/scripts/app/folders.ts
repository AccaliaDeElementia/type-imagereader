'use sanity'

import { Publish, Subscribe } from './pubsub'

interface Folder {
  name: string
  path: string
  cover: string|null
  totalSeen: number
  totalCount: number
}
interface Data {
  children?: Folder[]
  pictures?: any[]
}

export class Folders {
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

    const folderCard: DocumentFragment = (document.querySelector('#FolderCard') as HTMLTemplateElement).content
    for (const folder of data.children) {
      const card = (folderCard.cloneNode(true) as HTMLElement).firstElementChild as HTMLElement
      if (!card) continue
      if (folder.cover) {
        card.querySelector('i')?.remove()
        card.style.backgroundImage = `url("/images/preview${folder.cover}")`
      }
      if (folder.totalSeen >= folder.totalCount) {
        card.classList.add('seen')
      }

      const txtSeen = folder.totalSeen.toLocaleString()
      const txtCount = folder.totalCount.toLocaleString()
      const txtPercent = `${100 * folder.totalSeen / folder.totalCount}%`

      const header = card.querySelector('h5')
      if (header) header.innerText = folder.name
      const progress = card.querySelector('div.text') as HTMLDivElement
      if (progress) progress.innerText = `${txtSeen}/${txtCount}`
      const slider = card.querySelector('div.slider') as HTMLDivElement
      if (slider) slider.style.width = txtPercent
      card.addEventListener('click', () => Publish('Navigate:Load', folder.path))
      container.appendChild(card)
    }
  }

  public static Init () {
    Subscribe('Navigate:Data', this.BuildFolders)
  }
}
