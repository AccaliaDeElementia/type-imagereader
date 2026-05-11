'use sanity'

import type { Listing, Picture } from '#contracts/listing.js'
import { Pictures } from './state.js'
import { makeTab as _makeTab } from './grid.js'
import { loadImage as _loadImage } from './viewer.js'
import { getFirst } from '#utils/helpers.js'
import { publish as _publish } from '../pubsub.js'

const DEFAULT_MOD_COUNT = -1

export const Imports = {
  makeTab: _makeTab,
  loadImage: _loadImage,
  publish: _publish,
}

function setPictureIndices(): void {
  for (const [pic, i] of Pictures.pictures.map((pic, i): [Picture, number] => [pic, i])) {
    pic.index = i
  }
}

function setPicturesGetFirst(data: Listing): Picture | null {
  if (Pictures.mainImage === null) return null
  const firstPic = getFirst(data.pictures)
  if (data.pictures === undefined || firstPic === undefined) {
    Pictures.mainImage.classList.add('hidden')
    Imports.publish('Menu:show')
    document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.add('hidden')
    return null
  }
  Pictures.mainImage.classList.remove('hidden')
  document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.remove('hidden')
  Pictures.pictures = data.pictures
  Pictures.modCount = data.modCount ?? DEFAULT_MOD_COUNT
  Internals.setPictureIndices()
  return firstPic
}

export const Internals = {
  setPicturesGetFirst,
  setPictureIndices,
}

export async function loadData(data: Listing): Promise<void> {
  Pictures.resetMarkup()
  const firstPic = Internals.setPicturesGetFirst(data)
  if (firstPic === null) return

  const selected = Pictures.pictures.find((picture) => picture.path === data.cover)
  if (selected === undefined) {
    Pictures.current = firstPic
  } else {
    Pictures.current = selected
  }
  Imports.makeTab()
  Imports.publish('Tab:Select', 'Images')
  if (Pictures.pictures.every((img) => img.seen) && (data.noMenu === undefined || !data.noMenu)) {
    Imports.publish('Menu:show')
  } else {
    Imports.publish('Menu:Hide')
  }
  await Imports.loadImage().catch(() => null)
}
