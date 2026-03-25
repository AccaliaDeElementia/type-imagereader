'use sanity'

import { makeURI, Pictures } from '.'
import { IndexPercentToText, IndexToText } from '#utils/helpers'
import { Net } from '../net'
import { Publish } from '../pubsub'

function setTextContent(selector: string, content: string): void {
  document.querySelector(selector)?.replaceChildren(document.createTextNode(content))
}

const MINIMUM_MOD_COUNT = 0
const DEFAULT_INDEX = 0
const DEFAULT_PAGE = 1

const isValidModCount = (n: number | undefined): n is number => n !== undefined && n >= MINIMUM_MOD_COUNT

export async function LoadImage(): Promise<void> {
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
    if (!isValidModCount(newModCount)) {
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
    Pictures.SelectPage(Pictures.current.page ?? DEFAULT_PAGE)
    void Pictures.LoadNextImage().catch(() => undefined)
    Publish('Picture:LoadNew')
  } catch (err) {
    Publish('Loading:Error', err)
  }
}
