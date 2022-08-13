'use sanity'

import { PostJSON } from './net'
import { Publish, Subscribe } from './pubsub'
import { IsLoading } from './loading'

interface Picture {
  path: string
  name: string
  seen: boolean
  index: number
  page: number
  element: HTMLElement
}

interface DataWithPictures {
  pictures?: Picture[]
  cover: string
  noMenu?: boolean
}

let pictures: Picture[] = []
let current: Picture | undefined

const mainImage = document.querySelector('#bigImage img')
mainImage?.addEventListener('load', () => Publish('Loading:Hide'))
mainImage?.addEventListener('error', () => {
  if (mainImage?.getAttribute('src') !== '') {
    Publish('Loading:Error', `Main Image Failed to Load: ${current?.name}`)
  }
})

const setText = (selector: string, text: string) => {
  const elem = document.querySelector(selector) as HTMLElement
  if (elem) elem.innerText = text
}

const loadImage = async () => {
  if (!current) return
  Publish('Loading:Show')
  try {
    current.seen = true
    current.element.classList.add('seen')
    await PostJSON('/api/navigate/latest', { path: current.path })
    mainImage?.setAttribute('src', '/images/full' + current.path)
    const displayTotal = pictures.length.toLocaleString()
    const displayIndex = (current.index + 1).toLocaleString()
    const displayPercent = (Math.floor(1000 * (current.index + 1) / pictures.length) / 10).toLocaleString()
    setText('.statusBar.bottom .center', current.name)
    setText('.statusBar.bottom .left', `(${displayIndex}/${displayTotal})`)
    setText('.statusBar.bottom .right', `(${displayPercent}%)`)
    selectPage(current.page)
  } catch (err) {
    Publish('Loading:Error', err)
  }
}

const imageCard: HTMLElement = (document.querySelector('#ImageCard') as HTMLTemplateElement)?.content.firstElementChild as HTMLElement
const makeCard = (picture: Picture): HTMLElement => {
  const card = imageCard.cloneNode(true) as HTMLElement
  picture.element = card
  card.style.backgroundImage = `url("/images/preview${picture.path}")`
  if (picture.seen) {
    card.classList.add('seen')
  }
  const title = card.querySelector('h5')
  if (title) title.innerText = picture.name
  card.addEventListener('click', () => {
    current = picture
    loadImage()
    Publish('Menu:Hide')
  })
  return card
}

interface PageSelector {
  (): number
}

const currentPage = (): number => {
  let i = 0
  for (const elem of document.querySelectorAll('.pagination .page-item')) {
    if (elem.classList.contains('active')) break
    i++
  }
  return i
}

const selectPage = (index: number) => {
  const links = document.querySelectorAll('.pagination .page-item')
  if (links.length < 1) return
  links.forEach((element: Element, i: number) => {
    if (i !== index) {
      element.classList.remove('active')
    } else {
      element.classList.add('active')
    }
  })
  const content = document.querySelectorAll('#tabImages .page')
  content.forEach((element: Element, i: number) => {
    if (i === index - 1) {
      element.classList.remove('hidden')
    } else {
      element.classList.add('hidden')
    }
  })
}

const makePage = (pageNum: number, pictures: Picture[]): HTMLElement => {
  const page = document.createElement('div')
  page.classList.add('page')
  for (const picture of pictures) {
    const card = makeCard(picture)
    picture.page = pageNum
    page.appendChild(card)
  }
  return page
}

const makeItem = (label: string, selector: PageSelector): HTMLElement => {
  const pageItem = (document.querySelector('#PaginatorItem') as HTMLTemplateElement).content
  const item = (pageItem.cloneNode(true) as HTMLElement).firstElementChild as HTMLElement
  const title = item.querySelector('span')
  if (title) title.innerText = label
  item.addEventListener('click', () => selectPage(selector()))
  return item
}

const makePaginator = (tab: Element, pageCount: number): void => {
  if (pageCount < 2) return
  const paginator = ((document.querySelector('#Paginator') as HTMLTemplateElement)
    .content.cloneNode(true) as HTMLElement).firstElementChild
  if (paginator) tab?.appendChild(paginator)
  const domItems = paginator?.querySelector('.pagination')
  domItems?.appendChild(makeItem('«', () => Math.max(+currentPage() - 1, 1)))
  for (let i = 1; i <= pageCount; i++) {
    domItems?.appendChild(makeItem('' + i, () => i))
  }
  domItems?.appendChild(makeItem('»', () => Math.min(+currentPage() + 1, pageCount)))
}

const makeTab = () => {
  const pageSize = 32
  const pageCount = Math.ceil(pictures.length / pageSize)
  const tab = document.querySelector('#tabImages') as HTMLElement
  const pages: HTMLElement[] = Array.from({ length: pageCount })
    .fill(undefined).map((_, i) =>
      makePage(i + 1, pictures.slice(i * pageSize, (i + 1) * pageSize))
    )
  makePaginator(tab, pageCount)
  pages.forEach(page => tab?.appendChild(page))
}

