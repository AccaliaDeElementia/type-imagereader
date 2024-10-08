'use sanity'

import { Loading } from './loading'
import { Actions } from './actions'
import { Tabs } from './tabs'
import { Folders } from './folders'
import { Pictures } from './pictures'
import { Bookmarks } from './bookmarks'
import { Navigation } from './navigation'
import { WakeLock } from './wakelock'
import { PubSub } from './pubsub'

Loading.Init()
WakeLock.Init()
Actions.Init()
Tabs.Init()
Folders.Init()
Pictures.Init()
Bookmarks.Init()
Navigation.Init()
PubSub.StartDeferred()
