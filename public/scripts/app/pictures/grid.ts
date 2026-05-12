'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from './state.js'
import { hasValues } from '#utils/helpers.js'
import { publish as _publish } from '../pubsub.js'
import { cloneNode } from '../utils.js'
import { isHTMLElement } from '#contracts/markup.js'

export const Imports = {
  publish: _publish,
}

export const Grid = {
  imageCard: null as HTMLTemplateElement | null,
}

export const PICTURES_PER_PAGE = 32

const INDEX_TO_PAGE_OFFSET = 1
const MINIMUM_PAGE_COUNT = 2
const FIRST_PAGE_NUMBER = 1
const PAGE_NUMBER_INCREMENT = 1

const LAST_LINK_OFFSET = 1
const PREV_BUTTON_OFFSET = 1
const MINIMUM_INDEX = 0

type PageSelector = () => number

export function resetMarkup(): void {
  Grid.imageCard = document.querySelector<HTMLTemplateElement>('#ImageCard')
  for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
    existing.parentElement?.removeChild(existing)
  }
}

function makePictureCard(picture: Picture): HTMLElement | undefined {
  const card = cloneNode(Grid.imageCard, isHTMLElement)
  card?.setAttribute('data-backgroundImage', `url("/images/preview${picture.path}-image.webp")`)
  if (picture.seen) {
    card?.classList.add('seen')
  }
  card?.querySelector('h5')?.replaceChildren(picture.name)
  card?.addEventListener('click', () => {
    Imports.publish('Pictures:Change', picture)
    Imports.publish('Menu:Hide')
  })
  return card
}

function makePicturesPage(pageNum: number, pictures: Picture[]): HTMLElement {
  const page = document.createElement('div')
  page.classList.add('page')
  for (const picture of pictures) {
    const card = Internals.makePictureCard(picture)
    if (card === undefined) continue
    picture.element = card
    picture.page = pageNum
    page.appendChild(card)
  }
  return page
}

function makePaginatorItem(label: string, selector: PageSelector): HTMLElement | undefined {
  const pageItem = document.querySelector<HTMLTemplateElement>('#PaginatorItem')
  const item = cloneNode(pageItem, isHTMLElement)
  item?.querySelector('span')?.replaceChildren(document.createTextNode(label))
  item?.addEventListener('click', (e: Event) => {
    Internals.selectPage(selector())
    e.preventDefault()
  })
  return item
}

function makePaginator(pageCount: number): HTMLElement | null {
  if (pageCount < MINIMUM_PAGE_COUNT) return null
  const paginator = cloneNode(document.querySelector<HTMLTemplateElement>('#Paginator'), isHTMLElement)
  if (paginator === undefined) return null
  const domItems = paginator.querySelector('.pagination')
  const firstItem = Internals.makePaginatorItem('«', () =>
    Math.max(Internals.getCurrentPage() - PAGE_NUMBER_INCREMENT, FIRST_PAGE_NUMBER),
  )
  if (firstItem !== undefined) domItems?.appendChild(firstItem)
  for (let i = FIRST_PAGE_NUMBER; i <= pageCount; i += PAGE_NUMBER_INCREMENT) {
    const item = Internals.makePaginatorItem(`${i}`, () => i)
    if (item !== undefined) domItems?.appendChild(item)
  }
  const lastItem = Internals.makePaginatorItem('»', () =>
    Math.min(Internals.getCurrentPage() + PAGE_NUMBER_INCREMENT, pageCount),
  )
  if (lastItem !== undefined) domItems?.appendChild(lastItem)
  return paginator
}

export function makeTab(): void {
  const pageCount = Math.ceil(Pictures.pictures.length / PICTURES_PER_PAGE)
  const tab = document.querySelector<HTMLElement>('#tabImages')
  const pages: HTMLElement[] = Array.from({ length: pageCount }).map((_, i) => {
    const offsetPage = i + INDEX_TO_PAGE_OFFSET
    return Internals.makePicturesPage(
      offsetPage,
      Pictures.pictures.slice(i * PICTURES_PER_PAGE, offsetPage * PICTURES_PER_PAGE),
    )
  })
  const pagninator = Internals.makePaginator(pageCount)
  if (pagninator !== null) {
    tab?.appendChild(pagninator)
  }
  pages.forEach((page) => {
    tab?.appendChild(page)
  })
}

function getCurrentPage(): number {
  const items = document.querySelectorAll('.pagination .page-item')
  return Array.from(items).findIndex((elem) => elem.classList.contains('active'))
}

export function selectPage(index: number): void {
  const links = document.querySelectorAll('.pagination .page-item')
  if (!hasValues(links)) {
    Imports.publish('Pictures:selectPage', 'Default Page Selected')
    return
  } else if (index <= MINIMUM_INDEX || index >= links.length - LAST_LINK_OFFSET) {
    Imports.publish('Loading:Error', 'Invalid Page Index Selected')
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
  Imports.publish('Pictures:selectPage', `New Page ${index} Selected`)
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
  makePictureCard,
  makePicturesPage,
  makePaginatorItem,
  makePaginator,
  getCurrentPage,
  selectPage,
}
