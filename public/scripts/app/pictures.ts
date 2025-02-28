'use sanity'

import { isHTMLElement, CloneNode } from './utils'
import { Net } from './net'
import { Publish, Subscribe } from './pubsub'
import { Loading } from './loading'
import { Navigation } from './navigation'
import { PictureMarkup, type Picture, type DataWithPictures, isDataWithPictures } from './picturemarkup'

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

export const Pictures = {
  modCount: -1,
  nextLoader: Promise.resolve(),
  nextPending: true,
  initialScale: -1,
  Init: (): void => {
    PictureMarkup.pictures = []
    PictureMarkup.current = null
    Pictures.nextLoader = Promise.resolve()
    Pictures.nextPending = true
    PictureMarkup.ResetMarkup()
    PictureMarkup.Init()
    Subscribe('Navigate:Data', (data) => {
      if (isDataWithPictures(data)) Pictures.LoadData(data)
    })
    Pictures.InitActions()
    Pictures.InitMouse()
    Pictures.InitUnreadSelectorSlider()
  },
  InitActions: (): void => {
    const doIfNoMenu = (action: string) => () => {
      if (!Navigation.IsMenuActive()) {
        Publish(`Action:Execute:${action}`)
      } else if (PictureMarkup.pictures.length > 0) {
        Publish('Action:Execute:HideMenu')
      }
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

    const changeTo = (direction: NavigateTo): void => {
      Pictures.ChangePicture(Pictures.GetPicture(direction))
    }

    Subscribe('Action:Execute:Previous', () => {
      const actualEvent = Pictures.GetShowUnreadOnly() ? 'PreviousUnseen' : 'PreviousImage'
      Publish(`Action:Execute:${actualEvent}`)
    })
    Subscribe('Action:Execute:Next', () => {
      const actualEvent = Pictures.GetShowUnreadOnly() ? 'NextUnseen' : 'NextImage'
      Publish(`Action:Execute:${actualEvent}`)
    })
    Subscribe('Action:Execute:First', () => {
      changeTo(NavigateTo.First)
    })
    Subscribe('Action:Execute:PreviousImage', () => {
      changeTo(NavigateTo.Previous)
    })
    Subscribe('Action:Execute:PreviousUnseen', () => {
      changeTo(NavigateTo.PreviousUnread)
    })
    Subscribe('Action:Execute:NextImage', () => {
      changeTo(NavigateTo.Next)
    })
    Subscribe('Action:Execute:NextUnseen', () => {
      changeTo(NavigateTo.NextUnread)
    })
    Subscribe('Action:Execute:Last', () => {
      changeTo(NavigateTo.Last)
    })

    Subscribe('Action:Execute:ViewFullSize', () => window.open(`/images/full${PictureMarkup.current?.path}`))
    Subscribe('Action:Execute:Bookmark', () => {
      Publish('Bookmarks:Add', PictureMarkup.current?.path)
    })
    Subscribe('Action:Gamepad:B', () => {
      Publish('Bookmarks:Add', PictureMarkup.current?.path)
    })

    Subscribe('Pictures:SelectPage', () => {
      Pictures.LoadCurrentPageImages()
    })
  },
  InitMouse: (): void => {
    Pictures.initialScale = window.visualViewport != null ? window.visualViewport.scale : -1
    PictureMarkup.mainImage?.parentElement?.addEventListener('click', (evt) => {
      if (window.visualViewport != null && Pictures.initialScale < window.visualViewport.scale) {
        Publish('Ignored Mouse Click', evt)
        return
      }
      const target = PictureMarkup.mainImage?.parentElement?.getBoundingClientRect() ?? {
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
    const card = CloneNode(PictureMarkup.imageCard, isHTMLElement)
    picture.element = card
    card?.setAttribute('data-backgroundImage', `url("/images/preview${picture.path}-image.webp")`)
    if (picture.seen) {
      card?.classList.add('seen')
    }
    card?.querySelector('h5')?.replaceChildren(picture.name)
    card?.addEventListener('click', () => {
      Pictures.ChangePicture(picture)
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
    const pageCount = Math.ceil(PictureMarkup.pictures.length / PictureMarkup.pageSize)
    const tab = document.querySelector<HTMLElement>('#tabImages')
    const pages: HTMLElement[] = Array.from({ length: pageCount }).map((_, i) =>
      Pictures.MakePicturesPage(
        i + 1,
        PictureMarkup.pictures.slice(i * PictureMarkup.pageSize, (i + 1) * PictureMarkup.pageSize),
      ),
    )
    const pagninator = Pictures.MakePaginator(pageCount)
    if (pagninator != null) {
      tab?.appendChild(pagninator)
    }
    pages.forEach((page) => tab?.appendChild(page))
  },
  LoadNextImage: (): void => {
    const next = Pictures.GetPicture(Pictures.GetShowUnreadOnly() ? NavigateTo.NextUnread : NavigateTo.Next)
    if (next == null) {
      Pictures.nextPending = false
      Pictures.nextLoader = Promise.resolve()
    } else {
      Pictures.nextPending = true
      Pictures.nextLoader = fetch(makeURI(PictureMarkup.mainImage?.width, PictureMarkup.mainImage?.height, next)).then(
        () => {
          Pictures.nextPending = false
        },
        () => {
          Pictures.nextPending = false
        },
      )
    }
  },
  LoadImage: async (): Promise<void> => {
    if (PictureMarkup.current == null) return
    if (Pictures.nextPending) {
      Publish('Loading:Show')
    }
    try {
      PictureMarkup.current.seen = true
      PictureMarkup.current.element?.classList.add('seen')
      const newModCount = await Net.PostJSON<number | undefined>(
        '/api/navigate/latest',
        { path: PictureMarkup.current.path, modCount: Pictures.modCount },
        (o) => typeof o === 'number' || o === undefined,
      )
      if (newModCount === undefined || newModCount < 0) {
        Publish('Navigate:Reload')
        return
      }
      Pictures.modCount = newModCount
      await Pictures.nextLoader
      PictureMarkup.mainImage?.setAttribute(
        'src',
        makeURI(PictureMarkup.mainImage.width, PictureMarkup.mainImage.height, PictureMarkup.current),
      )
      const index = PictureMarkup.current.index ?? 0
      const displayTotal = PictureMarkup.pictures.length.toLocaleString()
      const displayIndex = (index + 1).toLocaleString()
      const displayPercent = (Math.floor((1000 * (index + 1)) / PictureMarkup.pictures.length) / 10).toLocaleString()
      setTextContent('.statusBar.bottom .center', PictureMarkup.current.name)
      setTextContent('.statusBar.bottom .left', `(${displayIndex}/${displayTotal})`)
      setTextContent('.statusBar.bottom .right', `(${displayPercent}%)`)
      Pictures.SelectPage(PictureMarkup.current.page ?? 1)
      Pictures.LoadNextImage()
      Publish('Picture:LoadNew')
    } catch (err) {
      Publish('Loading:Error', err)
    }
  },
  SetPicturesGetFirst: (data: DataWithPictures): Picture | null => {
    if (PictureMarkup.mainImage == null) return null
    const firstPic = data.pictures?.slice(0, 1)[0]
    if (data.pictures == null || firstPic === undefined) {
      PictureMarkup.mainImage.classList.add('hidden')
      Publish('Menu:Show')
      document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.add('hidden')
      return null
    }
    PictureMarkup.mainImage.classList.remove('hidden')
    document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.remove('hidden')
    PictureMarkup.pictures = data.pictures
    Pictures.modCount = data.modCount ?? -1
    PictureMarkup.pictures.forEach((pic, i) => {
      pic.index = i
    })
    return firstPic
  },
  LoadData: (data: DataWithPictures): void => {
    PictureMarkup.ResetMarkup()
    const firstPic = Pictures.SetPicturesGetFirst(data)
    if (firstPic === null) return

    const selected = PictureMarkup.pictures.find((picture) => picture.path === data.cover)
    if (selected !== undefined) {
      PictureMarkup.current = selected
    } else {
      PictureMarkup.current = firstPic
    }
    Pictures.MakeTab()
    Publish('Tab:Select', 'Images')
    if (PictureMarkup.pictures.every((img) => img.seen) && data.noMenu == null) {
      Publish('Menu:Show')
    } else {
      Publish('Menu:Hide')
    }
    Pictures.LoadImage().catch(() => null)
  },
  ChoosePictureIndex: (navi: NavigateTo, current: number, unreads: Picture[]): number => {
    if (PictureMarkup.pictures.length < 1) return -1
    switch (navi) {
      case NavigateTo.First:
        return 0
      case NavigateTo.PreviousUnread:
        return unreads.pop()?.index ?? -1
      case NavigateTo.Previous:
        return current !== 0 ? current - 1 : -1
      case NavigateTo.Next:
        return current < PictureMarkup.pictures.length - 1 ? current + 1 : -1
      case NavigateTo.NextUnread:
        return unreads.shift()?.index ?? -1
      case NavigateTo.Last:
        return PictureMarkup.pictures.length - 1
    }
  },
  GetPicture: (navi: NavigateTo): Picture | undefined => {
    let index = -1
    const current = PictureMarkup.current?.index
    if (current === undefined) {
      return undefined
    }
    const unreads = [
      ...PictureMarkup.pictures.filter((image) => !image.seen && image.index !== undefined && image.index > current),
      ...PictureMarkup.pictures.filter((image) => !image.seen && image.index !== undefined && image.index < current),
    ]
    index = Pictures.ChoosePictureIndex(navi, current, unreads)
    return PictureMarkup.pictures[index]
  },
  ChangePicture: (pic: Picture | undefined): void => {
    if (Loading.IsLoading()) {
      return
    }
    if (pic != null) {
      PictureMarkup.current = pic
      Pictures.LoadImage().catch(() => null)
      Publish('Menu:Hide')
    } else {
      Publish('Loading:Error', 'Change Picture called with No Picture to change to')
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
