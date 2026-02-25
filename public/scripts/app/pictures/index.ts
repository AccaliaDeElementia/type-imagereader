'use sanity'

import type { Picture } from '../../../../contracts/listing'
import { InitMouse } from './initMouse'
import { ResetMarkup } from './resetMarkup'
import { InitActions } from './initActions'
import { GetCurrentPage } from './getCurrentPage'
import { Init } from './init'
import { SelectPage } from './selectPage'
import { LoadCurrentPageImages } from './loadCurrentPageImages'
import { MakePictureCard } from './makePictureCard'
import { MakePicturesPage } from './makePicturesPage'
import { MakePaginatorItem } from './makePaginatorItem'
import { MakePaginator } from './makePaginator'
import { MakeTab } from './makeTab'
import { LoadNextImage } from './loadNextImage'
import { LoadImage } from './loadImage'
import { SetPictureIndices } from './setPictureIndices'
import { SetPicturesGetFirst } from './SetPicturesGetFirst'
import { LoadData } from './loadData'
import { ChoosePictureIndex } from './choosePictureIndex'
import { GetPicture } from './getPicture'
import { ChangePicture } from './changePicture'
import { GetShowUnreadOnly, SetShowUnreadOnly } from './getSetShowUnreadOnly'
import { UpdateUnreadSelectorSlider } from './updateUnreadSelectorSlider'
import { InitUnreadSelectorSlider } from './initUnreadSelectorSlider'

export enum NavigateTo {
  First,
  PreviousUnread,
  Previous,
  Next,
  NextUnread,
  Last,
}

export function makeURI(width: number | undefined, height: number | undefined, img: Picture): string {
  return `/images/scaled/${width}/${height}${img.path}-image.webp`
}

interface PictureCache {
  size: number
  next: Picture[]
  prev: Picture[]
}

const DEFAULT_MOD_COUNT = -1
export const DEFAULT_SCALE = -1
const PICTURES_PER_PAGE = 32
export const CACHE_SIZE = 10

export const Pictures = {
  modCount: DEFAULT_MOD_COUNT,
  nextLoader: Promise.resolve(),
  nextPending: true,
  initialScale: DEFAULT_SCALE,
  pictures: ((): Picture[] => [])(),
  current: ((): Picture | null => null)(),
  mainImage: ((): HTMLImageElement | null => null)(),
  imageCard: ((): HTMLTemplateElement | null => null)(),
  pageSize: PICTURES_PER_PAGE,
  cache: ((): PictureCache => ({ size: CACHE_SIZE, next: [], prev: [] }))(),
  Init,
  ResetMarkup,
  InitActions,
  InitMouse,
  GetCurrentPage,
  SelectPage,
  LoadCurrentPageImages,
  MakePictureCard,
  MakePicturesPage,
  MakePaginatorItem,
  MakePaginator,
  MakeTab,
  LoadNextImage,
  LoadImage,
  SetPictureIndices,
  SetPicturesGetFirst,
  LoadData,
  ChoosePictureIndex,
  GetPicture,
  ChangePicture,
  GetShowUnreadOnly,
  SetShowUnreadOnly,
  UpdateUnreadSelectorSlider,
  InitUnreadSelectorSlider,
}
