'use sanity'

import { makeURI, Pictures } from '.'
import { IndexPercentToText, IndexToText } from '../../../../utils/helpers'
import { Net } from '../net'
import { Publish } from '../pubsub'

function setTextContent(selector: string, content: string): void {
  document.querySelector(selector)?.replaceChildren(document.createTextNode(content))
}

const MINIMUM_MOD_COUNT = 0
const DEFAULT_INDEX = 0
const DEFAULT_PAGE = 1
export async function LoadImage(): Promise<void> {
  if (Pictures.current === null) return
  if (Pictures.nextPending) {
    Publish('Loading:Show')
  }
  try {
    Pictures.current.seen = true
    Pictures.current.element?.classList.add('seen')
    const newModCount = await Net.PostJSON<number | undefined>(
      '/api/navigate/latest',
      { path: Pictures.current.path, modCount: Pictures.modCount },
      (o) => typeof o === 'number' || o === undefined,
    )
    if (newModCount === undefined || newModCount < MINIMUM_MOD_COUNT) {
      Publish('Navigate:Reload')
      return
    }
    Pictures.modCount = newModCount
    await Pictures.nextLoader
    Pictures.mainImage?.setAttribute(
      'src',
      makeURI(Pictures.mainImage.width, Pictures.mainImage.height, Pictures.current),
    )
    const index = Pictures.current.index ?? DEFAULT_INDEX
    const displayTotal = Pictures.pictures.length.toLocaleString()
    const displayIndex = IndexToText(index)
    const displayPercent = IndexPercentToText(index, Pictures.pictures.length)
    setTextContent('.statusBar.bottom .center', Pictures.current.name)
    setTextContent('.statusBar.bottom .left', `(${displayIndex}/${displayTotal})`)
    setTextContent('.statusBar.bottom .right', `(${displayPercent}%)`)
    Pictures.SelectPage(Pictures.current.page ?? DEFAULT_PAGE)
    void Pictures.LoadNextImage().catch(() => index)
    Publish('Picture:LoadNew')
  } catch (err) {
    Publish('Loading:Error', err)
  }
}
