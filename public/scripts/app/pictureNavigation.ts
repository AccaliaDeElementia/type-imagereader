'use sanity'

import type { Listing, Picture } from '#contracts/listing.js'
import { Pictures } from './pictureState.js'
import { makeTab as _makeTab, resetMarkup as _resetMarkup, selectPage as _selectPage } from './pictureMarkup.js'
import { getShowUnreadOnly as _getShowUnreadOnly } from './unreadFilter.js'
import { getFirst, hasValues, indexPercentToText, indexToText } from '#utils/helpers.js'
import { isLoading as _isLoading } from './loading.js'
import { postJSON as _postJSON } from './net.js'
import { publish as _publish } from './pubsub.js'

export const Imports = {
  getShowUnreadOnly: _getShowUnreadOnly,
  makeTab: _makeTab,
  resetMarkup: _resetMarkup,
  selectPage: _selectPage,
  isLoading: _isLoading,
  postJSON: _postJSON,
  publish: _publish,
}

export enum NavigateTo {
  First,
  PreviousUnread,
  Previous,
  Next,
  NextUnread,
  Last,
}

const UNINITIALIZED_MOD_COUNT = -1

export const Viewer = {
  modCount: UNINITIALIZED_MOD_COUNT,
  nextLoader: Promise.resolve() as Promise<unknown>,
  nextPending: true,
}

export function resetViewerState(): void {
  Viewer.modCount = UNINITIALIZED_MOD_COUNT
  Viewer.nextLoader = Promise.resolve()
  Viewer.nextPending = true
}

export function setModCount(modCount: number): void {
  Viewer.modCount = modCount
}

function makeURI(width: number | undefined, height: number | undefined, img: Picture): string {
  return `/images/scaled/${width}/${height}${img.path}-image.webp`
}

const NO_SUCH_INDEX = -1
const MINIMUM_INDEX = 0
const LAST_INDEX_OFFSET = -1
const NEXT_INDEX_OFFSET = 1
const PREV_INDEX_OFFSET = -1

const MINIMUM_MOD_COUNT = 0
const DEFAULT_INDEX = 0
const DEFAULT_PAGE = 1

const isUsableModCount = (n: number | undefined): n is number => n !== undefined && n >= MINIMUM_MOD_COUNT

function setTextContent(selector: string, content: string): void {
  document.querySelector(selector)?.replaceChildren(document.createTextNode(content))
}

export async function changePicture(pic: Picture | undefined): Promise<void> {
  if (Imports.isLoading()) {
    return
  }
  if (pic === undefined) {
    Imports.publish('Loading:Error', 'Change Picture called with No Picture to change to')
    return
  }
  Pictures.current = pic
  await Internals.loadImage().catch(() => null)
  Imports.publish('Menu:Hide')
}

export async function loadImage(): Promise<void> {
  if (Pictures.current === null) return
  if (Pictures.current.path === '') return
  if (Viewer.nextPending) {
    Imports.publish('Loading:show')
  }
  try {
    Pictures.current.seen = true
    Pictures.current.element?.classList.add('seen')
    const { modCount } = Viewer
    const newModCount = await Imports.postJSON<number | undefined>(
      '/api/navigate/latest',
      { path: Pictures.current.path, modCount },
      (o): o is number | undefined => (typeof o === 'number' && Number.isFinite(o)) || o === undefined,
    )
    if (!isUsableModCount(newModCount)) {
      Imports.publish('Navigate:Reload')
      return
    }
    // eslint-disable-next-line require-atomic-updates -- modCount is intentionally updated with the server response
    Viewer.modCount = newModCount
    await Viewer.nextLoader
    Pictures.mainImage?.setAttribute(
      'src',
      Internals.makeURI(Pictures.mainImage.width, Pictures.mainImage.height, Pictures.current),
    )
    const { index = DEFAULT_INDEX } = Pictures.current
    const displayTotal = Pictures.pictures.length.toLocaleString()
    const displayIndex = indexToText(index)
    const displayPercent = indexPercentToText(index, Pictures.pictures.length)
    setTextContent('.statusBar.bottom .center', Pictures.current.name)
    setTextContent('.statusBar.bottom .left', `(${displayIndex}/${displayTotal})`)
    setTextContent('.statusBar.bottom .right', `(${displayPercent}%)`)
    Imports.selectPage(Pictures.current.page ?? DEFAULT_PAGE)
    void Internals.loadNextImage().catch(() => undefined)
    Imports.publish('Picture:LoadNew')
  } catch (err) {
    Imports.publish('Loading:Error', err)
  }
}

