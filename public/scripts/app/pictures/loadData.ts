'use sanity'

import { Pictures } from './index.js'
import type { Listing } from '#contracts/listing.js'
import { Publish } from '../pubsub.js'

export async function LoadData(data: Listing): Promise<void> {
  Pictures.ResetMarkup()
  const firstPic = Pictures.SetPicturesGetFirst(data)
  if (firstPic === null) return

  const selected = Pictures.pictures.find((picture) => picture.path === data.cover)
  if (selected === undefined) {
    Pictures.current = firstPic
  } else {
    Pictures.current = selected
  }
  Pictures.MakeTab()
  Publish('Tab:Select', 'Images')
  if (Pictures.pictures.every((img) => img.seen) && (data.noMenu === undefined || !data.noMenu)) {
    Publish('Menu:Show')
  } else {
    Publish('Menu:Hide')
  }
  await Pictures.LoadImage().catch(() => null)
}
