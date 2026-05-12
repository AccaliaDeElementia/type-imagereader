'use sanity'

import { hasValue, hasValues, ZERO_LENGTH } from '#utils/helpers.js'
import { isMenuActive as _isMenuActive } from '../navigation.js'
import { Pictures } from './state.js'
import { changePicture as _changePicture, getPicture as _getPicture, NavigateTo } from './viewer.js'
import { loadCurrentPageImages as _loadCurrentPageImages } from './grid.js'
import { getShowUnreadOnly as _getShowUnreadOnly } from './unreadFilter.js'
import { publish as _publish, subscribe as _subscribe } from '../pubsub.js'

const UNINITIALIZED_SCALE = -1

export const Imports = {
  getShowUnreadOnly: _getShowUnreadOnly,
  loadCurrentPageImages: _loadCurrentPageImages,
  changePicture: _changePicture,
  getPicture: _getPicture,
  isMenuActive: _isMenuActive,
  subscribe: _subscribe,
  publish: _publish,
}

const LEFT_THIRD = 0.3333333333333333
const RIGHT_THIRD = 0.6666666666666666

export function initActions(): void {
  const doIfNoMenu = (action: string) => async () => {
    if (!Imports.isMenuActive()) {
      Imports.publish(`Action:Execute:${action}`)
    } else if (hasValues(Pictures.pictures)) {
      Imports.publish('Action:Execute:HideMenu')
    }
    await Promise.resolve()
  }
  Imports.subscribe('Action:Keypress:ArrowUp', doIfNoMenu('ShowMenu'))
  Imports.subscribe('Action:Keypress:ArrowRight', doIfNoMenu('Next'))
  Imports.subscribe('Action:Keypress:ArrowLeft', doIfNoMenu('Previous'))
  Imports.subscribe('Action:Gamepad:Right', doIfNoMenu('Next'))
  Imports.subscribe('Action:Gamepad:LRight', doIfNoMenu('NextUnseen'))
  Imports.subscribe('Action:Gamepad:RRight', doIfNoMenu('NextImage'))
  Imports.subscribe('Action:Gamepad:Left', doIfNoMenu('Previous'))
  Imports.subscribe('Action:Gamepad:LLeft', doIfNoMenu('PreviousUnseen'))
  Imports.subscribe('Action:Gamepad:RLeft', doIfNoMenu('PreviousImage'))
  Imports.subscribe('Action:Keypress:ArrowDown', doIfNoMenu('ShowMenu'))

  const changeTo = async (direction: NavigateTo): Promise<void> => {
    await Imports.changePicture(Imports.getPicture(direction))
  }

  Imports.subscribe('Action:Execute:Previous', async () => {
    const actualEvent = Imports.getShowUnreadOnly() ? 'PreviousUnseen' : 'PreviousImage'
    Imports.publish(`Action:Execute:${actualEvent}`)
    await Promise.resolve()
  })
  Imports.subscribe('Action:Execute:Next', async () => {
    const actualEvent = Imports.getShowUnreadOnly() ? 'NextUnseen' : 'NextImage'
    Imports.publish(`Action:Execute:${actualEvent}`)
    await Promise.resolve()
  })
  Imports.subscribe('Action:Execute:First', async () => {
    await changeTo(NavigateTo.First)
  })
  Imports.subscribe('Action:Execute:PreviousImage', async () => {
    await changeTo(NavigateTo.Previous)
  })
  Imports.subscribe('Action:Execute:PreviousUnseen', async () => {
    await changeTo(NavigateTo.PreviousUnread)
  })
  Imports.subscribe('Action:Execute:NextImage', async () => {
    await changeTo(NavigateTo.Next)
  })
  Imports.subscribe('Action:Execute:NextUnseen', async () => {
    await changeTo(NavigateTo.NextUnread)
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
  Imports.subscribe('Action:Gamepad:B', addBookmark)
  Imports.subscribe('Pictures:selectPage', async () => {
    Imports.loadCurrentPageImages()
    await Promise.resolve()
  })
}

export function initMouse(): void {
  const initialScale = hasValue(window.visualViewport) ? window.visualViewport.scale : UNINITIALIZED_SCALE
  Pictures.mainImage?.parentElement?.addEventListener('click', (evt) => {
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
