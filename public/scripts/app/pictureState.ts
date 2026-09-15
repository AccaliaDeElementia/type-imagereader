'use sanity'

import type { Picture } from '#contracts/listing.js'
import { isListing, isPicture } from '#contracts/listing.js'
import { resetMarkup as _resetMarkup } from './pictureMarkup.js'
import {
  changePicture as _changePicture,
  loadData as _loadData,
  refreshImage as _refreshImage,
  resetViewerState as _resetViewerState,
} from './pictureNavigation.js'
import { initActions as _initActions, initMouse as _initMouse } from './pictureInput.js'
import { initUnreadSelector as _initUnreadSelector } from './unreadFilter.js'
import { initSizeSelector as _initSizeSelector } from './sizeMode.js'
import { init as _initImageViewport } from './imageViewport.js'
import { subscribe as _subscribe } from './pubsub.js'

export const Imports = {
  loadData: _loadData,
  resetMarkup: _resetMarkup,
  resetViewerState: _resetViewerState,
  changePicture: _changePicture,
  refreshImage: _refreshImage,
  initActions: _initActions,
  initMouse: _initMouse,
  initUnreadSelector: _initUnreadSelector,
  initSizeSelector: _initSizeSelector,
  initImageViewport: _initImageViewport,
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
  Imports.subscribe('Pictures:Refresh', async () => {
    await Imports.refreshImage()
  })
  Imports.initActions()
  Imports.initMouse()
  Imports.initUnreadSelector()
  Imports.initSizeSelector()
  Imports.initImageViewport()
}

export const Pictures = {
  ...defaultState(),
  init,
}