Subscribe('Navigate:Data', (data: DataWithPictures) => {
  for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
    existing.parentElement?.removeChild(existing)
  }

  setText('.statusBar.bottom .center', '')
  setText('.statusBar.bottom .left', '')
  setText('.statusBar.bottom .right', '')
  mainImage?.setAttribute('src', '')
  if (!data.pictures || !data.pictures.length) {
    mainImage?.classList.add('hidden')
    Publish('Menu:Show')
    document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.add('hidden')
    return
  }
  mainImage?.classList.remove('hidden')
  document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.remove('hidden')

  pictures = data.pictures
  const selected = pictures.filter(picture => picture.path === data.cover)
  console.log(data.cover, selected)
  if (selected.length) {
    current = selected[0] as Picture
  } else {
    current = pictures[0] as Picture
  }
  makeTab()
  Publish('Tab:Select', 'Images')

  if (pictures.every(img => img.seen) && !data.noMenu) {
    Publish('Menu:Show')
  } else {
    Publish('Menu:Hide')
  }

  if (current) {
    loadImage()
  }
})

const updateSlider = () => {
  const showAll = window.localStorage.ShowUnseenOnly !== 'true'
  const element = document.querySelector('.selectUnreadAll > div')
  if (showAll) {
    element?.classList.remove('unread')
    element?.classList.add('all')
  } else {
    element?.classList.add('unread')
    element?.classList.remove('all')
  }
}
updateSlider()
document.querySelector('.selectUnreadAll')?.addEventListener('click', evt => {
  window.localStorage.ShowUnseenOnly = !(window.localStorage.ShowUnseenOnly === 'true')
  updateSlider()
  evt.preventDefault()
})

interface UnseenSelector {
  (list: Picture[]): Picture | undefined
}

const selectUnseenIndex = (selector: UnseenSelector): Picture| undefined => {
  if (!current) return
  const candidates = ([
    pictures.filter(image => !image.seen && image.index > (current?.index || Number.POSITIVE_INFINITY)),
    pictures.filter(image => !image.seen && image.index < (current?.index || Number.NEGATIVE_INFINITY))
  ]).flat()
  if (candidates.length < 1) {
    return
  }
  return selector(candidates)
}

const changeImage = (predicate: boolean, newIndex: number) => {
  if (IsLoading()) {
    return
  }
  if (predicate) {
    if (newIndex >= 0 && newIndex < pictures.length) {
      current = pictures[newIndex]
      loadImage()
      Publish('Menu:Hide')
    } else {
      Publish('Loading:Error', 'Invalid Image Change Event')
    }
  } else {
    Publish('Loading:Error', 'Image Change Predicate Failed')
  }
}

Subscribe('Action:Execute:Previous', () => {
  const actualEvent = window.localStorage.ShowUnseenOnly === 'true' ? 'PreviousUnseen' : 'PreviousImage'
  Publish(`Action:Execute:${actualEvent}`)
})
Subscribe('Action:Execute:PreviousImage', () =>
  changeImage(!!current && current.index > 0, (current?.index || 0) - 1))
Subscribe('Action.Execute:PreviousUnseen', () => {
  const picture = selectUnseenIndex(l => l.pop())
  changeImage(!!picture, picture?.index || 0)
})
Subscribe('Action:Execute:Next', () => {
  const actualEvent = window.localStorage.ShowUnseenOnly === 'true' ? 'NextUnseen' : 'NextImage'
  Publish(`Action:Execute:${actualEvent}`)
})
Subscribe('Action:Execute:NextImage', () =>
  changeImage(!!current && current.index < pictures.length - 1, (current?.index || 0) + 1))
Subscribe('Action:Execute:NextUnseen', () => {
  const picture = selectUnseenIndex(l => l.shift())
  changeImage(!!picture, picture?.index || 0)
})
Subscribe('Action:Execute:ViewFullSize', () =>
  window.open(`/images/full${current?.path}`))
Subscribe('Action:Execute:Bookmark', () =>
  PostJSON('/api/bookmarks/add', { path: current?.path }).then(() =>
    Publish('Bookmarks:Load')
  ))

const menu = document.querySelector('#mainMenu')
const doIfNoMenu = (action: string) => {
  return () => {
    if (menu?.classList.contains('hidden')) {
      Publish(`Action:Execute:${action}`)
    } else if (pictures.length) {
      Publish('Action:Execute:HideMenu')
    }
  }
}
Subscribe('Action:Keypress:ArrowUp', doIfNoMenu('ShowMenu'))
Subscribe('Action:Keypress:ArrowRight', doIfNoMenu('Next'))
Subscribe('Action:Keypress:ArrowLeft', doIfNoMenu('Previous'))
Subscribe('Action:Keypress:ArrowDown', doIfNoMenu('ShowMenu'))
