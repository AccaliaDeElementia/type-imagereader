'use sanity'

import { Pictures } from './index.js'

const INDEX_TO_PAGE_OFFSET = 1

export function MakeTab(): void {
  const pageCount = Math.ceil(Pictures.pictures.length / Pictures.pageSize)
  const tab = document.querySelector<HTMLElement>('#tabImages')
  const pages: HTMLElement[] = Array.from({ length: pageCount }).map((_, i) => {
    const offsetPage = i + INDEX_TO_PAGE_OFFSET
    return Pictures.MakePicturesPage(
      offsetPage,
      Pictures.pictures.slice(i * Pictures.pageSize, offsetPage * Pictures.pageSize),
    )
  })
  const pagninator = Pictures.MakePaginator(pageCount)
  if (pagninator !== null) {
    tab?.appendChild(pagninator)
  }
  pages.forEach((page) => {
    tab?.appendChild(page)
  })
}
