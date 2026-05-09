'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from './index.js'
import { hasValues } from '#utils/helpers.js'
import { publish } from '../pubsub.js'
import { cloneNode, isHTMLElement } from '../utils.js'

const INDEX_TO_PAGE_OFFSET = 1
const MINIMUM_PAGE_COUNT = 2
const FIRST_PAGE_NUMBER = 1
const PAGE_NUMBER_INCREMENT = 1

const LAST_LINK_OFFSET = 1
const PREV_BUTTON_OFFSET = 1
const MINIMUM_INDEX = 0

type PageSelector = () => number

export function resetMarkup(): void {
  for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
    existing.parentElement?.removeChild(existing)
  }
}

function MakePictureCard(picture: Picture): HTMLElement | undefined {
  const card = cloneNode(Pictures.imageCard, isHTMLElement)
  card?.setAttribute('data-backgroundImage', `url("/images/preview${picture.path}-image.webp")`)
  if (picture.seen) {
    card?.classList.add('seen')
  }
  card?.querySelector('h5')?.replaceChildren(picture.name)
  card?.addEventListener('click', () => {
    publish('Pictures:Change', picture)
    publish('Menu:Hide')
  })
  return card
}

function MakePicturesPage(pageNum: number, pictures: Picture[]): HTMLElement {
  const page = document.createElement('div')
  page.classList.add('page')
  for (const picture of pictures) {
    const card = Internals.MakePictureCard(picture)
    if (card === undefined) continue
    picture.element = card
    picture.page = pageNum
    page.appendChild(card)
  }
  return page
}

function MakePaginatorItem(label: string, selector: PageSelector): HTMLElement | undefined {
  const pageItem = document.querySelector<HTMLTemplateElement>('#PaginatorItem')
  const item = cloneNode(pageItem, isHTMLElement)
  item?.querySelector('span')?.replaceChildren(document.createTextNode(label))
  item?.addEventListener('click', (e: Event) => {
    Internals.selectPage(selector())
    e.preventDefault()
  })
  return item
}

function MakePaginator(pageCount: number): HTMLElement | null {
  if (pageCount < MINIMUM_PAGE_COUNT) return null
  const paginator = cloneNode(document.querySelector<HTMLTemplateElement>('#Paginator'), isHTMLElement)
  if (paginator === undefined) return null
  const domItems = paginator.querySelector('.pagination')
  const firstItem = Internals.MakePaginatorItem('«', () =>
    Math.max(Internals.GetCurrentPage() - PAGE_NUMBER_INCREMENT, FIRST_PAGE_NUMBER),
  )
  if (firstItem !== undefined) domItems?.appendChild(firstItem)
  for (let i = FIRST_PAGE_NUMBER; i <= pageCount; i += PAGE_NUMBER_INCREMENT) {
    const item = Internals.MakePaginatorItem(`${i}`, () => i)
    if (item !== undefined) domItems?.appendChild(item)
  }
  const lastItem = Internals.MakePaginatorItem('»', () =>
    Math.min(Internals.GetCurrentPage() + PAGE_NUMBER_INCREMENT, pageCount),
  )
  if (lastItem !== undefined) domItems?.appendChild(lastItem)
  return paginator
}

export function makeTab(): void {
  const pageCount = Math.ceil(Pictures.pictures.length / Pictures.pageSize)
  const tab = document.querySelector<HTMLElement>('#tabImages')
  const pages: HTMLElement[] = Array.from({ length: pageCount }).map((_, i) => {
    const offsetPage = i + INDEX_TO_PAGE_OFFSET
    return Internals.MakePicturesPage(
      offsetPage,
      Pictures.pictures.slice(i * Pictures.pageSize, offsetPage * Pictures.pageSize),
    )
  })
  const pagninator = Internals.MakePaginator(pageCount)
  if (pagninator !== null) {
    tab?.appendChild(pagninator)
  }
  pages.forEach((page) => {
    tab?.appendChild(page)
  })
}

function GetCurrentPage(): number {
  const items = document.querySelectorAll('.pagination .page-item')
  return Array.from(items).findIndex((elem) => elem.classList.contains('active'))
}

export function selectPage(index: number): void {
  const links = document.querySelectorAll('.pagination .page-item')
  if (!hasValues(links)) {
    publish('Pictures:selectPage', 'Default Page Selected')
    return
  } else if (index <= MINIMUM_INDEX || index >= links.length - LAST_LINK_OFFSET) {
    publish('Loading:Error', 'Invalid Page Index Selected')
    return
  }
  links.forEach((element: Element, i: number) => {
    if (i === index) {
      element.classList.add('active')
    } else {
      element.classList.remove('active')
    }
  })
  const content = document.querySelectorAll('#tabImages .page')
  content.forEach((element: Element, i: number) => {
    if (i === index - PREV_BUTTON_OFFSET) {
      element.classList.remove('hidden')
    } else {
      element.classList.add('hidden')
    }
  })
  publish('Pictures:selectPage', `New Page ${index} Selected`)
}

export function loadCurrentPageImages(): void {
  for (const card of document.querySelectorAll<HTMLElement>('#tabImages .page:not(.hidden) .card')) {
    const style = card.getAttribute('data-backgroundImage')
    if (style !== null) {
      card.style.backgroundImage = style
    }
  }
}

export const Internals = {
  MakePictureCard,
  MakePicturesPage,
  MakePaginatorItem,
  MakePaginator,
  GetCurrentPage,
  selectPage,
}
