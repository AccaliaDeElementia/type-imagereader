'use sanity'

import type { Picture } from '#contracts/listing.js'
import { isListing, isPicture } from '#contracts/listing.js'
import { resetMarkup as _resetMarkup } from './pictureMarkup.js'
import {
  changePicture as _changePicture,
  loadData as _loadData,
  resetViewerState as _resetViewerState,
} from './pictureNavigation.js'
import { initActions as _initActions, initMouse as _initMouse } from './pictureInput.js'
import { initUnreadSelectorSlider as _initUnreadSelectorSlider } from './unreadFilter.js'
import { subscribe as _subscribe } from './pubsub.js'

export const Imports = {
  loadData: _loadData,
  resetMarkup: _resetMarkup,
  resetViewerState: _resetViewerState,
  changePicture: _changePicture,
  initActions: _initActions,
  initMouse: _initMouse,
  initUnreadSelectorSlider: _initUnreadSelectorSlider,
  subscribe: _subscribe,
}

interface StateFields {
  pictures: Picture[]
  current: Picture | null
  mainImage: HTMLImageElement | null
}

function defaultState(): StateFields {
  return {
    pictures: [],
    current: null,
    mainImage: null,
  }
}

function init(): void {
  Object.assign(Pictures, defaultState())
  Imports.resetViewerState()
  Imports.resetMarkup()
  Imports.subscribe('Navigate:Data', async (data) => {
    if (isListing(data)) await Imports.loadData(data)
  })
  Imports.subscribe('Pictures:Change', async (data) => {
    if (isPicture(data)) await Imports.changePicture(data)
  })
  Imports.initActions()
  Imports.initMouse()
  Imports.initUnreadSelectorSlider()
}

export const Pictures = {
  ...defaultState(),
  init,
}
