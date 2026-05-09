'use sanity'

import { init as _loadingInit } from './loading.js'
import { init as _confirmInit } from './confirm.js'
import { init as _actionsInit } from './actions.js'
import { init as _tabsInit } from './tabs.js'
import { init as _foldersInit } from './folders.js'
import { Pictures } from './pictures/state.js'
import { init as _bookmarksInit } from './bookmarks.js'
import { init as _navigationInit } from './navigation.js'
import { init as _wakeLockInit } from './wakelock.js'
import { startDeferred as _pubSubStartDeferred } from './pubsub.js'

export const Imports = {
  LoadingInit: _loadingInit,
  ConfirmInit: _confirmInit,
  TabsInit: _tabsInit,
  WakeLockInit: _wakeLockInit,
  FoldersInit: _foldersInit,
  BookmarksInit: _bookmarksInit,
  ActionsInit: _actionsInit,
  NavigationInit: _navigationInit,
  PicturesInit: Pictures.init,
  PubSubStartDeferred: _pubSubStartDeferred,
}

export function bootstrap(): void {
  Imports.LoadingInit()
  Imports.ConfirmInit()
  Imports.WakeLockInit()
  Imports.ActionsInit()
  Imports.TabsInit()
  Imports.FoldersInit()
  Imports.PicturesInit()
  Imports.BookmarksInit()
  Imports.NavigationInit()
  Imports.PubSubStartDeferred()
}
