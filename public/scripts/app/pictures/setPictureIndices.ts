'use sanity'

import { Pictures } from './index.js'
import type { Picture } from '#contracts/listing.js'

export function SetPictureIndices(): void {
  for (const [pic, i] of Pictures.pictures.map((pic, i): [Picture, number] => [pic, i])) {
    pic.index = i
  }
}
