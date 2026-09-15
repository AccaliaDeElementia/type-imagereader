'use sanity'

import { bindOptionGroup as _bindOptionGroup, selectOption as _selectOption } from './optionGroup.js'

export const Imports = {
  selectOption: _selectOption,
  bindOptionGroup: _bindOptionGroup,
}

const UNREAD_GROUP = '.selectUnreadAll'
const UNREAD_ONLY_OPTION = 'unread'
const ALL_OPTION = 'all'

export function getShowUnreadOnly(): boolean {
  return window.localStorage.ShowUnreadOnly === 'true'
}

function setShowUnreadOnly(value: boolean): void {
  window.localStorage.ShowUnreadOnly = `${value}`
}

function showActiveUnreadOption(): void {
  Imports.selectOption(UNREAD_GROUP, Internals.getShowUnreadOnly() ? UNREAD_ONLY_OPTION : ALL_OPTION)
}

export function initUnreadSelector(): void {
  Internals.showActiveUnreadOption()

  Imports.bindOptionGroup(UNREAD_GROUP, (value) => {
    Internals.setShowUnreadOnly(value === UNREAD_ONLY_OPTION)
    Internals.showActiveUnreadOption()
  })
}

export const Internals = {
  getShowUnreadOnly,
  setShowUnreadOnly,
  showActiveUnreadOption,
}
