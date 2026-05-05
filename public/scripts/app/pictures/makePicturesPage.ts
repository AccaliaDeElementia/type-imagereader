'use sanity'

import { Pictures } from './index.js'
import type { Picture } from '#contracts/listing.js'

export function MakePicturesPage(pageNum: number, pictures: Picture[]): HTMLElement {
  const page = document.createElement('div')
  page.classList.add('page')
  for (const picture of pictures) {
    const card = Pictures.MakePictureCard(picture)
    if (card === undefined) continue
    picture.element = card
    picture.page = pageNum
    page.appendChild(card)
  }
  return page
}
