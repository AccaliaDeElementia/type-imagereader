'use sanity'

import type { Picture } from '#contracts/listing.js'
import { InitMouse } from './initMouse.js'
import { ResetMarkup } from './resetMarkup.js'
import { InitActions } from './initActions.js'
import { GetCurrentPage } from './getCurrentPage.js'
import { Init } from './init.js'
import { SelectPage } from './selectPage.js'
import { LoadCurrentPageImages } from './loadCurrentPageImages.js'
import { MakePictureCard } from './makePictureCard.js'
import { MakePicturesPage } from './makePicturesPage.js'
import { MakePaginatorItem } from './makePaginatorItem.js'
import { MakePaginator } from './makePaginator.js'
import { MakeTab } from './makeTab.js'
import { LoadNextImage } from './loadNextImage.js'
import { LoadImage } from './loadImage.js'
import { SetPictureIndices } from './setPictureIndices.js'
import { SetPicturesGetFirst } from './SetPicturesGetFirst.js'
import { LoadData } from './loadData.js'
import { ChoosePictureIndex } from './choosePictureIndex.js'
import { GetPicture } from './getPicture.js'
import { ChangePicture } from './changePicture.js'
import { GetShowUnreadOnly, SetShowUnreadOnly } from './getSetShowUnreadOnly.js'
import { UpdateUnreadSelectorSlider } from './updateUnreadSelectorSlider.js'
import { InitUnreadSelectorSlider } from './initUnreadSelectorSlider.js'

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

const UNINITIALIZED_MOD_COUNT = -1
export const UNINITIALIZED_SCALE = -1
const PICTURES_PER_PAGE = 32
export const CACHE_SIZE = 10

export const Pictures = {
  modCount: UNINITIALIZED_MOD_COUNT,
  nextLoader: Promise.resolve(),
  nextPending: true,
  initialScale: UNINITIALIZED_SCALE,
  pictures: [] as Picture[],
  current: null as Picture | null,
  mainImage: null as HTMLImageElement | null,
  imageCard: null as HTMLTemplateElement | null,
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
