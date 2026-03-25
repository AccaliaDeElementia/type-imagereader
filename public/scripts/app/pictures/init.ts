'use sanity'

import { CACHE_SIZE, Pictures } from '.'
import { isListing } from '#contracts/listing'
import { Subscribe } from '../pubsub'

export function Init(): void {
  Pictures.pictures = []
  Pictures.current = null
  Pictures.nextLoader = Promise.resolve()
  Pictures.nextPending = true
  Pictures.cache = { size: CACHE_SIZE, next: [], prev: [] }
  Pictures.ResetMarkup()
  Subscribe('Navigate:Data', async (data) => {
    if (isListing(data)) await Pictures.LoadData(data)
  })
  Pictures.InitActions()
  Pictures.InitMouse()
  Pictures.InitUnreadSelectorSlider()
}
