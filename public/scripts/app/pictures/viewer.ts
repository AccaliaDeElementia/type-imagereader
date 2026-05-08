'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from './index.js'
import { SelectPage as _SelectPage } from './grid.js'
import { GetShowUnreadOnly as _GetShowUnreadOnly } from './unreadFilter.js'
import { HasValues, IndexPercentToText, IndexToText, StringishHasValue } from '#utils/helpers.js'
import { Loading } from '../loading.js'
import { Net } from '../net.js'
import { Publish } from '../pubsub.js'

export const Imports = {
  GetShowUnreadOnly: _GetShowUnreadOnly,
  SelectPage: _SelectPage,
}

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

function ResetMarkup(): void {
  for (const bar of ['top', 'bottom']) {
    for (const position of ['left', 'center', 'right']) {
      document.querySelector(`.statusBar.${bar} .${position}`)?.replaceChildren('')
    }
  }
  Pictures.mainImage?.setAttribute('src', '')
  Pictures.mainImage?.addEventListener('load', () => {
    Publish('Loading:Hide')
  })
  Pictures.mainImage?.addEventListener('error', () => {
    const src = Pictures.mainImage?.getAttribute('src')
    if (StringishHasValue(src)) {
      Publish('Loading:Error', `Main Image Failed to Load: ${Pictures.current?.name}`)
    }
  })
}

async function ChangePicture(pic: Picture | undefined): Promise<void> {
  if (Loading.IsLoading()) {
    return
  }
  if (pic === undefined) {
    Publish('Loading:Error', 'Change Picture called with No Picture to change to')
    return
  }
  Pictures.current = pic
  await Viewer.LoadImage().catch(() => null)
  Publish('Menu:Hide')
}

async function LoadImage(): Promise<void> {
  if (Pictures.current === null) return
  if (Pictures.current.path === '') return
  if (Pictures.nextPending) {
    Publish('Loading:Show')
  }
  try {
    Pictures.current.seen = true
    Pictures.current.element?.classList.add('seen')
    const modCount = Pictures.modCount
    const newModCount = await Net.PostJSON<number | undefined>(
      '/api/navigate/latest',
      { path: Pictures.current.path, modCount },
      (o): o is number | undefined => (typeof o === 'number' && Number.isFinite(o)) || o === undefined,
    )
    if (!isUsableModCount(newModCount)) {
      Publish('Navigate:Reload')
      return
    }
    // eslint-disable-next-line require-atomic-updates -- modCount is intentionally updated with the server response
    Pictures.modCount = newModCount
    await Pictures.nextLoader
    Pictures.mainImage?.setAttribute(
      'src',
      makeURI(Pictures.mainImage.width, Pictures.mainImage.height, Pictures.current),
    )
    const { index = DEFAULT_INDEX } = Pictures.current
    const displayTotal = Pictures.pictures.length.toLocaleString()
    const displayIndex = IndexToText(index)
    const displayPercent = IndexPercentToText(index, Pictures.pictures.length)
    setTextContent('.statusBar.bottom .center', Pictures.current.name)
    setTextContent('.statusBar.bottom .left', `(${displayIndex}/${displayTotal})`)
    setTextContent('.statusBar.bottom .right', `(${displayPercent}%)`)
    Imports.SelectPage(Pictures.current.page ?? DEFAULT_PAGE)
    void Viewer.LoadNextImage().catch(() => undefined)
    Publish('Picture:LoadNew')
  } catch (err) {
    Publish('Loading:Error', err)
  }
}

async function LoadNextImage(): Promise<void> {
  const next = Viewer.GetPicture(Imports.GetShowUnreadOnly() ? NavigateTo.NextUnread : NavigateTo.Next)
  if (next === undefined) {
    Pictures.nextPending = false
    Pictures.nextLoader = Promise.resolve()
  } else {
    const uri = makeURI(Pictures.mainImage?.width, Pictures.mainImage?.height, next)
    Pictures.nextPending = true
    const clearPending = (): void => {
      Pictures.nextPending = false
    }
    Pictures.nextLoader = window.fetch(uri).then(clearPending, clearPending)
  }
  await Pictures.nextLoader
}

function GetPicture(navi: NavigateTo): Picture | undefined {
  const current = Pictures.current?.index
  if (current === undefined) {
    return undefined
  }
  const unreads = [
    ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index > current),
    ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index < current),
  ]
  const index = Viewer.ChoosePictureIndex(navi, current, unreads)
  return Pictures.pictures[index]
}

function ChoosePictureIndex(navi: NavigateTo, current: number, unreads: Picture[]): number {
  if (!HasValues(Pictures.pictures)) return NO_SUCH_INDEX
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

export const Viewer = {
  ResetMarkup,
  ChangePicture,
  LoadImage,
  LoadNextImage,
  GetPicture,
  ChoosePictureIndex,
}
