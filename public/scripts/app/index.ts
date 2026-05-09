'use sanity'

import { Init as _LoadingInit } from './loading.js'
import { Init as _ConfirmInit } from './confirm.js'
import { Init as _ActionsInit } from './actions.js'
import { Init as _TabsInit } from './tabs.js'
import { Init as _FoldersInit } from './folders.js'
import { Pictures } from './pictures/index.js'
import { Init as _BookmarksInit } from './bookmarks.js'
import { Init as _NavigationInit } from './navigation.js'
import { Init as _WakeLockInit } from './wakelock.js'
import { StartDeferred as _PubSubStartDeferred } from './pubsub.js'

export const Imports = {
  LoadingInit: _LoadingInit,
  ConfirmInit: _ConfirmInit,
  TabsInit: _TabsInit,
  WakeLockInit: _WakeLockInit,
  FoldersInit: _FoldersInit,
  BookmarksInit: _BookmarksInit,
  ActionsInit: _ActionsInit,
  NavigationInit: _NavigationInit,
  PicturesInit: Pictures.Init,
  PubSubStartDeferred: _PubSubStartDeferred,
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
