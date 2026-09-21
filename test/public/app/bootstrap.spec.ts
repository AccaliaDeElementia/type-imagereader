'use sanity'

import { Imports, bootstrap } from '#public/scripts/app/bootstrap.js'
import type { MockInstance } from 'vitest'

describe('public/app/bootstrap', () => {
  let loadingInitSpy: MockInstance = vi.fn()
  let confirmInitSpy: MockInstance = vi.fn()
  let actionsInitSpy: MockInstance = vi.fn()
  let tabsInitSpy: MockInstance = vi.fn()
  let foldersInitSpy: MockInstance = vi.fn()
  let picturesInitSpy: MockInstance = vi.fn()
  let bookmarksInitSpy: MockInstance = vi.fn()
  let navigationInitSpy: MockInstance = vi.fn()
  let pubsubDeferredSpy: MockInstance = vi.fn()
  let wakeLockInitSpy: MockInstance = vi.fn()
  beforeEach(() => {
    loadingInitSpy = vi.spyOn(Imports, 'LoadingInit').mockReturnValue(undefined)
    confirmInitSpy = vi.spyOn(Imports, 'ConfirmInit').mockReturnValue(undefined)
    actionsInitSpy = vi.spyOn(Imports, 'ActionsInit').mockReturnValue(undefined)
    tabsInitSpy = vi.spyOn(Imports, 'TabsInit').mockReturnValue(undefined)
    foldersInitSpy = vi.spyOn(Imports, 'FoldersInit').mockReturnValue(undefined)
    picturesInitSpy = vi.spyOn(Imports, 'PicturesInit').mockReturnValue(undefined)
    bookmarksInitSpy = vi.spyOn(Imports, 'BookmarksInit').mockReturnValue(undefined)
    navigationInitSpy = vi.spyOn(Imports, 'NavigationInit').mockReturnValue(undefined)
    pubsubDeferredSpy = vi.spyOn(Imports, 'PubSubStartDeferred').mockReturnValue(undefined)
    wakeLockInitSpy = vi.spyOn(Imports, 'WakeLockInit').mockReturnValue(undefined)
    bootstrap()
  })
  it('should call Loading.init()', () => {
    expect(loadingInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call Confirm.init()', () => {
    expect(confirmInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call Actions.init()', () => {
    expect(actionsInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call Tabs.init()', () => {
    expect(tabsInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call Folders.init()', () => {
    expect(foldersInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call Pictures.init()', () => {
    expect(picturesInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call Bookmarks.init()', () => {
    expect(bookmarksInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call Navigation.init()', () => {
    expect(navigationInitSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call PubSub.startDeferred()', () => {
    expect(pubsubDeferredSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call WakeLock.init()', () => {
    expect(wakeLockInitSpy.mock.calls.length > 0).toBe(true)
  })
})
