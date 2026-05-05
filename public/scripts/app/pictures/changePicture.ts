'use sanity'

import { Pictures } from './index.js'
import type { Picture } from '#contracts/listing.js'
import { Loading } from '../loading.js'
import { Publish } from '../pubsub.js'

export async function ChangePicture(pic: Picture | undefined): Promise<void> {
  if (Loading.IsLoading()) {
    return
  }
  if (pic === undefined) {
    Publish('Loading:Error', 'Change Picture called with No Picture to change to')
    return
  }
  Pictures.current = pic
  await Pictures.LoadImage().catch(() => null)
  Publish('Menu:Hide')
}
