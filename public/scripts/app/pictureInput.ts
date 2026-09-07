'use sanity'

import { hasValue, hasValues, ZERO_LENGTH } from '#utils/helpers.js'
import { isMenuActive as _isMenuActive } from './navigation.js'
import { Pictures } from './pictureState.js'
import {
  changePicture as _changePicture,
  getPicture as _getPicture,
  navigateUnreadBack as _navigateUnreadBack,
  navigateUnreadForward as _navigateUnreadForward,
  NavigateTo,
} from './pictureNavigation.js'
import { loadCurrentPageImages as _loadCurrentPageImages } from './pictureMarkup.js'
import { getShowUnreadOnly as _getShowUnreadOnly } from './unreadFilter.js'
import {
  getPanTarget as _getPanTarget,
  nudgeDown as _nudgeDown,
  nudgeUp as _nudgeUp,
  scrollBackward as _scrollBackward,
  scrollForward as _scrollForward,
  type Arrival,
  type InputDisposition,
} from './imageViewport.js'
import { publish as _publish, subscribe as _subscribe } from './pubsub.js'

const UNINITIALIZED_SCALE = -1

export const Imports = {
  getShowUnreadOnly: _getShowUnreadOnly,
  loadCurrentPageImages: _loadCurrentPageImages,
  changePicture: _changePicture,
  getPicture: _getPicture,
  navigateUnreadBack: _navigateUnreadBack,
  navigateUnreadForward: _navigateUnreadForward,
  getPanTarget: _getPanTarget,
  scrollForward: _scrollForward,
  scrollBackward: _scrollBackward,
  nudgeUp: _nudgeUp,
  nudgeDown: _nudgeDown,
  isMenuActive: _isMenuActive,
  subscribe: _subscribe,
  publish: _publish,
}

const LEFT_THIRD = 0.3333333333333333
const RIGHT_THIRD = 0.6666666666666666

const PRIMARY_BUTTON = 0
const TAP_JITTER_TOLERANCE_PX = 5
const NO_OFFSET = 0

export const Panning = {
  target: null as HTMLElement | null,
  moved: false,
  originX: NO_OFFSET,
  originY: NO_OFFSET,
  scrollLeft: NO_OFFSET,
  scrollTop: NO_OFFSET,
}

export function initActions(): void {
  const doIfNoMenu = (action: string) => async () => {
    if (!Imports.isMenuActive()) {
      Imports.publish(`Action:Execute:${action}`)
    } else if (hasValues(Pictures.pictures)) {
      Imports.publish('Action:Execute:HideMenu')
    }
    await Promise.resolve()
  }
  Imports.subscribe('Action:Keypress:ArrowUp', doIfNoMenu('ScrollUp'))
  Imports.subscribe('Action:Keypress:ArrowRight', doIfNoMenu('Next'))
  Imports.subscribe('Action:Keypress:ArrowLeft', doIfNoMenu('Previous'))
  Imports.subscribe('Action:Gamepad:Right', doIfNoMenu('Next'))
  Imports.subscribe('Action:Gamepad:LRight', doIfNoMenu('NextUnseen'))
  Imports.subscribe('Action:Gamepad:RRight', doIfNoMenu('NextImage'))
  Imports.subscribe('Action:Gamepad:Left', doIfNoMenu('Previous'))
  Imports.subscribe('Action:Gamepad:LLeft', doIfNoMenu('PreviousUnseen'))
  Imports.subscribe('Action:Gamepad:RLeft', doIfNoMenu('PreviousImage'))
  Imports.subscribe('Action:Keypress:ArrowDown', doIfNoMenu('ScrollDown'))

  const changeTo = async (direction: NavigateTo): Promise<void> => {
    const arrival: Arrival = direction === NavigateTo.Previous ? 'resumeFromEnd' : 'freshStart'
    await Imports.changePicture(Imports.getPicture(direction), arrival)
  }

  const panWithinPictureOrElse = (pan: () => InputDisposition, fallback: () => string) => async (): Promise<void> => {
    if (pan() === 'consumed') {
      await Promise.resolve()
      return
    }
    Imports.publish(`Action:Execute:${fallback()}`)
    await Promise.resolve()
  }

  const nextPicture = (): string => (Imports.getShowUnreadOnly() ? 'NextUnseen' : 'NextImage')
  const previousPicture = (): string => (Imports.getShowUnreadOnly() ? 'PreviousUnseen' : 'PreviousImage')
  const showMenu = (): string => 'ShowMenu'

  Imports.subscribe(
    'Action:Execute:Previous',
    panWithinPictureOrElse(() => Imports.scrollBackward(), previousPicture),
  )
  Imports.subscribe(
    'Action:Execute:Next',
    panWithinPictureOrElse(() => Imports.scrollForward(), nextPicture),
  )
  Imports.subscribe(
    'Action:Execute:ScrollUp',
    panWithinPictureOrElse(() => Imports.nudgeUp(), showMenu),
  )
  Imports.subscribe(
    'Action:Execute:ScrollDown',
    panWithinPictureOrElse(() => Imports.nudgeDown(), showMenu),
  )
  Imports.subscribe('Action:Execute:First', async () => {
    await changeTo(NavigateTo.First)
  })
  Imports.subscribe('Action:Execute:PreviousImage', async () => {
    await changeTo(NavigateTo.Previous)
  })
  Imports.subscribe('Action:Execute:PreviousUnseen', async () => {
    await Imports.navigateUnreadBack()
  })
  Imports.subscribe('Action:Execute:NextImage', async () => {
    await changeTo(NavigateTo.Next)
  })
  Imports.subscribe('Action:Execute:NextUnseen', async () => {
    await Imports.navigateUnreadForward()
  })
  Imports.subscribe('Action:Execute:Last', async () => {
    await changeTo(NavigateTo.Last)
  })
  Imports.subscribe('Action:Execute:ViewFullSize', async () => {
    if (Pictures.current !== null) {
      window.open(`/images/full${Pictures.current.path}`)
    }
    await Promise.resolve()
  })
  const addBookmark = async (): Promise<void> => {
    if (Pictures.current !== null) {
      Imports.publish('Bookmarks:Add', Pictures.current.path)
    }
    await Promise.resolve()
  }
  Imports.subscribe('Action:Execute:Bookmark', addBookmark)
  Imports.subscribe('Action:Gamepad:South', addBookmark)
  Imports.subscribe('Pictures:selectPage', async () => {
    Imports.loadCurrentPageImages()
    await Promise.resolve()
  })
}

