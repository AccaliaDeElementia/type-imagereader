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

  // Only a step back to the previous picture resumes it at its far corner; the
  // jumps to either end of the folder are fresh starts, not a continuation.
  const changeTo = async (direction: NavigateTo): Promise<void> => {
    const arrival: Arrival = direction === NavigateTo.Previous ? 'resumeFromEnd' : 'freshStart'
    await Imports.changePicture(Imports.getPicture(direction), arrival)
  }

  // Previous and Next are the ambiguous inputs — arrows, taps and the gamepad
  // d-pad. While a picture is larger than the viewport they mean "show me the
  // rest of this one", and only once it is exhausted do they mean "show me
  // another". The explicit PreviousImage/NextImage actions stay literal, so the
  // menu buttons remain the way out of a long page.
  Imports.subscribe('Action:Execute:Previous', async () => {
    if (Imports.scrollBackward()) {
      await Promise.resolve()
      return
    }
    const actualEvent = Imports.getShowUnreadOnly() ? 'PreviousUnseen' : 'PreviousImage'
    Imports.publish(`Action:Execute:${actualEvent}`)
    await Promise.resolve()
  })
  Imports.subscribe('Action:Execute:Next', async () => {
    if (Imports.scrollForward()) {
      await Promise.resolve()
      return
    }
    const actualEvent = Imports.getShowUnreadOnly() ? 'NextUnseen' : 'NextImage'
    Imports.publish(`Action:Execute:${actualEvent}`)
    await Promise.resolve()
  })
  // Up and Down fine-tune the vertical position of an oversized picture, and
  // only summon the menu once the picture has no slack left in that direction.
  Imports.subscribe('Action:Execute:ScrollUp', async () => {
    if (Imports.nudgeUp()) {
      await Promise.resolve()
      return
    }
    Imports.publish('Action:Execute:ShowMenu')
    await Promise.resolve()
  })
  Imports.subscribe('Action:Execute:ScrollDown', async () => {
    if (Imports.nudgeDown()) {
      await Promise.resolve()
      return
    }
    Imports.publish('Action:Execute:ShowMenu')
    await Promise.resolve()
  })
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

function startPan(evt: MouseEvent): void {
  if (evt.button !== PRIMARY_BUTTON) return
  Panning.moved = false
  const target = Imports.getPanTarget()
  if (target === null) return
  // A press in the scrollbar gutter is already scrolling natively; joining in
  // would move the image at double speed.
  const bounds = target.getBoundingClientRect()
  if (evt.clientX - bounds.left > target.clientWidth) return
  if (evt.clientY - bounds.top > target.clientHeight) return
  Panning.target = target
  Panning.originX = evt.clientX
  Panning.originY = evt.clientY
  Panning.scrollLeft = target.scrollLeft
  Panning.scrollTop = target.scrollTop
  target.classList.add('panning')
  // Otherwise the browser starts its own image drag and the pan turns into a
  // ghost image stuck to the cursor.
  evt.preventDefault()
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
  // Tracked on the document so a drag that leaves the image still pans, and
  // still ends, rather than sticking to the cursor.
  document.addEventListener('mousemove', updatePan)
  document.addEventListener('mouseup', endPan)
  Pictures.mainImage?.parentElement?.addEventListener('click', (evt) => {
    // A drag that ends over the image would otherwise read as a tap and turn
    // the page out from under the reader.
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
