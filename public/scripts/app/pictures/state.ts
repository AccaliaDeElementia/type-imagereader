'use sanity'

import type { Picture } from '#contracts/listing.js'
import { isListing, isPicture } from '#contracts/listing.js'
import { resetMarkup as _gridResetMarkup } from './grid.js'
import { changePicture as _changePicture, resetMarkup as _viewerResetMarkup } from './viewer.js'
import { loadData as _loadData } from './data.js'
import { initActions as _initActions, initMouse as _initMouse } from './inputs.js'
import { initUnreadSelectorSlider as _initUnreadSelectorSlider } from './unreadFilter.js'
import { subscribe as _subscribe } from '../pubsub.js'

export const Imports = {
  loadData: _loadData,
  gridResetMarkup: _gridResetMarkup,
  viewerResetMarkup: _viewerResetMarkup,
  changePicture: _changePicture,
  initActions: _initActions,
  initMouse: _initMouse,
  initUnreadSelectorSlider: _initUnreadSelectorSlider,
  subscribe: _subscribe,
}

const UNINITIALIZED_MOD_COUNT = -1
export const UNINITIALIZED_SCALE = -1
const PICTURES_PER_PAGE = 32
const CACHE_SIZE = 10

interface PictureCache {
  size: number
  next: Picture[]
  prev: Picture[]
}

interface StateFields {
  modCount: number
  nextLoader: Promise<unknown>
  nextPending: boolean
  initialScale: number
  pictures: Picture[]
  current: Picture | null
  mainImage: HTMLImageElement | null
  imageCard: HTMLTemplateElement | null
  pageSize: number
  cache: PictureCache
}

function defaultState(): StateFields {
  return {
    modCount: UNINITIALIZED_MOD_COUNT,
    nextLoader: Promise.resolve(),
    nextPending: true,
    initialScale: UNINITIALIZED_SCALE,
    pictures: [],
    current: null,
    mainImage: null,
    imageCard: null,
    pageSize: PICTURES_PER_PAGE,
    cache: { size: CACHE_SIZE, next: [], prev: [] },
  }
}

function resetMarkup(): void {
  Pictures.mainImage = document.querySelector<HTMLImageElement>('#bigImage img')
  Pictures.imageCard = document.querySelector<HTMLTemplateElement>('#ImageCard')
  Imports.gridResetMarkup()
  Imports.viewerResetMarkup()
}

function init(): void {
  Object.assign(Pictures, defaultState())
  Pictures.resetMarkup()
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
  resetMarkup,
}
