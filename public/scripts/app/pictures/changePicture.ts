'use sanity'

import { Pictures } from '.'
import type { Picture } from '#contracts/listing'
import { Loading } from '../loading'
import { Publish } from '../pubsub'

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
