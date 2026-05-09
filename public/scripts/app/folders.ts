'use sanity'

import { publish, subscribe } from './pubsub.js'

import { isHTMLElement, cloneNode } from './utils.js'
import { type FolderWithCounts, isListing, type Listing } from '#contracts/listing.js'
import { hasValue, hasValues, stringishHasValue, ZERO_COUNT } from '#utils/helpers.js'

const PERCENT_MULT = 100
const FIXED_DECIMAL_PLACES = 2

export const Folders = {
  folderCard: null as DocumentFragment | null,
}

function HideTab(selector: string): void {
  document.querySelector(selector)?.parentElement?.classList.add('hidden')
}

function UnhideTab(selector: string): void {
  document.querySelector(selector)?.parentElement?.classList.remove('hidden')
}

function BuildCard(folder: FolderWithCounts): HTMLElement | null {
  const card = cloneNode(Folders.folderCard, isHTMLElement)
  if (card === undefined) {
    return null
  }
  if (stringishHasValue(folder.cover)) {
    card.querySelector('i')?.remove()
    card.style.backgroundImage = `url("/images/preview${folder.cover}-image.webp")`
  }
  if (folder.seenCount >= folder.totalCount) {
    card.classList.add('seen')
  }

  const txtSeen = folder.seenCount.toLocaleString()
  const txtCount = folder.totalCount.toLocaleString()
  const percentSeen =
    folder.totalCount === ZERO_COUNT ? PERCENT_MULT : (PERCENT_MULT * folder.seenCount) / folder.totalCount

  const header = card.querySelector('h5')
  if (header !== null) header.innerText = folder.name
  const progress = card.querySelector<HTMLDivElement>('div.text')
  if (progress !== null) progress.innerText = `${txtSeen}/${txtCount}`
  const slider = card.querySelector<HTMLDivElement>('div.slider')
  if (slider !== null) slider.style.width = `${percentSeen.toFixed(FIXED_DECIMAL_PLACES)}%`
  card.addEventListener('click', () => {
    publish('Navigate:Load', folder.path)
  })
  return card
}

function BuildAllCards(data: Listing): void {
  if (data.children === undefined) return
  const container: HTMLElement = document.createElement('div')
  container.classList.add('folders')
  document.querySelector('#tabFolders')?.appendChild(container)

  for (const folder of data.children) {
    const card = Internals.BuildCard(folder)
    if (!hasValue(card)) continue
    container.appendChild(card)
  }
}

function BuildFolders(data: Listing): void {
  for (const folder of document.querySelectorAll('#tabFolders .folders')) {
    folder.remove()
  }
  const hasChildren = hasValues(data.children)
  const hasPictures = hasValues(data.pictures)
  if (hasChildren) {
    Internals.UnhideTab('a[href="#tabFolders"]')
    if (!hasPictures) {
      publish('Tab:Select', 'Folders')
    }
  } else {
    Internals.HideTab('a[href="#tabFolders"]')
  }
  Internals.BuildAllCards(data)
}

export function init(): void {
  Folders.folderCard = document.querySelector<HTMLTemplateElement>('#folderCard')?.content ?? null
  subscribe('Navigate:Data', async (data) => {
    if (isListing(data)) Internals.BuildFolders(data)
    await Promise.resolve()
  })
}

export const Internals = {
  HideTab,
  UnhideTab,
  BuildCard,
  BuildAllCards,
  BuildFolders,
}
