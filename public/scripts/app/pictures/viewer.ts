'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from './state.js'
import { selectPage as _selectPage } from './grid.js'
import { getShowUnreadOnly as _getShowUnreadOnly } from './unreadFilter.js'
import { hasValues, indexPercentToText, indexToText, stringishHasValue } from '#utils/helpers.js'
import { isLoading as _isLoading } from '../loading.js'
import { postJSON as _postJSON } from '../net.js'
import { publish as _publish } from '../pubsub.js'

export const Imports = {
  getShowUnreadOnly: _getShowUnreadOnly,
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

export function resetMarkup(): void {
  for (const bar of ['top', 'bottom']) {
    for (const position of ['left', 'center', 'right']) {
      document.querySelector(`.statusBar.${bar} .${position}`)?.replaceChildren('')
    }
  }
  Pictures.mainImage?.setAttribute('src', '')
  Pictures.mainImage?.addEventListener('load', () => {
    Imports.publish('Loading:Hide')
  })
  Pictures.mainImage?.addEventListener('error', () => {
    const src = Pictures.mainImage?.getAttribute('src')
    if (stringishHasValue(src)) {
      Imports.publish('Loading:Error', `Main Image Failed to Load: ${Pictures.current?.name}`)
    }
  })
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
  if (Pictures.nextPending) {
    Imports.publish('Loading:show')
  }
  try {
    Pictures.current.seen = true
    Pictures.current.element?.classList.add('seen')
    const { modCount } = Pictures
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
    Pictures.modCount = newModCount
    await Pictures.nextLoader
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
    Pictures.nextPending = false
    Pictures.nextLoader = Promise.resolve()
  } else {
    const uri = Internals.makeURI(Pictures.mainImage?.width, Pictures.mainImage?.height, next)
    Pictures.nextPending = true
    const clearPending = (): void => {
      Pictures.nextPending = false
    }
    Pictures.nextLoader = window.fetch(uri).then(clearPending, clearPending)
  }
  await Pictures.nextLoader
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

export const Internals = {
  loadImage,
  loadNextImage,
  getPicture,
  choosePictureIndex,
  makeURI,
}
