'use sanity'

import { Publish, Subscribe } from './pubsub'

import { isHTMLElement, CloneNode } from './utils'
import { type FolderWithCounts, isListing, type Listing } from '#contracts/listing'
import { HasValue, HasValues, StringishHasValue, ZERO_COUNT } from '#utils/helpers'

const PERCENT_MULT = 100
const FIXED_DECIMAL_PLACES = 2

export const Folders = {
  FolderCard: null as DocumentFragment | null,
  HideTab: (selector: string): void => {
    document.querySelector(selector)?.parentElement?.classList.add('hidden')
  },
  UnhideTab: (selector: string): void => {
    document.querySelector(selector)?.parentElement?.classList.remove('hidden')
  },
  BuildCard: (folder: FolderWithCounts): HTMLElement | null => {
    const card = CloneNode(Folders.FolderCard, isHTMLElement)
    if (card === undefined) {
      return null
    }
    if (StringishHasValue(folder.cover)) {
      card.querySelector('i')?.remove()
      card.style.backgroundImage = `url("/images/preview${folder.cover}-image.webp")`
    }
    if (folder.totalSeen >= folder.totalCount) {
      card.classList.add('seen')
    }

    const txtSeen = folder.totalSeen.toLocaleString()
    const txtCount = folder.totalCount.toLocaleString()
    const percentSeen =
      folder.totalCount === ZERO_COUNT ? PERCENT_MULT : (PERCENT_MULT * folder.totalSeen) / folder.totalCount

    const header = card.querySelector('h5')
    if (header !== null) header.innerText = folder.name
    const progress = card.querySelector<HTMLDivElement>('div.text')
    if (progress !== null) progress.innerText = `${txtSeen}/${txtCount}`
    const slider = card.querySelector<HTMLDivElement>('div.slider')
    if (slider !== null) slider.style.width = `${percentSeen.toFixed(FIXED_DECIMAL_PLACES)}%`
    card.addEventListener('click', () => {
      Publish('Navigate:Load', folder.path)
    })
    return card
  },
  BuildAllCards(data: Listing): void {
    if (data.children === undefined) return
    const container: HTMLElement = document.createElement('div')
    container.classList.add('folders')
    document.querySelector('#tabFolders')?.appendChild(container)

    for (const folder of data.children) {
      const card = Folders.BuildCard(folder)
      if (!HasValue(card)) continue
      container.appendChild(card)
    }
  },
  BuildFolders: (data: Listing): void => {
    for (const folder of document.querySelectorAll('#tabFolders .folders')) {
      folder.remove()
    }
    const hasChildren = HasValues(data.children)
    const hasPictures = HasValues(data.pictures)
    if (hasChildren) {
      Folders.UnhideTab('a[href="#tabFolders"]')
      if (!hasPictures) {
        Publish('Tab:Select', 'Folders')
      }
    } else {
      Folders.HideTab('a[href="#tabFolders"]')
    }
    Folders.BuildAllCards(data)
  },
  Init: (): void => {
    Folders.FolderCard = document.querySelector<HTMLTemplateElement>('#FolderCard')?.content ?? null
    Subscribe('Navigate:Data', async (data) => {
      if (isListing(data)) Folders.BuildFolders(data)
      await Promise.resolve()
    })
  },
}
