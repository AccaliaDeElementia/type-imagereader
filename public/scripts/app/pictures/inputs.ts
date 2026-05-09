'use sanity'

import { hasValue, hasValues, ZERO_LENGTH } from '#utils/helpers.js'
import { isMenuActive as _isMenuActive } from '../navigation.js'
import { UNINITIALIZED_SCALE, Pictures } from './state.js'
import { changePicture as _changePicture, getPicture as _getPicture, NavigateTo } from './viewer.js'
import { loadCurrentPageImages as _loadCurrentPageImages } from './grid.js'
import { getShowUnreadOnly as _getShowUnreadOnly } from './unreadFilter.js'
import { publish, subscribe } from '../pubsub.js'

export const Imports = {
  getShowUnreadOnly: _getShowUnreadOnly,
  loadCurrentPageImages: _loadCurrentPageImages,
  changePicture: _changePicture,
  getPicture: _getPicture,
  isMenuActive: _isMenuActive,
}

const LEFT_THIRD = 0.3333333333333333
const RIGHT_THIRD = 0.6666666666666666

export function initActions(): void {
  const doIfNoMenu = (action: string) => async () => {
    if (!Imports.isMenuActive()) {
      publish(`Action:Execute:${action}`)
    } else if (hasValues(Pictures.pictures)) {
      publish('Action:Execute:HideMenu')
    }
    await Promise.resolve()
  }
  subscribe('Action:Keypress:ArrowUp', doIfNoMenu('ShowMenu'))
  subscribe('Action:Keypress:ArrowRight', doIfNoMenu('Next'))
  subscribe('Action:Keypress:ArrowLeft', doIfNoMenu('Previous'))
  subscribe('Action:Gamepad:Right', doIfNoMenu('Next'))
  subscribe('Action:Gamepad:LRight', doIfNoMenu('NextUnseen'))
  subscribe('Action:Gamepad:RRight', doIfNoMenu('NextImage'))
  subscribe('Action:Gamepad:Left', doIfNoMenu('Previous'))
  subscribe('Action:Gamepad:LLeft', doIfNoMenu('PreviousUnseen'))
  subscribe('Action:Gamepad:RLeft', doIfNoMenu('PreviousImage'))
  subscribe('Action:Keypress:ArrowDown', doIfNoMenu('ShowMenu'))

  const changeTo = async (direction: NavigateTo): Promise<void> => {
    await Imports.changePicture(Imports.getPicture(direction))
  }

  subscribe('Action:Execute:Previous', async () => {
    const actualEvent = Imports.getShowUnreadOnly() ? 'PreviousUnseen' : 'PreviousImage'
    publish(`Action:Execute:${actualEvent}`)
    await Promise.resolve()
  })
  subscribe('Action:Execute:Next', async () => {
    const actualEvent = Imports.getShowUnreadOnly() ? 'NextUnseen' : 'NextImage'
    publish(`Action:Execute:${actualEvent}`)
    await Promise.resolve()
  })
  subscribe('Action:Execute:First', async () => {
    await changeTo(NavigateTo.First)
  })
  subscribe('Action:Execute:PreviousImage', async () => {
    await changeTo(NavigateTo.Previous)
  })
  subscribe('Action:Execute:PreviousUnseen', async () => {
    await changeTo(NavigateTo.PreviousUnread)
  })
  subscribe('Action:Execute:NextImage', async () => {
    await changeTo(NavigateTo.Next)
  })
  subscribe('Action:Execute:NextUnseen', async () => {
    await changeTo(NavigateTo.NextUnread)
  })
  subscribe('Action:Execute:Last', async () => {
    await changeTo(NavigateTo.Last)
  })
  subscribe('Action:Execute:ViewFullSize', async () => {
    if (Pictures.current !== null) {
      window.open(`/images/full${Pictures.current.path}`)
    }
    await Promise.resolve()
  })
  const addBookmark = async (): Promise<void> => {
    if (Pictures.current !== null) {
      publish('Bookmarks:Add', Pictures.current.path)
    }
    await Promise.resolve()
  }
  subscribe('Action:Execute:Bookmark', addBookmark)
  subscribe('Action:Gamepad:B', addBookmark)
  subscribe('Pictures:selectPage', async () => {
    Imports.loadCurrentPageImages()
    await Promise.resolve()
  })
}

export function initMouse(): void {
  Pictures.initialScale = hasValue(window.visualViewport) ? window.visualViewport.scale : UNINITIALIZED_SCALE
  Pictures.mainImage?.parentElement?.addEventListener('click', (evt) => {
    if (hasValue(window.visualViewport) && Pictures.initialScale < window.visualViewport.scale) {
      publish('Ignored Mouse Click', evt)
      return
    }
    const target = Pictures.mainImage?.parentElement?.getBoundingClientRect() ?? {
      left: ZERO_LENGTH,
      width: ZERO_LENGTH,
    }
    if (target.width === ZERO_LENGTH) {
      publish('Ignored Mouse Click', evt)
      return
    }
    const x = evt.clientX - target.left
    if (x < target.width * LEFT_THIRD) {
      publish('Action:Execute:Previous')
    } else if (x > target.width * RIGHT_THIRD) {
      publish('Action:Execute:Next')
    } else {
      publish('Action:Execute:ShowMenu')
    }
  })
}