// The gutter scrolls natively, so a press there is already handled.
function isInScrollbarGutter(evt: MouseEvent, target: HTMLElement): boolean {
  const bounds = target.getBoundingClientRect()
  return evt.clientX - bounds.left > target.clientWidth || evt.clientY - bounds.top > target.clientHeight
}

function suppressNativeImageDrag(evt: MouseEvent): void {
  evt.preventDefault()
}

function startPan(evt: MouseEvent): void {
  if (evt.button !== PRIMARY_BUTTON) return
  Panning.moved = false
  const target = Imports.getPanTarget()
  if (target === null) return
  if (isInScrollbarGutter(evt, target)) return
  Panning.target = target
  Panning.originX = evt.clientX
  Panning.originY = evt.clientY
  Panning.scrollLeft = target.scrollLeft
  Panning.scrollTop = target.scrollTop
  target.classList.add('panning')
  suppressNativeImageDrag(evt)
}

function updatePan(evt: MouseEvent): void {
  const { target } = Panning
  if (target === null) return
  const deltaX = evt.clientX - Panning.originX
  const deltaY = evt.clientY - Panning.originY
  if (Math.abs(deltaX) > TAP_JITTER_TOLERANCE_PX || Math.abs(deltaY) > TAP_JITTER_TOLERANCE_PX) {
    Panning.moved = true
  }
  target.scrollLeft = Panning.scrollLeft - deltaX
  target.scrollTop = Panning.scrollTop - deltaY
}

function endPan(): void {
  Panning.target?.classList.remove('panning')
  Panning.target = null
}

export function initMouse(): void {
  const initialScale = hasValue(window.visualViewport) ? window.visualViewport.scale : UNINITIALIZED_SCALE
  Pictures.mainImage?.parentElement?.addEventListener('mousedown', startPan)
  document.addEventListener('mousemove', updatePan)
  document.addEventListener('mouseup', endPan)
  Pictures.mainImage?.parentElement?.addEventListener('click', (evt) => {
    if (Panning.moved) {
      Panning.moved = false
      Imports.publish('Ignored Mouse Click', evt)
      return
    }
    if (hasValue(window.visualViewport) && initialScale < window.visualViewport.scale) {
      Imports.publish('Ignored Mouse Click', evt)
      return
    }
    const target = Pictures.mainImage?.parentElement?.getBoundingClientRect() ?? {
      left: ZERO_LENGTH,
      width: ZERO_LENGTH,
    }
    if (target.width === ZERO_LENGTH) {
      Imports.publish('Ignored Mouse Click', evt)
      return
    }
    const x = evt.clientX - target.left
    if (x < target.width * LEFT_THIRD) {
      Imports.publish('Action:Execute:Previous')
    } else if (x > target.width * RIGHT_THIRD) {
      Imports.publish('Action:Execute:Next')
    } else {
      Imports.publish('Action:Execute:ShowMenu')
    }
  })
}
