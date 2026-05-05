'use sanity'

import { type NavigateTo, Pictures } from './index.js'
import type { Picture } from '#contracts/listing.js'

export function GetPicture(navi: NavigateTo): Picture | undefined {
  const current = Pictures.current?.index
  if (current === undefined) {
    return undefined
  }
  const unreads = [
    ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index > current),
    ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index < current),
  ]
  const index = Pictures.ChoosePictureIndex(navi, current, unreads)
  return Pictures.pictures[index]
}
