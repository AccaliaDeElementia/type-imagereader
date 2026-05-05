'use sanity'

import { Loading } from './loading.js'
import { Confirm } from './confirm.js'
import { Actions } from './actions.js'
import { Tabs } from './tabs.js'
import { Folders } from './folders.js'
import { Pictures } from './pictures/index.js'
import { Bookmarks } from './bookmarks.js'
import { Navigation } from './navigation.js'
import { WakeLock } from './wakelock.js'
import { PubSub } from './pubsub.js'

export function bootstrap(): void {
  Loading.Init()
  Confirm.Init()
  WakeLock.Init()
  Actions.Init()
  Tabs.Init()
  Folders.Init()
  Pictures.Init()
  Bookmarks.Init()
  Navigation.Init()
  PubSub.StartDeferred()
}
