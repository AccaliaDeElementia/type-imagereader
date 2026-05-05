'use sanity'

import { Pictures } from './index.js'
import { CloneNode, isHTMLElement } from '../utils.js'

export type PageSelector = () => number
export function MakePaginatorItem(label: string, selector: PageSelector): HTMLElement | undefined {
  const pageItem = document.querySelector<HTMLTemplateElement>('#PaginatorItem')
  const item = CloneNode(pageItem, isHTMLElement)
  item?.querySelector('span')?.replaceChildren(document.createTextNode(label))
  item?.addEventListener('click', (e: Event) => {
    Pictures.SelectPage(selector())
    e.preventDefault()
  })
  return item
}