async function loadNextImage(): Promise<void> {
  const next = Internals.getPicture(Imports.getShowUnreadOnly() ? NavigateTo.NextUnread : NavigateTo.Next)
  if (next === undefined) {
    Viewer.nextPending = false
    Viewer.nextLoader = Promise.resolve()
  } else {
    const uri = Internals.makeURI(Pictures.mainImage?.width, Pictures.mainImage?.height, next)
    Viewer.nextPending = true
    const clearPending = (): void => {
      Viewer.nextPending = false
    }
    Viewer.nextLoader = window.fetch(uri).then(clearPending, clearPending)
  }
  await Viewer.nextLoader
}

export function getPicture(navi: NavigateTo): Picture | undefined {
  const current = Pictures.current?.index
  if (current === undefined) {
    return undefined
  }
  const unreads = [
    ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index > current),
    ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index < current),
  ]
  const index = Internals.choosePictureIndex(navi, current, unreads)
  return Pictures.pictures[index]
}

function choosePictureIndex(navi: NavigateTo, current: number, unreads: Picture[]): number {
  if (!hasValues(Pictures.pictures)) return NO_SUCH_INDEX
  switch (navi) {
    case NavigateTo.First:
      return MINIMUM_INDEX
    case NavigateTo.PreviousUnread:
      return unreads.pop()?.index ?? NO_SUCH_INDEX
    case NavigateTo.Previous:
      return current > MINIMUM_INDEX ? current + PREV_INDEX_OFFSET : NO_SUCH_INDEX
    case NavigateTo.Next:
      return current < Pictures.pictures.length + LAST_INDEX_OFFSET ? current + NEXT_INDEX_OFFSET : NO_SUCH_INDEX
    case NavigateTo.NextUnread:
      return unreads.shift()?.index ?? NO_SUCH_INDEX
    case NavigateTo.Last:
      return Pictures.pictures.length + LAST_INDEX_OFFSET
  }
}

const DEFAULT_MOD_COUNT = -1

function setPictureIndices(): void {
  for (const [pic, i] of Pictures.pictures.map((pic, i): [Picture, number] => [pic, i])) {
    pic.index = i
  }
}

function setPicturesGetFirst(data: Listing): Picture | null {
  if (Pictures.mainImage === null) return null
  const firstPic = getFirst(data.pictures)
  if (data.pictures === undefined || firstPic === undefined) {
    Pictures.mainImage.classList.add('hidden')
    Imports.publish('Menu:show')
    document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.add('hidden')
    return null
  }
  Pictures.mainImage.classList.remove('hidden')
  document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.remove('hidden')
  Pictures.pictures = data.pictures
  setModCount(data.modCount ?? DEFAULT_MOD_COUNT)
  Internals.setPictureIndices()
  return firstPic
}

export async function loadData(data: Listing): Promise<void> {
  Imports.resetMarkup()
  const firstPic = Internals.setPicturesGetFirst(data)
  if (firstPic === null) return

  const selected = Pictures.pictures.find((picture) => picture.path === data.cover)
  if (selected === undefined) {
    Pictures.current = firstPic
  } else {
    Pictures.current = selected
  }
  Imports.makeTab()
  Imports.publish('Tab:Select', 'Images')
  if (Pictures.pictures.every((img) => img.seen) && (data.noMenu === undefined || !data.noMenu)) {
    Imports.publish('Menu:show')
  } else {
    Imports.publish('Menu:Hide')
  }
  await Internals.loadImage().catch(() => null)
}

export const Internals = {
  loadImage,
  loadNextImage,
  getPicture,
  choosePictureIndex,
  makeURI,
  setPicturesGetFirst,
  setPictureIndices,
}
