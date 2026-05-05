'use sanity'

import { Pictures } from './index.js'
import { CloneNode, isHTMLElement } from '../utils.js'

const MINIMUM_PAGE_COUNT = 2
const FIRST_PAGE_NUMBER = 1
const PAGE_NUMBER_INCREMENT = 1

export function MakePaginator(pageCount: number): HTMLElement | null {
  if (pageCount < MINIMUM_PAGE_COUNT) return null
  const paginator = CloneNode(document.querySelector<HTMLTemplateElement>('#Paginator'), isHTMLElement)
  if (paginator === undefined) return null
  const domItems = paginator.querySelector('.pagination')
  const firstItem = Pictures.MakePaginatorItem('«', () =>
    Math.max(Pictures.GetCurrentPage() - PAGE_NUMBER_INCREMENT, FIRST_PAGE_NUMBER),
  )
  if (firstItem !== undefined) domItems?.appendChild(firstItem)
  for (let i = FIRST_PAGE_NUMBER; i <= pageCount; i += PAGE_NUMBER_INCREMENT) {
    const item = Pictures.MakePaginatorItem(`${i}`, () => i)
    if (item !== undefined) domItems?.appendChild(item)
  }
  const lastItem = Pictures.MakePaginatorItem('»', () =>
    Math.min(Pictures.GetCurrentPage() + PAGE_NUMBER_INCREMENT, pageCount),
  )
  if (lastItem !== undefined) domItems?.appendChild(lastItem)
  return paginator
}
