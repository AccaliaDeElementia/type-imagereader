'use sanity'

import { Pictures } from '.'
import type { Picture } from '../../../../contracts/listing'

export function SetPictureIndices(): void {
  for (const [pic, i] of Pictures.pictures.map((pic, i): [Picture, number] => [pic, i])) {
    pic.index = i
  }
}
