'use sanity'

import { HasValues } from '#utils/helpers.js'
import { Navigation } from '../navigation.js'
import { NavigateTo, Pictures } from './index.js'
import { Publish, Subscribe } from '../pubsub.js'

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
    Pictures.LoadCurrentPageImages()
    await Promise.resolve()
  })
}
