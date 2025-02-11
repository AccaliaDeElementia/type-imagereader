'use sanity'

import { Net } from './net'
import { Publish, Subscribe } from './pubsub'
import { Loading } from './loading'
import { Navigation } from './navigation'

export enum NavigateTo {
  First,
  PreviousUnread,
  Previous,
  Next,
  NextUnread,
  Last
}

export interface Picture {
  path: string
  name: string
  seen: boolean
  index?: number
  page?: number
  element?: HTMLElement
}

export interface DataWithPictures {
  pictures?: Picture[]
  modCount?: number
  cover?: string
  noMenu?: boolean
}

export type PageSelector = () => number

export class Pictures {
  protected static pictures: Picture[]
  protected static current: Picture | null
  public static modCount = -1
  protected static mainImage: HTMLImageElement | null
  protected static imageCard: Element | null
  protected static pageSize = 32
  protected static nextLoader: Promise<void> = Promise.resolve()
  protected static nextPending = true

  protected static initialScale = -1

  public static Init (): void {
    this.pictures = []
    this.current = null
    this.nextLoader = Promise.resolve()
    this.nextPending = true

    this.ResetMarkup()

    this.mainImage?.addEventListener('load', () => { Publish('Loading:Hide') })
    this.mainImage?.addEventListener('error', () => {
      const src = this.mainImage?.getAttribute('src')
      if (src != null && src !== '') {
        Publish('Loading:Error', `Main Image Failed to Load: ${this.current?.name}`)
      }
    })

    Subscribe('Navigate:Data', (data: DataWithPictures) => { this.LoadData(data) })
    this.InitActions()
    this.InitMouse()
    this.InitUnreadSelectorSlider()
  }

