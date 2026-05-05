'use sanity'

import { Pictures } from './index.js'
import type { Listing, Picture } from '#contracts/listing.js'
import { GetFirst } from '#utils/helpers.js'
import { Publish } from '../pubsub.js'

const DEFAULT_MOD_COUNT = -1

export function SetPicturesGetFirst(data: Listing): Picture | null {
  if (Pictures.mainImage === null) return null
  const firstPic = GetFirst(data.pictures)
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
  Pictures.SetPictureIndices()
  return firstPic
}
