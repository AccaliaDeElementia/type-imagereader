'use sanity'

import type { Listing, Picture } from '#contracts/listing.js'
import { Pictures } from './index.js'
import { MakeTab as _MakeTab } from './grid.js'
import { LoadImage as _LoadImage } from './viewer.js'
import { getFirst } from '#utils/helpers.js'
import { Publish } from '../pubsub.js'

const DEFAULT_MOD_COUNT = -1

export const Imports = {
  MakeTab: _MakeTab,
  LoadImage: _LoadImage,
}

function SetPictureIndices(): void {
  for (const [pic, i] of Pictures.pictures.map((pic, i): [Picture, number] => [pic, i])) {
    pic.index = i
  }
}

function SetPicturesGetFirst(data: Listing): Picture | null {
  if (Pictures.mainImage === null) return null
  const firstPic = getFirst(data.pictures)
  if (data.pictures === undefined || firstPic === undefined) {
    Pictures.mainImage.classList.add('hidden')
    Publish('Menu:Show')
    document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.add('hidden')
    return null
  }
  Pictures.mainImage.classList.remove('hidden')
  document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.remove('hidden')
  Pictures.pictures = data.pictures
  Pictures.modCount = data.modCount ?? DEFAULT_MOD_COUNT
  Internals.SetPictureIndices()
  return firstPic
}

export const Internals = {
  SetPicturesGetFirst,
  SetPictureIndices,
}

export async function LoadData(data: Listing): Promise<void> {
  Pictures.ResetMarkup()
  const firstPic = Internals.SetPicturesGetFirst(data)
  if (firstPic === null) return

  const selected = Pictures.pictures.find((picture) => picture.path === data.cover)
  if (selected === undefined) {
    Pictures.current = firstPic
  } else {
    Pictures.current = selected
  }
  Imports.MakeTab()
  Publish('Tab:Select', 'Images')
  if (Pictures.pictures.every((img) => img.seen) && (data.noMenu === undefined || !data.noMenu)) {
    Publish('Menu:Show')
  } else {
    Publish('Menu:Hide')
  }
  await Imports.LoadImage().catch(() => null)
}