  protected static ResetMarkup (): void {
    this.mainImage = document.querySelector<HTMLImageElement>('#bigImage img')
    this.imageCard = document.querySelector<HTMLTemplateElement>('#ImageCard')
      ?.content.firstElementChild ?? null
    for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
      existing.parentElement?.removeChild(existing)
    }
    for (const bar of ['top', 'bottom']) {
      for (const position of ['left', 'center', 'right']) {
        document.querySelector(`.statusBar.${bar} .${position}`)
          ?.replaceChildren('')
      }
    }
    this.mainImage?.setAttribute('src', '')
  }

  public static InitActions (): void {
    const doIfNoMenu = (action: string) => (() => {
      if (!Navigation.IsMenuActive) {
        Publish(`Action:Execute:${action}`)
      } else if (this.pictures.length > 0) {
        Publish('Action:Execute:HideMenu')
      }
    })
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
      this.ChangePicture(this.GetPicture(direction))
    }

    Subscribe('Action:Execute:Previous', () => {
      const actualEvent = this.ShowUnreadOnly ? 'PreviousUnseen' : 'PreviousImage'
      Publish(`Action:Execute:${actualEvent}`)
    })
    Subscribe('Action:Execute:Next', () => {
      const actualEvent = this.ShowUnreadOnly ? 'NextUnseen' : 'NextImage'
      Publish(`Action:Execute:${actualEvent}`)
    })
    Subscribe('Action:Execute:First', () => { changeTo(NavigateTo.First) })
    Subscribe('Action:Execute:PreviousImage', () => { changeTo(NavigateTo.Previous) })
    Subscribe('Action:Execute:PreviousUnseen', () => { changeTo(NavigateTo.PreviousUnread) })
    Subscribe('Action:Execute:NextImage', () => { changeTo(NavigateTo.Next) })
    Subscribe('Action:Execute:NextUnseen', () => { changeTo(NavigateTo.NextUnread) })
    Subscribe('Action:Execute:Last', () => { changeTo(NavigateTo.Last) })

    Subscribe('Action:Execute:ViewFullSize', () =>
      window.open(`/images/full${this.current?.path}`))
    Subscribe('Action:Execute:Bookmark', () => { Publish('Bookmarks:Add', this.current?.path) })
    Subscribe('Action:Gamepad:B', () => { Publish('Bookmarks:Add', this.current?.path) })

    Subscribe('Pictures:SelectPage', () => { this.LoadCurrentPageImages() })
  }

  protected static InitMouse (): void {
    this.initialScale = window.visualViewport != null ? window.visualViewport.scale : -1
    this.mainImage?.parentElement?.addEventListener('click', (evt) => {
      if (window.visualViewport != null && this.initialScale < window.visualViewport.scale) {
        Publish('Ignored Mouse Click', evt)
        return
      }
      const target = this.mainImage?.parentElement?.getBoundingClientRect() ?? { left: 0, width: 0 }
      if (target.width === 0) {
        Publish('Ignored Mouse Click', evt)
        return
      }
      const x = evt.clientX - target.left
      if (x < target.width / 3) {
        Publish('Action:Execute:Previous')
      } else if (x > target.width * 2 / 3) {
        Publish('Action:Execute:Next')
      } else {
        Publish('Action:Execute:ShowMenu')
      }
    })
  }

  public static get CurrentPage (): number {
    let i = -1
    if (document.querySelector('.pagination .page-item.active') !== null) {
      for (const elem of document.querySelectorAll('.pagination .page-item')) {
        i++
        if (elem.classList.contains('active')) break
      }
    }
    return i
  }

  public static SelectPage (index: number): void {
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
  }

  public static LoadCurrentPageImages (): void {
    for (const card of document.querySelectorAll<HTMLElement>('#tabImages .page:not(.hidden) .card')) {
      const style = card.getAttribute('data-backgroundImage')
      if (style != null) {
        card.style.backgroundImage = style
      }
    }
  }

  public static MakePictureCard (picture: Picture): HTMLElement {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: clone but typesafe?
    const card = this.imageCard?.cloneNode(true) as HTMLElement
    picture.element = card
    card.setAttribute('data-backgroundImage', `url("/images/preview${picture.path}-image.webp")`)
    if (picture.seen) {
      card.classList.add('seen')
    }
    card.querySelector('h5')?.replaceChildren(picture.name)
    card.addEventListener('click', () => {
      Pictures.ChangePicture(picture)
      Publish('Menu:Hide')
    })
    return card
  }

  public static MakePicturesPage (pageNum: number, pictures: Picture[]): HTMLElement {
    const page = document.createElement('div')
    page.classList.add('page')
    for (const picture of pictures) {
      const card = this.MakePictureCard(picture)
      picture.page = pageNum
      page.appendChild(card)
    }
    return page
  }

  public static MakePaginatorItem (label: string, selector: PageSelector): HTMLElement {
    const pageItem = document.querySelector<HTMLTemplateElement>('#PaginatorItem')?.content
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: clone but typesafe?
    const item = (pageItem?.cloneNode(true) as HTMLElement | undefined)?.firstElementChild as HTMLElement
    item.querySelector('span')?.replaceChildren(document.createTextNode(label))
    item.addEventListener('click', (e: Event) => {
      this.SelectPage(selector())
      e.preventDefault()
    })
    return item
  }

  public static MakePaginator (pageCount: number): HTMLElement | null {
    if (pageCount < 2) return null
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: clone but typesafe?
    const paginator = (document.querySelector<HTMLTemplateElement>('#Paginator')
      ?.content.cloneNode(true) as HTMLElement | undefined)?.firstElementChild as HTMLElement
    const domItems = paginator.querySelector('.pagination')
    domItems?.appendChild(this.MakePaginatorItem('«', () => Math.max(this.CurrentPage - 1, 1)))
    for (let i = 1; i <= pageCount; i++) {
      domItems?.appendChild(this.MakePaginatorItem(`${i}`, () => i))
    }
    domItems?.appendChild(this.MakePaginatorItem('»', () => Math.min(this.CurrentPage + 1, pageCount)))
    return paginator
  }

  public static MakeTab (): void {
    const pageCount = Math.ceil(this.pictures.length / this.pageSize)
    const tab = document.querySelector<HTMLElement>('#tabImages')
    const pages: HTMLElement[] = Array.from({ length: pageCount })
      .map((_, i) =>
        this.MakePicturesPage(i + 1, this.pictures.slice(i * this.pageSize, (i + 1) * this.pageSize))
      )
    const pagninator = this.MakePaginator(pageCount)
    if (pagninator != null) {
      tab?.appendChild(pagninator)
    }
    pages.forEach(page => tab?.appendChild(page))
  }

  public static async LoadImage (): Promise<void> {
    if (this.current == null) return
    if (this.nextPending) {
      Publish('Loading:Show')
    }
    try {
      this.current.seen = true
      this.current.element?.classList.add('seen')
      const newModCount = await Net.PostJSON<number | undefined>('/api/navigate/latest', { path: this.current.path, modCount: this.modCount })
      if (newModCount === undefined || newModCount < 0) {
        Publish('Navigate:Reload')
        return
      }
      this.modCount = newModCount
      const makeURI = (img: Picture): string => '/images/scaled/' + this.mainImage?.width + '/' + this.mainImage?.height + img.path + '-image.webp'
      await this.nextLoader
      // this.mainImage?.setAttribute('src', '/images/full' + this.current.path)
      this.mainImage?.setAttribute('src', makeURI(this.current))
      const index = this.current.index ?? 0
      const displayTotal = this.pictures.length.toLocaleString()
      const displayIndex = (index + 1).toLocaleString()
      const displayPercent = (Math.floor(1000 * (index + 1) / this.pictures.length) / 10).toLocaleString()
      document.querySelector('.statusBar.bottom .center')
        ?.replaceChildren(document.createTextNode(this.current.name))
      document.querySelector('.statusBar.bottom .left')
        ?.replaceChildren(document.createTextNode(`(${displayIndex}/${displayTotal})`))
      document.querySelector('.statusBar.bottom .right')
        ?.replaceChildren(document.createTextNode(`(${displayPercent}%)`))
      this.SelectPage(this.current.page ?? 1)
      const next = this.GetPicture(this.ShowUnreadOnly ? NavigateTo.NextUnread : NavigateTo.Next)
      if (next == null) {
        this.nextPending = false
        this.nextLoader = Promise.resolve()
      } else {
        this.nextPending = true
        this.nextLoader = fetch(makeURI(next)).then(() => {
          this.nextPending = false
        }, () => {
          this.nextPending = false
        })
      }
      Publish('Picture:LoadNew')
    } catch (err) {
      Publish('Loading:Error', err)
    }
  }

  public static LoadData (data: DataWithPictures): void {
    this.ResetMarkup()

    const fistPic = data.pictures?.slice(0,1)[0]
    if (data.pictures == null || fistPic === undefined) {
      this.mainImage?.classList.add('hidden')
      Publish('Menu:Show')
      document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.add('hidden')
      return
    }
    this.mainImage?.classList.remove('hidden')
    document.querySelector('a[href="#tabImages"]')?.parentElement?.classList.remove('hidden')

    this.pictures = data.pictures
    this.modCount = data.modCount ?? -1
    this.pictures.forEach((pic, i) => {
      pic.index = i
    })

    const selected = this.pictures.find(picture => picture.path === data.cover)
    if (selected !== undefined) {
      this.current = selected
    } else {
      this.current = fistPic
    }
    this.MakeTab()
    Publish('Tab:Select', 'Images')

    if (this.pictures.every(img => img.seen) && data.noMenu == null) {
      Publish('Menu:Show')
    } else {
      Publish('Menu:Hide')
    }

    this.LoadImage().catch(() => null)
  }

  public static GetPicture (navi: NavigateTo): Picture | undefined {
    let index = -1
    let idx: number | undefined = undefined
    const current = this.current?.index
    if (current === undefined) {
      return undefined
    }
    const unreads = [
      ...this.pictures.filter(image => !image.seen && image.index !== undefined && image.index > current),
      ...this.pictures.filter(image => !image.seen && image.index !== undefined && image.index < current)
    ]
    switch (navi) {
      case NavigateTo.First:
        index = this.pictures.length > 0 ? 0 : -1
        break
      case NavigateTo.PreviousUnread:
        idx = unreads.pop()?.index
        index = idx ?? -1
        break
      case NavigateTo.Previous:
        index = this.pictures.length > 0 && current !== 0 ? current - 1 : -1
        break
      case NavigateTo.Next:
        index = this.pictures.length > 0 && current < this.pictures.length ? current + 1 : -1
        break
      case NavigateTo.NextUnread:
        idx = unreads.shift()?.index
        index = idx ?? -1
        break
      case NavigateTo.Last:
        index = this.pictures.length > 0 ? this.pictures.length - 1 : -1
    }
    return this.pictures[index]
  }

  public static ChangePicture (pic: Picture | undefined): void {
    if (Loading.IsLoading) {
      return
    }
    if (pic != null) {
      this.current = pic
      this.LoadImage().catch(() => null)
      Publish('Menu:Hide')
    } else {
      Publish('Loading:Error', 'Change Picture called with No Picture to change to')
    }
  }

  public static get ShowUnreadOnly (): boolean {
    return window.localStorage.ShowUnseenOnly === 'true'
  }

  protected static set ShowUnreadOnly (value: boolean) {
    window.localStorage.ShowUnseenOnly = `${value}`
  }

  public static UpdateUnreadSelectorSlider (): void {
    const element = document.querySelector('.selectUnreadAll > div')
    if (this.ShowUnreadOnly) {
      element?.classList.add('unread')
      element?.classList.remove('all')
    } else {
      element?.classList.remove('unread')
      element?.classList.add('all')
    }
  }

  public static InitUnreadSelectorSlider (): void {
    this.UpdateUnreadSelectorSlider()

    document.querySelector('.selectUnreadAll')?.addEventListener('click', evt => {
      this.ShowUnreadOnly = !this.ShowUnreadOnly
      this.UpdateUnreadSelectorSlider()
      evt.preventDefault()
    })
  }
}
