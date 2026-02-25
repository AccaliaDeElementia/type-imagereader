'use sanity'

import { Pictures } from '.'
import type { Listing, Picture } from '../../../../contracts/listing'
import { GetFirst } from '../../../../utils/helpers'
import { Publish } from '../pubsub'

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
