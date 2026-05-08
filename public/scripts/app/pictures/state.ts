'use sanity'

import type { Picture } from '#contracts/listing.js'
import { isListing, isPicture } from '#contracts/listing.js'
import { Grid } from './grid.js'
import { Viewer } from './viewer.js'
import { Data } from './data.js'
import { Inputs } from './inputs.js'
import { UnreadFilter } from './unreadFilter.js'
import { Subscribe } from '../pubsub.js'

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
  Grid.ResetMarkup()
  Viewer.ResetMarkup()
}

function Init(): void {
  Object.assign(Pictures, defaultState())
  Pictures.ResetMarkup()
  Subscribe('Navigate:Data', async (data) => {
    if (isListing(data)) await Data.LoadData(data)
  })
  Subscribe('Pictures:Change', async (data) => {
    if (isPicture(data)) await Viewer.ChangePicture(data)
  })
  Inputs.InitActions()
  Inputs.InitMouse()
  UnreadFilter.InitUnreadSelectorSlider()
}

export const Pictures = {
  ...defaultState(),
  Init,
  ResetMarkup,
}
