'use sanity'

import { isHTMLElement, CloneNode } from './utils'
import { Net } from './net'
import { Publish, Subscribe } from './pubsub'
import { Loading } from './loading'
import { Navigation } from './navigation'
import { isListing, type Listing, type Picture } from '../../../contracts/listing'

export enum NavigateTo {
  First,
  PreviousUnread,
  Previous,
  Next,
  NextUnread,
  Last,
}

function setTextContent(selector: string, content: string): void {
  document.querySelector(selector)?.replaceChildren(document.createTextNode(content))
}

function makeURI(width: number | undefined, height: number | undefined, img: Picture): string {
  return '/images/scaled/' + width + '/' + height + img.path + '-image.webp'
}

export type PageSelector = () => number
interface PictureCache {
  size: number
  next: Picture[]
  prev: Picture[]
}
export const Pictures = {
  modCount: -1,
  nextLoader: Promise.resolve(),
  nextPending: true,
  initialScale: -1,
  pictures: ((): Picture[] => [])(),
  current: ((): Picture | null => null)(),
  mainImage: ((): HTMLImageElement | null => null)(),
  imageCard: ((): HTMLTemplateElement | null => null)(),
  pageSize: 32,
  cache: ((): PictureCache => ({
    size: 10,
    next: [],
    prev: [],
  }))(),
  Init: (): void => {
    Pictures.pictures = []
    Pictures.current = null
    Pictures.nextLoader = Promise.resolve()
    Pictures.nextPending = true
    Pictures.cache = {
      size: 10,
      next: [],
      prev: [],
    }
    Pictures.ResetMarkup()
    Subscribe('Navigate:Data', async (data) => {
      if (isListing(data)) await Pictures.LoadData(data)
    })
    Pictures.InitActions()
    Pictures.InitMouse()
    Pictures.InitUnreadSelectorSlider()
  },
  ResetMarkup: (): void => {
    Pictures.mainImage = document.querySelector<HTMLImageElement>('#bigImage img')
    Pictures.imageCard = document.querySelector<HTMLTemplateElement>('#ImageCard')
    for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
      existing.parentElement?.removeChild(existing)
    }
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
      if (src != null && src !== '') {
        Publish('Loading:Error', `Main Image Failed to Load: ${Pictures.current?.name}`)
      }
    })
  },
  InitActions: (): void => {
    const doIfNoMenu = (action: string) => async () => {
      if (!Navigation.IsMenuActive()) {
        Publish(`Action:Execute:${action}`)
      } else if (Pictures.pictures.length > 0) {
        Publish('Action:Execute:HideMenu')
      }
      await Promise.resolve()
    }
    Subscribe('Action:Keypress:ArrowUp', doIfNoMenu('ShowMenu'))
    Subscribe('Action:Keypress:ArrowRight', doIfNoMenu('Next'))
    Subscribe('Action:Keypress:ArrowLeft', doIfNoMenu('Previous'))
    Subscribe('Action:Gamepad:Right', doIfNoMenu('Next'))
    Subscribe('Action:Gamepad:LRight', doIfNoMenu('NextUnseen'))
    Subscribe('Action:Gamepad:RRight', doIfNoMenu('NextImage'))
    Subscribe('Action:GamePad:Left', doIfNoMenu('Previous'))
    Subscribe('Action:GamePad:LLeft', doIfNoMenu('PreviousUnseen'))
    Subscribe('Action:GamePad:RLeft', doIfNoMenu('PreviousImage'))
    Subscribe('Action:Keypress:ArrowDown', doIfNoMenu('ShowMenu'))

    const changeTo = async (direction: NavigateTo): Promise<void> => {
      await Pictures.ChangePicture(Pictures.GetPicture(direction))
    }

    Subscribe('Action:Execute:Previous', async () => {
      const actualEvent = Pictures.GetShowUnreadOnly() ? 'PreviousUnseen' : 'PreviousImage'
      Publish(`Action:Execute:${actualEvent}`)
      await Promise.resolve()
    })
    Subscribe('Action:Execute:Next', async () => {
      const actualEvent = Pictures.GetShowUnreadOnly() ? 'NextUnseen' : 'NextImage'
      Publish(`Action:Execute:${actualEvent}`)
      await Promise.resolve()
    })
    Subscribe('Action:Execute:First', async () => {
      await changeTo(NavigateTo.First)
    })
    Subscribe('Action:Execute:PreviousImage', async () => {
      await changeTo(NavigateTo.Previous)
    })
    Subscribe('Action:Execute:PreviousUnseen', async () => {
      await changeTo(NavigateTo.PreviousUnread)
    })
    Subscribe('Action:Execute:NextImage', async () => {
      await changeTo(NavigateTo.Next)
    })
    Subscribe('Action:Execute:NextUnseen', async () => {
      await changeTo(NavigateTo.NextUnread)
    })
    Subscribe('Action:Execute:Last', async () => {
      await changeTo(NavigateTo.Last)
    })
    Subscribe('Action:Execute:ViewFullSize', async () => {
      if (Pictures.current != null) {
        window.open(`/images/full${Pictures.current.path}`)
      }
      await Promise.resolve()
    })
    const addBookmark = async (): Promise<void> => {
      if (Pictures.current != null) {
        Publish('Bookmarks:Add', Pictures.current.path)
      }
      await Promise.resolve()
    }
    Subscribe('Action:Execute:Bookmark', addBookmark)
    Subscribe('Action:Gamepad:B', addBookmark)
    Subscribe('Pictures:SelectPage', async () => {
      Pictures.LoadCurrentPageImages()
      await Promise.resolve()
    })
  },
  InitMouse: (): void => {
    Pictures.initialScale = window.visualViewport == null ? -1 : window.visualViewport.scale
    Pictures.mainImage?.parentElement?.addEventListener('click', (evt) => {
      if (window.visualViewport != null && Pictures.initialScale < window.visualViewport.scale) {
        Publish('Ignored Mouse Click', evt)
        return
      }
      const target = Pictures.mainImage?.parentElement?.getBoundingClientRect() ?? {
        left: 0,
        width: 0,
      }
      if (target.width === 0) {
        Publish('Ignored Mouse Click', evt)
        return
      }
      const x = evt.clientX - target.left
      if (x < target.width / 3) {
        Publish('Action:Execute:Previous')
      } else if (x > (target.width * 2) / 3) {
        Publish('Action:Execute:Next')
      } else {
        Publish('Action:Execute:ShowMenu')
      }
    })
  },
  GetCurrentPage: (): number => {
    let i = -1
    if (document.querySelector('.pagination .page-item.active') !== null) {
      for (const elem of document.querySelectorAll('.pagination .page-item')) {
        i++
        if (elem.classList.contains('active')) break
      }
    }
    return i
  },
  SelectPage: (index: number): void => {
    const links = document.querySelectorAll('.pagination .page-item')
    if (links.length === 0) {
      Publish('Pictures:SelectPage', 'Default Page Selected')
      return
    } else if (index < 1 || index >= links.length - 1) {
      Publish('Loading:Error', 'Invalid Page Index Selected')
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
      if (i === index - 1) {
        element.classList.remove('hidden')
      } else {
        element.classList.add('hidden')
      }
    })
    Publish('Pictures:SelectPage', `New Page ${index} Selected`)
  },
  LoadCurrentPageImages: (): void => {
    for (const card of document.querySelectorAll<HTMLElement>('#tabImages .page:not(.hidden) .card')) {
      const style = card.getAttribute('data-backgroundImage')
      if (style != null) {
        card.style.backgroundImage = style
      }
    }
  },
  MakePictureCard: (picture: Picture): HTMLElement | undefined => {
    const card = CloneNode(Pictures.imageCard, isHTMLElement)
    picture.element = card
    card?.setAttribute('data-backgroundImage', `url("/images/preview${picture.path}-image.webp")`)
    if (picture.seen) {
      card?.classList.add('seen')
    }
    card?.querySelector('h5')?.replaceChildren(picture.name)
    card?.addEventListener('click', () => {
      void Pictures.ChangePicture(picture)
      Publish('Menu:Hide')
    })
    return card
  },
  MakePicturesPage: (pageNum: number, pictures: Picture[]): HTMLElement => {
    const page = document.createElement('div')
    page.classList.add('page')
    for (const picture of pictures) {
      const card = Pictures.MakePictureCard(picture)
      if (card == null) continue
      picture.page = pageNum
      page.appendChild(card)
    }
    return page
  },
  MakePaginatorItem: (label: string, selector: PageSelector): HTMLElement | undefined => {
    const pageItem = document.querySelector<HTMLTemplateElement>('#PaginatorItem')
    const item = CloneNode(pageItem, isHTMLElement)
    item?.querySelector('span')?.replaceChildren(document.createTextNode(label))
    item?.addEventListener('click', (e: Event) => {
      Pictures.SelectPage(selector())
      e.preventDefault()
    })
    return item
  },
  MakePaginator: (pageCount: number): HTMLElement | null => {
    if (pageCount < 2) return null
    const paginator = CloneNode(document.querySelector<HTMLTemplateElement>('#Paginator'), isHTMLElement)
    if (paginator === undefined) return null
    const domItems = paginator.querySelector('.pagination')
    const firstItem = Pictures.MakePaginatorItem('«', () => Math.max(Pictures.GetCurrentPage() - 1, 1))
    if (firstItem !== undefined) domItems?.appendChild(firstItem)
    for (let i = 1; i <= pageCount; i++) {
      const item = Pictures.MakePaginatorItem(`${i}`, () => i)
      if (item !== undefined) domItems?.appendChild(item)
    }
    const lastItem = Pictures.MakePaginatorItem('»', () => Math.min(Pictures.GetCurrentPage() + 1, pageCount))
    if (lastItem !== undefined) domItems?.appendChild(lastItem)
    return paginator
  },
  MakeTab: (): void => {
    const pageCount = Math.ceil(Pictures.pictures.length / Pictures.pageSize)
    const tab = document.querySelector<HTMLElement>('#tabImages')
    const pages: HTMLElement[] = Array.from({ length: pageCount }).map((_, i) =>
      Pictures.MakePicturesPage(i + 1, Pictures.pictures.slice(i * Pictures.pageSize, (i + 1) * Pictures.pageSize)),
    )
    const pagninator = Pictures.MakePaginator(pageCount)
    if (pagninator != null) {
      tab?.appendChild(pagninator)
    }
    pages.forEach((page) => tab?.appendChild(page))
  },
  LoadNextImage: async (): Promise<void> => {
    const next = Pictures.GetPicture(Pictures.GetShowUnreadOnly() ? NavigateTo.NextUnread : NavigateTo.Next)
    if (next == null) {
      Pictures.nextPending = false
      Pictures.nextLoader = Promise.resolve()
    } else {
      Pictures.nextPending = true
      Pictures.nextLoader = window.fetch(makeURI(Pictures.mainImage?.width, Pictures.mainImage?.height, next)).then(
        () => {
          Pictures.nextPending = false
        },
        () => {
          Pictures.nextPending = false
        },
      )
    }
    await Pictures.nextLoader
  },
  LoadImage: async (): Promise<void> => {
    if (Pictures.current == null) return
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
      if (newModCount === undefined || newModCount < 0) {
        Publish('Navigate:Reload')
        return
      }
      Pictures.modCount = newModCount
      await Pictures.nextLoader
      Pictures.mainImage?.setAttribute(
        'src',
        makeURI(Pictures.mainImage.width, Pictures.mainImage.height, Pictures.current),
      )
      const index = Pictures.current.index ?? 0
      const displayTotal = Pictures.pictures.length.toLocaleString()
      const displayIndex = (index + 1).toLocaleString()
      const displayPercent = (Math.floor((1000 * (index + 1)) / Pictures.pictures.length) / 10).toLocaleString()
      setTextContent('.statusBar.bottom .center', Pictures.current.name)
      setTextContent('.statusBar.bottom .left', `(${displayIndex}/${displayTotal})`)
      setTextContent('.statusBar.bottom .right', `(${displayPercent}%)`)
      Pictures.SelectPage(Pictures.current.page ?? 1)
      void Pictures.LoadNextImage().catch(() => 0)
      Publish('Picture:LoadNew')
    } catch (err) {
      Publish('Loading:Error', err)
    }
  },
  SetPicturesGetFirst: (data: Listing): Picture | null => {
    if (Pictures.mainImage == null) return null
    const firstPic = data.pictures?.slice(0, 1)[0]
    if (data.pictures == null || firstPic === undefined) {
      Pictures.mainImage.classList.add('hidden')
      Publish('Menu:Show')
      document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.add('hidden')
      return null
    }
    Pictures.mainImage.classList.remove('hidden')
    document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.remove('hidden')
    Pictures.pictures = data.pictures
    Pictures.modCount = data.modCount ?? -1
    Pictures.pictures.forEach((pic, i) => {
      pic.index = i
    })
    return firstPic
  },
  LoadData: async (data: Listing): Promise<void> => {
    Pictures.ResetMarkup()
    const firstPic = Pictures.SetPicturesGetFirst(data)
    if (firstPic === null) return

    const selected = Pictures.pictures.find((picture) => picture.path === data.cover)
    if (selected === undefined) {
      Pictures.current = firstPic
    } else {
      Pictures.current = selected
    }
    Pictures.MakeTab()
    Publish('Tab:Select', 'Images')
    if (Pictures.pictures.every((img) => img.seen) && (data.noMenu == null || !data.noMenu)) {
      Publish('Menu:Show')
    } else {
      Publish('Menu:Hide')
    }
    await Pictures.LoadImage().catch(() => null)
  },
  ChoosePictureIndex: (navi: NavigateTo, current: number, unreads: Picture[]): number => {
    if (Pictures.pictures.length < 1) return -1
    switch (navi) {
      case NavigateTo.First:
        return 0
      case NavigateTo.PreviousUnread:
        return unreads.pop()?.index ?? -1
      case NavigateTo.Previous:
        return current > 0 ? current - 1 : -1
      case NavigateTo.Next:
        return current < Pictures.pictures.length - 1 ? current + 1 : -1
      case NavigateTo.NextUnread:
        return unreads.shift()?.index ?? -1
      case NavigateTo.Last:
        return Pictures.pictures.length - 1
    }
  },
  GetPicture: (navi: NavigateTo): Picture | undefined => {
    const current = Pictures.current?.index
    if (current === undefined) {
      return undefined
    }
    const unreads = [
      ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index > current),
      ...Pictures.pictures.filter((image) => !image.seen && image.index !== undefined && image.index < current),
    ]
    const index = Pictures.ChoosePictureIndex(navi, current, unreads)
    return Pictures.pictures[index]
  },
  ChangePicture: async (pic: Picture | undefined): Promise<void> => {
    if (Loading.IsLoading()) {
      return
    }
    if (pic == null) {
      Publish('Loading:Error', 'Change Picture called with No Picture to change to')
    } else {
      Pictures.current = pic
      await Pictures.LoadImage().catch(() => null)
      Publish('Menu:Hide')
    }
  },
  GetShowUnreadOnly: (): boolean => window.localStorage.ShowUnseenOnly === 'true',
  SetShowUnreadOnly: (value: boolean) => {
    window.localStorage.ShowUnseenOnly = `${value}`
  },
  UpdateUnreadSelectorSlider: (): void => {
    const element = document.querySelector('.selectUnreadAll > div')
    if (Pictures.GetShowUnreadOnly()) {
      element?.classList.add('unread')
      element?.classList.remove('all')
    } else {
      element?.classList.remove('unread')
      element?.classList.add('all')
    }
  },
  InitUnreadSelectorSlider: (): void => {
    Pictures.UpdateUnreadSelectorSlider()

    document.querySelector('.selectUnreadAll')?.addEventListener('click', (evt) => {
      Pictures.SetShowUnreadOnly(!Pictures.GetShowUnreadOnly())
      Pictures.UpdateUnreadSelectorSlider()
      evt.preventDefault()
    })
  },
}
