'use sanity'

import { CACHE_SIZE, Pictures } from './index.js'
import { isListing } from '#contracts/listing.js'
import { Subscribe } from '../pubsub.js'

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
