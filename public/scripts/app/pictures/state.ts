'use sanity'

import type { Picture } from '#contracts/listing.js'
import { isListing, isPicture } from '#contracts/listing.js'
import { ResetMarkup as _GridResetMarkup } from './grid.js'
import { Viewer } from './viewer.js'
import { LoadData as _LoadData } from './data.js'
import { InitActions as _InitActions, InitMouse as _InitMouse } from './inputs.js'
import { InitUnreadSelectorSlider as _InitUnreadSelectorSlider } from './unreadFilter.js'
import { Subscribe } from '../pubsub.js'

export const Imports = {
  LoadData: _LoadData,
  GridResetMarkup: _GridResetMarkup,
  InitActions: _InitActions,
  InitMouse: _InitMouse,
  InitUnreadSelectorSlider: _InitUnreadSelectorSlider,
}

const UNINITIALIZED_MOD_COUNT = -1
export const UNINITIALIZED_SCALE = -1
const PICTURES_PER_PAGE = 32
export const CACHE_SIZE = 10

interface PictureCache {
  size: number
  next: Picture[]
  prev: Picture[]
}

export interface StateFields {
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

export function defaultState(): StateFields {
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

function ResetMarkup(): void {
  Pictures.mainImage = document.querySelector<HTMLImageElement>('#bigImage img')
  Pictures.imageCard = document.querySelector<HTMLTemplateElement>('#ImageCard')
  Imports.GridResetMarkup()
  Viewer.ResetMarkup()
}

function Init(): void {
  Object.assign(Pictures, defaultState())
  Pictures.ResetMarkup()
  Subscribe('Navigate:Data', async (data) => {
    if (isListing(data)) await Imports.LoadData(data)
  })
  Subscribe('Pictures:Change', async (data) => {
    if (isPicture(data)) await Viewer.ChangePicture(data)
  })
  Imports.InitActions()
  Imports.InitMouse()
  Imports.InitUnreadSelectorSlider()
}

export const Pictures = {
  ...defaultState(),
  Init,
  ResetMarkup,
}
