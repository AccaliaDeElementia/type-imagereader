'use sanity'

import { HasValue, HasValues, ZERO_LENGTH } from '#utils/helpers.js'
import { Navigation } from '../navigation.js'
import { UNINITIALIZED_SCALE } from './state.js'
import { Pictures } from './index.js'
import { ChangePicture as _ChangePicture, GetPicture as _GetPicture, NavigateTo } from './viewer.js'
import { LoadCurrentPageImages as _LoadCurrentPageImages } from './grid.js'
import { GetShowUnreadOnly as _GetShowUnreadOnly } from './unreadFilter.js'
import { Publish, Subscribe } from '../pubsub.js'

export const Imports = {
  GetShowUnreadOnly: _GetShowUnreadOnly,
  LoadCurrentPageImages: _LoadCurrentPageImages,
  ChangePicture: _ChangePicture,
  GetPicture: _GetPicture,
}

const LEFT_THIRD = 0.3333333333333333
const RIGHT_THIRD = 0.6666666666666666

export function InitActions(): void {
  const doIfNoMenu = (action: string) => async () => {
    if (!Navigation.IsMenuActive()) {
      Publish(`Action:Execute:${action}`)
    } else if (HasValues(Pictures.pictures)) {
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
  Subscribe('Action:Gamepad:Left', doIfNoMenu('Previous'))
  Subscribe('Action:Gamepad:LLeft', doIfNoMenu('PreviousUnseen'))
  Subscribe('Action:Gamepad:RLeft', doIfNoMenu('PreviousImage'))
  Subscribe('Action:Keypress:ArrowDown', doIfNoMenu('ShowMenu'))

  const changeTo = async (direction: NavigateTo): Promise<void> => {
    await Imports.ChangePicture(Imports.GetPicture(direction))
  }

  Subscribe('Action:Execute:Previous', async () => {
    const actualEvent = Imports.GetShowUnreadOnly() ? 'PreviousUnseen' : 'PreviousImage'
    Publish(`Action:Execute:${actualEvent}`)
    await Promise.resolve()
  })
  Subscribe('Action:Execute:Next', async () => {
    const actualEvent = Imports.GetShowUnreadOnly() ? 'NextUnseen' : 'NextImage'
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
    if (Pictures.current !== null) {
      window.open(`/images/full${Pictures.current.path}`)
    }
    await Promise.resolve()
  })
  const addBookmark = async (): Promise<void> => {
    if (Pictures.current !== null) {
      Publish('Bookmarks:Add', Pictures.current.path)
    }
    await Promise.resolve()
  }
  Subscribe('Action:Execute:Bookmark', addBookmark)
  Subscribe('Action:Gamepad:B', addBookmark)
  Subscribe('Pictures:SelectPage', async () => {
    Imports.LoadCurrentPageImages()
    await Promise.resolve()
  })
}

export function InitMouse(): void {
  Pictures.initialScale = HasValue(window.visualViewport) ? window.visualViewport.scale : UNINITIALIZED_SCALE
  Pictures.mainImage?.parentElement?.addEventListener('click', (evt) => {
    if (HasValue(window.visualViewport) && Pictures.initialScale < window.visualViewport.scale) {
      Publish('Ignored Mouse Click', evt)
      return
    }
    const target = Pictures.mainImage?.parentElement?.getBoundingClientRect() ?? {
      left: ZERO_LENGTH,
      width: ZERO_LENGTH,
    }
    if (target.width === ZERO_LENGTH) {
      Publish('Ignored Mouse Click', evt)
      return
    }
    const x = evt.clientX - target.left
    if (x < target.width * LEFT_THIRD) {
      Publish('Action:Execute:Previous')
    } else if (x > target.width * RIGHT_THIRD) {
      Publish('Action:Execute:Next')
    } else {
      Publish('Action:Execute:ShowMenu')
    }
  })
}
